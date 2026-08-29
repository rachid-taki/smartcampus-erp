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

// Utilitaire pour récupérer l'ID de l'enseignant depuis le token
const getTeacherId = (req) => req.user?.id_utilisateur || req.user?.id;

// Inclusions basées strictement sur schema.prisma (enrichies pour plus d'infos)
const PRISMA_INCLUDE = {
  etudiant: {
    include: {
      utilisateur: {
        select: { nom: true, prenom: true }, 
      },
    },
  },
  session: {
    include: {
      cours: true,
      filiere: true,
      salle: true
    },
  },
};

/**
 * Traducteur : Base de données -> Frontend
 */
const formatForFrontend = (item) => {
  let frontendStatut = 'En_Attente_Validation';
  if (item.statut === 'Excuse') frontendStatut = 'Justifiee';
  else if (item.statut === 'Absent') frontendStatut = 'Non_Justifiee';
  else if (item.statut === 'Present') frontendStatut = 'Signalee_Par_Erreur';

  return {
    ...item,
    id_absence: item.id_presence,
    statut: frontendStatut,
    date_heure: item.session?.date || item.heure_arrivee || new Date().toISOString(),
    session_salle: {
      ...item.session,
      // Mapping flexible selon que la BDD utilise "nom" ou "nom_cours"
      cours: item.session?.cours,
      filiere: item.session?.filiere,
      salle: item.session?.salle
    },
    justificatif: null, // Ce champ n'existe pas en DB, on renvoie null
    remarques: null,    // Ce champ n'existe pas en DB, on renvoie null
    etudiant: {
      ...item.etudiant,
      utilisateur: {
        ...item.etudiant?.utilisateur,
        CNE: item.etudiant?.cne 
      }
    }
  };
};

/**
 * GET /api/enseignant/absences
 * Récupère UNIQUEMENT les absences liées aux sessions de cet enseignant
 */
const getAbsences = async (req, res) => {
  try {
    const teacherId = getTeacherId(req);

    const absences = await prisma.presenceEtudiant.findMany({
      where: {
        statut: {
          in: ['Absent', 'Excuse']
        },
        // SÉCURITÉ : Ne cibler que les sessions de cet enseignant
        session: {
          id_professeur: teacherId
        }
      },
      include: PRISMA_INCLUDE,
      orderBy: { id_presence: 'desc' },
    });

    const formattedData = absences.map(formatForFrontend);

    return res.status(200).json({
      success: true,
      count: formattedData.length,
      data: formattedData,
    });
  } catch (error) {
    console.error('[Enseignant Absences] Failed to fetch absences:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération des absences.',
    });
  }
};

/**
 * PUT /api/enseignant/absences/:id/statut
 */
const updateAbsenceStatut = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;
    const teacherId = getTeacherId(req);

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({ success: false, message: `L'identifiant fourni n'est pas valide.` });
    }

    // Vérifier l'appartenance de l'absence à cet enseignant
    const existingAbsence = await prisma.presenceEtudiant.findUnique({
      where: { id_presence: id },
      include: { session: true }
    });

    if (!existingAbsence) {
      return res.status(404).json({ success: false, message: "L'absence est introuvable." });
    }
    if (existingAbsence.session?.id_professeur !== teacherId) {
      return res.status(403).json({ success: false, message: "Non autorisé à modifier cette absence." });
    }

    let dbStatut = 'Absent';
    if (statut === 'Justifiee') dbStatut = 'Excuse';
    else if (statut === 'Non_Justifiee') dbStatut = 'Absent';
    else if (statut === 'Signalee_Par_Erreur') dbStatut = 'Present';

    const updatedAbsence = await prisma.presenceEtudiant.update({
      where: { id_presence: id },
      data: { statut: dbStatut },
      include: PRISMA_INCLUDE,
    });

    return res.status(200).json({
      success: true,
      message: "Statut de l'absence mis à jour avec succès.",
      data: formatForFrontend(updatedAbsence),
    });
  } catch (error) {
    console.error('[Enseignant Absences] Failed to update absence status:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la mise à jour du statut.',
    });
  }
};

/**
 * DELETE /api/enseignant/absences/:id
 * Supprime (physiquement) l'absence de la base de données.
 */
const deleteAbsence = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = getTeacherId(req);

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({ success: false, message: `L'identifiant fourni n'est pas valide.` });
    }

    // Vérifier l'appartenance
    const existingAbsence = await prisma.presenceEtudiant.findUnique({
      where: { id_presence: id },
      include: { session: true }
    });

    if (!existingAbsence) {
      return res.status(404).json({ success: false, message: "L'absence est introuvable." });
    }
    if (existingAbsence.session?.id_professeur !== teacherId) {
      return res.status(403).json({ success: false, message: "Non autorisé à supprimer cette absence." });
    }

    await prisma.presenceEtudiant.delete({
      where: { id_presence: id }
    });

    return res.status(200).json({
      success: true,
      message: "L'absence a été supprimée avec succès."
    });
  } catch (error) {
    console.error('[Enseignant Absences] Failed to delete absence:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la suppression.',
    });
  }
};

module.exports = {
  getAbsences,
  updateAbsenceStatut,
  deleteAbsence,
};