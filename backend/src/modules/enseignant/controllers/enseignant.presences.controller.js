require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.split('?')[0];
const pool = new Pool({ connectionString: cleanUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Utility to get the teacher's ID from the auth token
const getTeacherId = (req) => req.user?.id_utilisateur || req.user?.id;

/**
 * GET /api/enseignant/presences/sessions/:id_session/etudiants
 * Fetches the list of students for a given session and their current attendance status.
 */
const getSessionStudents = async (req, res) => {
  try {
    const teacherId = getTeacherId(req);
    const { id_session } = req.params;

    // 1. Verify session exists and belongs to the teacher
    const session = await prisma.sessionSalle.findUnique({
      where: { id_session },
      include: { filiere: true, cours: true }
    });

    if (!session) {
      return res.status(404).json({ success: false, message: "Séance introuvable." });
    }
    if (session.id_professeur !== teacherId) {
      return res.status(403).json({ success: false, message: "Accès refusé. Cette séance ne vous est pas assignée." });
    }
    if (!session.id_filiere) {
      return res.status(400).json({ success: false, message: "Aucune filière n'est associée à cette séance. L'appel automatique est impossible." });
    }

    // 2. Fetch all active students in this Filière
    const etudiants = await prisma.etudiant.findMany({
      where: { 
        id_filiere: session.id_filiere,
        statut: 'Actif' 
      },
      include: {
        utilisateur: {
          select: { nom: true, prenom: true, email: true }
        }
      },
      orderBy: [
        { utilisateur: { nom: 'asc' } },
        { utilisateur: { prenom: 'asc' } }
      ]
    });

    // 3. Fetch existing attendance records (if the teacher already started taking attendance)
    const existingPresences = await prisma.presenceEtudiant.findMany({
      where: { id_session }
    });

    // 4. Map students with their presence status
    const data = etudiants.map(etu => {
      const presence = existingPresences.find(p => p.id_etudiant === etu.id_etudiant);
      return {
        id_etudiant: etu.id_etudiant,
        cne: etu.cne,
        nom: etu.utilisateur?.nom || 'Inconnu',
        prenom: etu.utilisateur?.prenom || 'Inconnu',
        email: etu.utilisateur?.email || '',
        statut_presence: presence ? presence.statut : 'Non_Saisi' // Can be 'Non_Saisi', 'Present', 'Absent', etc.
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        session: {
          cours: session.cours?.nom,
          filiere: session.filiere?.nom || session.filiere?.nom_filiere,
          date: session.date,
          heure_debut: session.heure_debut,
        },
        etudiants: data
      }
    });

  } catch (error) {
    console.error("[Enseignant Presences] Erreur getSessionStudents:", error);
    return res.status(500).json({ success: false, message: "Erreur lors de la récupération de la liste des étudiants." });
  }
};

/**
 * POST /api/enseignant/presences/sessions/:id_session/valider
 * Submits the absence list. Selected students are marked 'Absent', all others 'Present'.
 */
const validateAttendance = async (req, res) => {
  try {
    const teacherId = getTeacherId(req);
    const { id_session } = req.params;
    const { absents } = req.body; // Array of id_etudiant strings

    if (!Array.isArray(absents)) {
      return res.status(400).json({ success: false, message: "Format invalide. 'absents' doit être un tableau d'identifiants." });
    }

    // 1. Verify session ownership
    const session = await prisma.sessionSalle.findUnique({
      where: { id_session }
    });

    if (!session || session.id_professeur !== teacherId) {
      return res.status(403).json({ success: false, message: "Accès refusé ou séance introuvable." });
    }

    // 2. Fetch all active students in the session's Filière
    const etudiants = await prisma.etudiant.findMany({
      where: { id_filiere: session.id_filiere, statut: 'Actif' },
      select: { id_etudiant: true }
    });

    const currentTime = new Date();

    // 3. Prepare the bulk data: 'Absent' for IDs in the payload, 'Present' for the rest
    const presencesToInsert = etudiants.map(etu => {
      const isAbsent = absents.includes(etu.id_etudiant);
      return {
        id_session: id_session,
        id_etudiant: etu.id_etudiant,
        statut: isAbsent ? 'Absent' : 'Present',
        heure_arrivee: isAbsent ? null : currentTime,
        methode_identification: null
      };
    });

    // 4. Execute transaction safely: Clear old attendance for this session, insert the new validated list, update session status
    await prisma.$transaction([
      prisma.presenceEtudiant.deleteMany({
        where: { id_session }
      }),
      prisma.presenceEtudiant.createMany({
        data: presencesToInsert,
        skipDuplicates: true
      }),
      prisma.sessionSalle.update({
        where: { id_session },
        data: { statut: 'Terminee' } // Automatically marks the session as finished after roll call
      })
    ]);

    return res.status(200).json({
      success: true,
      message: `Appel validé. ${absents.length} étudiant(s) marqué(s) absent(s) sur ${etudiants.length} inscrits.`,
    });

  } catch (error) {
    console.error("[Enseignant Presences] Erreur validateAttendance:", error);
    return res.status(500).json({ success: false, message: "Erreur lors de l'enregistrement de l'appel." });
  }
};

module.exports = {
  getSessionStudents,
  validateAttendance
};