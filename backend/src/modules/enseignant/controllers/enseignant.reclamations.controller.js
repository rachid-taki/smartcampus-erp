require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.split('?')[0];
const pool = new Pool({ connectionString: cleanUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_STATUTS = ['Soumise', 'En_Cours', 'Resolue', 'Rejetee'];
const VALID_RESPONSE_STATUTS = ['Resolue', 'Rejetee'];

// Utilitaire pour récupérer l'ID de l'enseignant depuis le token
const getTeacherId = (req) => req.user?.id_utilisateur || req.user?.id;

/**
 * GET /api/enseignant/reclamations
 * Récupère UNIQUEMENT les réclamations de note liées aux cours de l'enseignant connecté.
 */
const getReclamations = async (req, res) => {
  try {
    const teacherId = getTeacherId(req);
    const { statut, idCours } = req.query;

    if (!teacherId) {
      return res.status(401).json({ success: false, message: "Non autorisé. Token invalide." });
    }

    // 1. Récupérer la liste des cours enseignés par ce professeur
    const teacherCourses = await prisma.coursProfesseur.findMany({
      where: { id_professeur: teacherId },
      select: { id_cours: true }
    });
    const courseIds = teacherCourses.map(c => c.id_cours);

    // Si le prof n'a aucun cours assigné, il n'a aucune réclamation
    if (courseIds.length === 0) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    // 2. Construire les filtres (Uniquement Note + Appartenance au professeur)
    const where = {
      type_reclamation: { is: { libelle: 'Note' } },
      OR: [
        { id_professeur: teacherId }, // Assigné directement au prof
        { id_cours: { in: courseIds } } // OU assigné à l'un de ses cours
      ]
    };

    if (statut && VALID_STATUTS.includes(statut)) {
      where.statut = statut;
    }

    if (idCours && UUID_REGEX.test(idCours)) {
      // Sécurité : Vérifier que le cours demandé appartient bien au professeur
      if (!courseIds.includes(idCours)) {
        return res.status(403).json({ success: false, message: "Vous n'enseignez pas ce cours." });
      }
      where.id_cours = idCours;
      delete where.OR; // On écrase le OR car on cible un cours précis
    }

    const reclamations = await prisma.reclamation.findMany({
      where,
      include: {
        etudiant: {
          include: { utilisateur: { select: { nom: true, prenom: true } } }
        },
        cours: true,
      },
      orderBy: { date_soumission: 'desc' },
    });

    // 3. Formater les données EXACTEMENT comme le Frontend les attend
    const formattedData = reclamations.map(r => ({
      idReclamation: r.id_reclamation,
      sujet: r.objet,
      description: r.description,
      dateSoumission: r.date_soumission,
      statut: r.statut,
      // IMPORTANT : `reponse` doit être ajouté à votre modèle Prisma
      reponse: r.reponse || null, 
      etudiant: {
        utilisateur: {
          nom: r.etudiant?.utilisateur?.nom || 'Inconnu',
          prenom: r.etudiant?.utilisateur?.prenom || 'Inconnu',
          CNE: r.etudiant?.cne || 'N/A'
        }
      },
      module: {
        nomModule: r.cours?.nom || 'Non spécifié'
      }
    }));

    return res.status(200).json({
      success: true,
      count: formattedData.length,
      data: formattedData,
    });
  } catch (error) {
    console.error('[Enseignant Réclamations] Erreur getReclamations:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération des réclamations.',
    });
  }
};

/**
 * PUT /api/enseignant/reclamations/:id/repondre
 * Permet au professeur de statuer sur une réclamation et d'y répondre.
 */
const repondreReclamation = async (req, res) => {
  try {
    const teacherId = getTeacherId(req);
    const { id } = req.params;
    const { statut, reponse } = req.body;

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({ success: false, message: `Format d'ID invalide.` });
    }
    if (!statut || !VALID_RESPONSE_STATUTS.includes(statut)) {
      return res.status(400).json({ success: false, message: `Statut invalide.` });
    }

    // 1. Récupérer la réclamation existante
    const existingReclamation = await prisma.reclamation.findUnique({
      where: { id_reclamation: id },
      include: { type_reclamation: true }
    });

    if (!existingReclamation || existingReclamation.type_reclamation?.libelle !== 'Note') {
      return res.status(404).json({ success: false, message: `Réclamation de note introuvable.` });
    }

    // 2. Sécurité : Vérifier que ce professeur a bien le droit de traiter cette réclamation
    const teacherCourses = await prisma.coursProfesseur.findMany({
      where: { id_professeur: teacherId },
      select: { id_cours: true }
    });
    const courseIds = teacherCourses.map(c => c.id_cours);

    if (existingReclamation.id_professeur !== teacherId && !courseIds.includes(existingReclamation.id_cours)) {
      return res.status(403).json({ success: false, message: "Vous n'êtes pas autorisé à traiter cette réclamation." });
    }

    // 3. Mettre à jour (NOTE: Le champ `reponse` DOIT exister dans schema.prisma)
    const updatedReclamation = await prisma.reclamation.update({
      where: { id_reclamation: id },
      data: { 
        statut,
        reponse // Assurez-vous d'avoir ajouté ce champ dans Prisma !
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Statut de la réclamation mis à jour avec succès.',
      data: updatedReclamation,
    });
  } catch (error) {
    console.error('[Enseignant Réclamations] Erreur repondreReclamation:', error);
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