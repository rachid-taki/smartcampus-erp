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

const VALID_STATUTS = ['Soumise', 'En_Cours', 'Resolue', 'Rejetee'];
const VALID_RESPONSE_STATUTS = ['Resolue', 'Rejetee'];

/**
 * GET /api/enseignant/reclamations
 */
const getReclamations = async (req, res) => {
  try {
    const { statut, idCours } = req.query;

    const where = {
      // CORRECTION : utilisation de "libelle" au lieu de "type"
      type_reclamation: {
        is: {
          libelle: 'Note', // Si votre base utilise "code", remplacez par -> code: 'NOTE'
        }
      },
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

    if (idCours) {
      if (!UUID_REGEX.test(idCours)) {
        return res.status(400).json({
          success: false,
          message: `L'identifiant de cours fourni n'est pas valide.`,
        });
      }
      where.id_cours = idCours;
    }

    const reclamations = await prisma.reclamation.findMany({
      where,
      include: {
        etudiant: {
          include: {
            utilisateur: {
              select: { nom: true, prenom: true },
            },
          },
        },
        cours: true,
      },
      orderBy: { date_soumission: 'desc' },
    });

    return res.status(200).json({
      success: true,
      count: reclamations.length,
      data: reclamations,
    });
  } catch (error) {
    console.error('[Enseignant Réclamations] Failed to fetch grade complaints:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération des réclamations.',
    });
  }
};

/**
 * PUT /api/enseignant/reclamations/:id/repondre
 */
const repondreReclamation = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, idEnseignant } = req.body;

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

    if (!VALID_RESPONSE_STATUTS.includes(statut)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide. Le statut doit être l'un des suivants: ${VALID_RESPONSE_STATUTS.join(', ')}.`,
      });
    }

    if (idEnseignant !== undefined && idEnseignant !== null && !UUID_REGEX.test(idEnseignant)) {
      return res.status(400).json({
        success: false,
        message: `L'identifiant d'enseignant fourni n'est pas valide.`,
      });
    }

    const existingReclamation = await prisma.reclamation.findUnique({
      where: { id_reclamation: id },
      include: { type_reclamation: true }
    });

    // CORRECTION : On vérifie le libelle ici aussi
    if (!existingReclamation || existingReclamation.type_reclamation?.libelle !== 'Note') {
      return res.status(404).json({
        success: false,
        message: `Aucune réclamation de note trouvée avec l'id "${id}".`,
      });
    }

    const teacherId = (req.user && req.user.idEnseignant) || idEnseignant || null;

    const updateData = { statut };

    if (teacherId) {
      updateData.id_traite_par = teacherId;
    }

    const updatedReclamation = await prisma.reclamation.update({
      where: { id_reclamation: id },
      data: updateData,
      include: {
        etudiant: {
          include: {
            utilisateur: {
              select: { nom: true, prenom: true },
            },
          },
        },
        cours: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Statut de la réclamation mis à jour avec succès.',
      data: updatedReclamation,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'La réclamation est introuvable ou a déjà été supprimée.',
      });
    }

    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Référence invalide: vérifiez que "idEnseignant" correspond à un enseignant existant.',
      });
    }

    console.error('[Enseignant Réclamations] Failed to respond to grade complaint:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de l\'enregistrement de la réponse.',
    });
  }
};

module.exports = {
  getReclamations,
  repondreReclamation,
};