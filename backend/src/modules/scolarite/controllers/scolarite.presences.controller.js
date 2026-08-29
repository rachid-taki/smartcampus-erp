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

const VALID_METHODES = ['RFID', 'QR_Code', 'Facial', 'Manuel'];
const VALID_STATUTS = ['Present', 'Absent', 'Retard', 'Justifie'];

/**
 * GET /api/presences
 */
const getPresences = async (req, res) => {
  try {
    const { session } = req.query;
    const where = {};

    if (session) {
      if (!UUID_REGEX.test(session)) {
        return res.status(400).json({ success: false, message: 'ID de session invalide.' });
      }
      where.id_session = session;
    }

    const presences = await prisma.presenceEtudiant.findMany({
      where,
      include: {
        etudiant: {
          include: {
            utilisateur: true // Récupère tout sans risque d'erreur !
          }
        }
      },
      orderBy: { heure_arrivee: 'asc' } // <-- CORRIGÉ ICI
    });

    // On adapte les données pour le Frontend qui attend "methode" et "heure_pointage"
    const formattedPresences = presences.map(p => ({
      ...p,
      methode: p.methode_identification,
      heure_pointage: p.heure_arrivee
    }));

    return res.status(200).json({ success: true, count: formattedPresences.length, data: formattedPresences });
  } catch (error) {
    console.error('[Presences] Fetch error:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des présences.' });
  }
};

/**
 * POST /api/presences
 */
const createPresence = async (req, res) => {
  try {
    const { id_session, id_etudiant, methode, statut } = req.body;

    if (!id_session || !UUID_REGEX.test(id_session)) return res.status(400).json({ success: false, message: 'ID session requis et valide.' });
    if (!id_etudiant || !UUID_REGEX.test(id_etudiant)) return res.status(400).json({ success: false, message: 'ID étudiant requis et valide.' });
    if (!methode || !VALID_METHODES.includes(methode)) return res.status(400).json({ success: false, message: 'Méthode de pointage invalide.' });
    
    const finalStatut = statut && VALID_STATUTS.includes(statut) ? statut : 'Present';

    const existing = await prisma.presenceEtudiant.findFirst({
      where: { id_session, id_etudiant }
    });

    if (existing) {
      return res.status(409).json({ success: false, message: 'L\'étudiant a déjà été pointé pour cette session.' });
    }

    const newPresence = await prisma.presenceEtudiant.create({
      data: {
        id_session,
        id_etudiant,
        methode_identification: methode, // <-- CORRIGÉ ICI
        statut: finalStatut,
        heure_arrivee: new Date() // <-- CORRIGÉ ICI
      },
      include: {
        etudiant: {
          include: { utilisateur: true }
        }
      }
    });

    // Adaptation pour le Frontend
    const formattedPresence = {
      ...newPresence,
      methode: newPresence.methode_identification,
      heure_pointage: newPresence.heure_arrivee
    };

    return res.status(201).json({ success: true, message: 'Pointage enregistré.', data: formattedPresence });
  } catch (error) {
    if (error.code === 'P2003') return res.status(404).json({ success: false, message: 'Session ou Étudiant introuvable.' });
    console.error('[Presences] Create error:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement du pointage.' });
  }
};

/**
 * PUT /api/presences/:id/statut
 */
const updatePresenceStatut = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    if (!id || !UUID_REGEX.test(id)) return res.status(400).json({ success: false, message: 'ID invalide.' });
    if (!statut || !VALID_STATUTS.includes(statut)) return res.status(400).json({ success: false, message: 'Statut invalide.' });

    const updated = await prisma.presenceEtudiant.update({
      where: { id_presence: id },
      data: { statut }
    });

    const formattedUpdated = {
      ...updated,
      methode: updated.methode_identification,
      heure_pointage: updated.heure_arrivee
    };

    return res.status(200).json({ success: true, message: 'Statut mis à jour.', data: formattedUpdated });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Présence introuvable.' });
    console.error('[Presences] Update error:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour.' });
  }
};

module.exports = {
  getPresences,
  createPresence,
  updatePresenceStatut
};