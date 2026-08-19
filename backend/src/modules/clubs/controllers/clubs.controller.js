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

const VALID_STATUTS = ['Actif', 'Inactif', 'Suspendu'];

const PRESIDENT_INCLUDE = {
  president: {
    include: {
      etudiant: {
        include: {
          utilisateur: {
            select: { nom: true, prenom: true },
          },
        },
      },
    },
  },
};

/**
 * GET /api/clubs
 */
const getClubs = async (req, res) => {
  try {
    const { statut } = req.query;
    const where = {};

    if (statut) {
      if (!VALID_STATUTS.includes(statut)) {
        return res.status(400).json({
          success: false,
          message: `Statut invalide: "${statut}". Valeurs autorisées: ${VALID_STATUTS.join(', ')}.`,
        });
      }
      where.statut = statut;
    }

    const clubs = await prisma.club.findMany({
      where,
      include: PRESIDENT_INCLUDE,
      orderBy: { date_creation: 'desc' },
    });

    return res.status(200).json({
      success: true,
      count: clubs.length,
      data: clubs,
    });
  } catch (error) {
    console.error('[Clubs] Failed to fetch clubs:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération des clubs.',
    });
  }
};

/**
 * GET /api/clubs/:id
 */
const getClubById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: `L'identifiant fourni n'est pas un UUID valide.`,
      });
    }

    const club = await prisma.club.findUnique({
      where: { id_club: id },
      include: {
        ...PRESIDENT_INCLUDE,
        demandes: {
          orderBy: { date_demande: 'desc' },
          take: 10,
        },
      },
    });

    if (!club) {
      return res.status(404).json({
        success: false,
        message: `Aucun club trouvé avec l'id "${id}".`,
      });
    }

    return res.status(200).json({
      success: true,
      data: club,
    });
  } catch (error) {
    console.error('[Clubs] Failed to fetch club:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération du club.',
    });
  }
};

/**
 * POST /api/clubs
 */
const createClub = async (req, res) => {
  try {
    // NOUVEAU: On récupère id_etudiant depuis le body
    const { nom, description, budget, statut, id_etudiant } = req.body;

    if (!nom || typeof nom !== 'string' || !nom.trim()) {
      return res.status(400).json({ success: false, message: 'Le champ "nom" est requis.' });
    }
    if (budget === undefined || budget === null || budget === '') {
      return res.status(400).json({ success: false, message: 'Le champ "budget" est requis.' });
    }

    const budgetNum = Number(budget);
    if (Number.isNaN(budgetNum) || budgetNum < 0) {
      return res.status(400).json({ success: false, message: 'Le budget doit être positif ou nul.' });
    }
    if (statut && !VALID_STATUTS.includes(statut)) {
      return res.status(400).json({ success: false, message: 'Statut invalide.' });
    }
    if (id_etudiant && !UUID_REGEX.test(id_etudiant)) {
       return res.status(400).json({ success: false, message: 'L\'identifiant étudiant du président est invalide.' });
    }

    // Création du club
    const data = {
      nom: nom.trim(),
      description: description || null,
      statut: statut || 'Actif',
      budget: budgetNum.toString(),
    };

    // NOUVEAU: Si un président est fourni, on le crée en même temps que le club !
    if (id_etudiant) {
        data.president = {
            create: {
                id_etudiant: id_etudiant
            }
        };
    }

    const newClub = await prisma.club.create({
      data,
      include: PRESIDENT_INCLUDE,
    });

    return res.status(201).json({
      success: true,
      message: 'Club créé avec succès.',
      data: newClub,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: `Le nom du club doit être unique.`,
      });
    }
    console.error('[Clubs] Failed to create club:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la création.' });
  }
};

/**
 * PUT /api/clubs/:id
 */
const updateClub = async (req, res) => {
  try {
    const { id } = req.params;
    // NOUVEAU: On récupère id_etudiant
    const { nom, description, statut, budget, id_etudiant } = req.body;

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({ success: false, message: 'Identifiant invalide.' });
    }

    const existingClub = await prisma.club.findUnique({
      where: { id_club: id },
      include: { president: true }
    });

    if (!existingClub) {
      return res.status(404).json({ success: false, message: 'Club introuvable.' });
    }

    const updateData = {};

    if (nom !== undefined && nom.trim()) updateData.nom = nom.trim();
    if (description !== undefined) updateData.description = description || null;
    if (statut !== undefined && VALID_STATUTS.includes(statut)) updateData.statut = statut;
    if (budget !== undefined && budget !== null && budget !== '') {
      const budgetNum = Number(budget);
      if (!Number.isNaN(budgetNum) && budgetNum >= 0) {
        updateData.budget = budgetNum.toString();
      }
    }

    // NOUVEAU: Gestion du président
    if (id_etudiant !== undefined) {
      if (id_etudiant === "") {
         // L'utilisateur veut retirer le président actuel
         if (existingClub.president) {
             updateData.president = { delete: true };
         }
      } else if (UUID_REGEX.test(id_etudiant)) {
         // L'utilisateur veut définir ou changer le président
         if (existingClub.president) {
             // Modifier le président existant
             updateData.president = {
                 update: { id_etudiant: id_etudiant }
             };
         } else {
             // Créer un nouveau président pour ce club
             updateData.president = {
                 create: { id_etudiant: id_etudiant }
             };
         }
      } else {
         return res.status(400).json({ success: false, message: 'Identifiant étudiant invalide.' });
      }
    }

    const updatedClub = await prisma.club.update({
      where: { id_club: id },
      data: updateData,
      include: PRESIDENT_INCLUDE,
    });

    return res.status(200).json({
      success: true,
      message: 'Club mis à jour avec succès.',
      data: updatedClub,
    });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Club introuvable.' });
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: 'Le nom du club doit être unique.' });
    console.error('[Clubs] Failed to update club:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour.' });
  }
};

/**
 * DELETE /api/clubs/:id
 */
const deleteClub = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !UUID_REGEX.test(id)) return res.status(400).json({ success: false, message: 'Identifiant invalide.' });

    await prisma.club.delete({
      where: { id_club: id },
    });

    return res.status(200).json({ success: true, message: 'Club supprimé avec succès.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Club introuvable.' });
    if (error.code === 'P2003') return res.status(409).json({ success: false, message: 'Impossible de supprimer: des enregistrements sont liés.' });
    console.error('[Clubs] Failed to delete club:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la suppression.' });
  }
};

const getPresidents = async (req, res) => {
  try {
    const presidents = await prisma.president.findMany({
      include: {
        etudiant: {
          include: {
            utilisateur: { select: { nom: true, prenom: true } }
          }
        }
      }
    });
    return res.status(200).json({ success: true, data: presidents });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur lors de la récupération des présidents" });
  }
};


module.exports = {
  getClubs,
  getClubById,
  createClub,
  updateClub,
  deleteClub,
};