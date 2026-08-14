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

// Inclusions basées strictement sur schema.prisma
const PRISMA_INCLUDE = {
  etudiant: {
    include: {
      utilisateur: {
        select: { nom: true, prenom: true }, // Pas de CNE ici, il est dans "etudiant"
      },
    },
  },
  session: {
    include: {
      cours: true,
    },
  },
};

/**
 * Traducteur : Base de données -> Frontend
 */
const formatForFrontend = (item) => {
  // Traduction des statuts
  let frontendStatut = 'En_Attente_Validation';
  if (item.statut === 'Excuse') frontendStatut = 'Justifiee';
  else if (item.statut === 'Absent') frontendStatut = 'Non_Justifiee';
  else if (item.statut === 'Present') frontendStatut = 'Signalee_Par_Erreur';

  return {
    ...item,
    id_absence: item.id_presence,
    statut: frontendStatut,
    date_heure: item.session?.date || item.heure_arrivee || new Date().toISOString(),
    session_salle: item.session,
    justificatif: null, // Ce champ n'existe pas en DB, on renvoie null
    remarques: null,    // Ce champ n'existe pas en DB, on renvoie null
    etudiant: {
      ...item.etudiant,
      utilisateur: {
        ...item.etudiant?.utilisateur,
        // On injecte le CNE ici pour que le frontend le trouve là où il l'attend !
        CNE: item.etudiant?.cne 
      }
    }
  };
};

/**
 * GET /api/enseignant/absences
 */
const getAbsences = async (req, res) => {
  try {
    // On ne récupère que les étudiants qui sont "Absent" ou "Excuse"
    const absences = await prisma.presenceEtudiant.findMany({
      where: {
        statut: {
          in: ['Absent', 'Excuse']
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

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: `L'identifiant fourni n'est pas valide.`,
      });
    }

    // Traducteur : Frontend -> Base de données
    let dbStatut = 'Absent';
    if (statut === 'Justifiee') dbStatut = 'Excuse';
    else if (statut === 'Non_Justifiee') dbStatut = 'Absent';
    else if (statut === 'Signalee_Par_Erreur') dbStatut = 'Present';

    const updatedAbsence = await prisma.presenceEtudiant.update({
      where: { id_presence: id },
      data: { statut: dbStatut }, // On ne sauvegarde pas "remarques" car absent de la DB
      include: PRISMA_INCLUDE,
    });

    return res.status(200).json({
      success: true,
      message: "Statut de l'absence mis à jour avec succès.",
      data: formatForFrontend(updatedAbsence),
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: "L'absence est introuvable.",
      });
    }

    console.error('[Enseignant Absences] Failed to update absence status:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la mise à jour du statut.',
    });
  }
};

module.exports = {
  getAbsences,
  updateAbsenceStatut,
};