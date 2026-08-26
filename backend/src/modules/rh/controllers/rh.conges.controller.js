require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.split('?')[0];
const pool = new Pool({ connectionString: cleanUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Only these three types belong to "Gestion des Congés" — enum_type_demande_rh
// also contains other non-leave types we deliberately exclude here.
const CONGE_TYPES = ['Conge_Normal', 'Conge_Exceptionnel', 'Conge_Maladie'];

const VALID_STATUTS = ['Soumise', 'En_Traitement', 'Validee', 'Rejetee'];

/**
 * Calculate the number of calendar days between two dates, inclusive
 * of both the start and end date (e.g. Mon -> Tue = 2 days).
 *
 * @param {Date} dateDebut
 * @param {Date} dateFin
 * @returns {number}
 */
const calculateDuree = (dateDebut, dateFin) => {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const diff = Math.round((dateFin.getTime() - dateDebut.getTime()) / MS_PER_DAY);
  return diff + 1;
};

/**
 * GET /api/rh/conges
 *
 * Fetch all leave requests (type in Conge_Normal, Conge_Exceptionnel,
 * Conge_Maladie), including the requesting employee's utilisateur
 * details (nom, prenom) so the frontend can display who submitted it.
 *
 * Query params (optional):
 *   - statut (filter by status)
 *   - type   (filter by a specific leave type, still constrained to
 *             the 3 leave types above)
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getConges = async (req, res) => {
  try {
    const { statut, type } = req.query;

    const where = {
      type: { in: CONGE_TYPES },
    };

    if (statut) {
      if (!VALID_STATUTS.includes(statut)) {
        return res.status(400).json({
          success: false,
          message: `Statut invalide: "${statut}". Valeurs autorisées: ${VALID_STATUTS.join(', ')}.`,
        });
      }
      where.statut = statut;
    }

    if (type) {
      if (!CONGE_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Type de congé invalide: "${type}". Valeurs autorisées: ${CONGE_TYPES.join(', ')}.`,
        });
      }
      where.type = type;
    }

    const conges = await prisma.demandeRh.findMany({
      where,
      include: {
        employe: {
          include: {
            utilisateur: {
              select: {
                id_utilisateur: true,
                nom: true,
                prenom: true,
                email: true,
              },
            },
          },
        },
        traite_par: {
            include: {
              employe: {
                include: {
                  utilisateur: {
                    select: {
                      id_utilisateur: true,
                      nom: true,
                      prenom: true
                    }
                  }
                }
              }
            }
          },
      },
      orderBy: { date_demande: 'desc' },
    });

    return res.status(200).json({
      success: true,
      count: conges.length,
      data: conges,
    });
  } catch (error) {
    console.error('[RH Congés] Failed to fetch leave requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération des demandes de congé.',
    });
  }
};

/**
 * POST /api/rh/conges
 *
 * Create a new leave request (simulating an employee submitting one).
 * Status defaults to 'Soumise'. `duree` is auto-calculated from
 * date_debut/date_fin (inclusive) unless explicitly provided in the body.
 *
 * Body:
 *   - id_employe  (required) UUID of the requesting employee
 *   - type        (required) one of Conge_Normal | Conge_Exceptionnel | Conge_Maladie
 *   - date_debut  (required) ISO date string
 *   - date_fin    (required) ISO date string
 *   - motif       (required) reason for the leave request
 *   - duree       (optional) number of days — auto-calculated if omitted
 *   - justificatif (optional) supporting document reference/URL
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const createConge = async (req, res) => {
  try {
    const { id_employe, type, date_debut, date_fin, motif, duree, justificatif } = req.body;

    // --- Validation ---

    if (!id_employe || !UUID_REGEX.test(id_employe)) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "id_employe" est requis et doit être un UUID valide.',
      });
    }

    if (!type || !CONGE_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Le champ "type" est requis et doit être l'un des suivants: ${CONGE_TYPES.join(', ')}.`,
      });
    }

    if (!date_debut || !date_fin) {
      return res.status(400).json({
        success: false,
        message: 'Les champs "date_debut" et "date_fin" sont requis.',
      });
    }

    const parsedDebut = new Date(date_debut);
    const parsedFin = new Date(date_fin);

    if (Number.isNaN(parsedDebut.getTime()) || Number.isNaN(parsedFin.getTime())) {
      return res.status(400).json({
        success: false,
        message: '"date_debut" ou "date_fin" n\'est pas une date valide.',
      });
    }

    if (parsedFin < parsedDebut) {
      return res.status(400).json({
        success: false,
        message: '"date_fin" ne peut pas être antérieure à "date_debut".',
      });
    }

    if (!motif || typeof motif !== 'string' || !motif.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "motif" est requis.',
      });
    }

    // --- Verify the employee exists before creating the request ---
    const employe = await prisma.employe.findUnique({
      where: { id_employe },
    });

    if (!employe) {
      return res.status(404).json({
        success: false,
        message: `Aucun employé trouvé avec l'id "${id_employe}".`,
      });
    }

    // --- Compute duree (use provided value if valid, else auto-calculate) ---
    let finalDuree;
    if (duree !== undefined && duree !== null && !Number.isNaN(Number(duree))) {
      finalDuree = Number(duree);
    } else {
      finalDuree = calculateDuree(parsedDebut, parsedFin);
    }

    const newConge = await prisma.demandeRh.create({
      data: {
        id_employe,
        type,
        statut: 'Soumise',
        date_demande: new Date(),
        date_debut: parsedDebut,
        date_fin: parsedFin,
        duree: finalDuree,
        motif: motif.trim(),
        justificatif: justificatif || null,
      },
      include: {
        employe: {
          include: {
            utilisateur: {
              select: {
                id_utilisateur: true,
                nom: true,
                prenom: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Demande de congé créée avec succès.',
      data: newConge,
    });
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Référence invalide: vérifiez que "id_employe" correspond à un employé existant.',
      });
    }

    console.error('[RH Congés] Failed to create leave request:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la création de la demande de congé.',
    });
  }
};

/**
 * PUT /api/rh/conges/:id/statut
 *
 * Update the status of a leave request (HR validation/rejection).
 * Also records optional HR comments and, when available, the HR staff
 * member who processed the request.
 *
 * URL params:
 *   - id: id_demande_rh (UUID)
 *
 * Body:
 *   - statut           (required) one of Soumise | En_Traitement | Validee | Rejetee
 *   - commentaires_rh   (optional) HR notes/remarks
 *   - id_traite_par     (optional) id of the HR staff member handling it —
 *                        ideally sourced from req.user once auth exists
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const updateCongeStatut = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, commentaires_rh, id_traite_par } = req.body;

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: `L'identifiant fourni ("${id}") n'est pas un UUID valide.`,
      });
    }

    if (!statut) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "statut" est requis.',
      });
    }

    if (!VALID_STATUTS.includes(statut)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide: "${statut}". Valeurs autorisées: ${VALID_STATUTS.join(', ')}.`,
      });
    }

    // --- Verify the leave request exists and is actually a "congé" type ---
    const existingConge = await prisma.demandeRh.findUnique({
      where: { id_demande_rh: id },
    });

    if (!existingConge || !CONGE_TYPES.includes(existingConge.type)) {
      return res.status(404).json({
        success: false,
        message: `Aucune demande de congé trouvée avec l'id "${id}".`,
      });
    }

    // Prefer the authenticated session's staff id once auth middleware
    // exists; fall back to an explicit body value in the meantime.
    const staffId = (req.user && req.user.id_rh_staff) || id_traite_par || null;

    const updateData = { statut };

    if (commentaires_rh !== undefined) {
      updateData.commentaires_rh = commentaires_rh;
    }

    if (staffId) {
      updateData.id_traite_par = staffId;
    }

    const updatedConge = await prisma.demandeRh.update({
      where: { id_demande_rh: id },
      data: updateData,
      include: {
        employe: {
          include: {
            utilisateur: {
              select: {
                id_utilisateur: true,
                nom: true,
                prenom: true,
                email: true,
              },
            },
          },
        },
        traite_par: {
            include: {
              employe: {
                include: {
                  utilisateur: {
                    select: {
                      id_utilisateur: true,
                      nom: true,
                      prenom: true
                    }
                  }
                }
              }
            }
          },
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Statut de la demande de congé mis à jour avec succès.',
      data: updatedConge,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'La demande de congé est introuvable ou a déjà été supprimée.',
      });
    }

    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Référence invalide: vérifiez la valeur de "id_traite_par".',
      });
    }

    console.error('[RH Congés] Failed to update leave request status:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la mise à jour du statut.',
    });
  }
};

module.exports = {
  getConges,
  createConge,
  updateCongeStatut,
};