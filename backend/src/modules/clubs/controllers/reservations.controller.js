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

const VALID_SALLE_TYPES = ['Amphitheatre', 'Salle_Cours', 'Laboratoire', 'Salle_Reunion'];
const VALID_SALLE_STATUTS = ['Disponible', 'Occupee', 'Maintenance'];
const VALID_RESERVATION_STATUTS = ['Demandee', 'Approuvee', 'Rejetee', 'Annulee'];

// Shared include shape for reservation listings/detail responses.
const RESERVATION_INCLUDE = {
  salle: {
    select: { numero: true, nom: true, capacite: true },
  },
  demandeur: {
    select: { nom: true, prenom: true, email: true },
  },
};

/**
 * Safely parse a "YYYY-MM-DD" date string into a Date object.
 *
 * @param {string} value
 * @returns {Date|null}
 */
const parseDateOnly = (value) => {
  if (!value || typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Safely parse a time string ("HH:mm" or "HH:mm:ss") into a valid
 * DateTime for a Prisma `@db.Time` field. Postgres TIME columns are
 * represented by Prisma as DateTime values anchored to an arbitrary
 * base date — only the time-of-day portion is actually persisted.
 *
 * @param {string} value
 * @returns {Date|null}
 */
const parseTimeOnly = (value) => {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim();
  const timeMatch = trimmed.match(/^(\d{2}):(\d{2})(:(\d{2}))?$/);

  if (timeMatch) {
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    const seconds = timeMatch[4] ? Number(timeMatch[4]) : 0;

    if (hours > 23 || minutes > 59 || seconds > 59) return null;

    // Anchor to a fixed arbitrary UTC date — only time-of-day matters
    // for a @db.Time column; the date portion is ignored by Postgres.
    const anchored = new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds));
    return Number.isNaN(anchored.getTime()) ? null : anchored;
  }

  // Fallback: already a full ISO datetime string
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * GET /api/salles
 *
 * Fetch all rooms, with optional filtering by type and/or statut.
 *
 * Query params (optional):
 *   - type   (Amphitheatre | Salle_Cours | Laboratoire | Salle_Reunion)
 *   - statut (Disponible | Occupee | Maintenance)
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getSalles = async (req, res) => {
  try {
    const { type, statut } = req.query;

    const where = {};

    if (type) {
      if (!VALID_SALLE_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Type invalide: "${type}". Valeurs autorisées: ${VALID_SALLE_TYPES.join(', ')}.`,
        });
      }
      where.type = type;
    }

    if (statut) {
      if (!VALID_SALLE_STATUTS.includes(statut)) {
        return res.status(400).json({
          success: false,
          message: `Statut invalide: "${statut}". Valeurs autorisées: ${VALID_SALLE_STATUTS.join(', ')}.`,
        });
      }
      where.statut = statut;
    }

    const salles = await prisma.salle.findMany({
      where,
      orderBy: { numero: 'asc' },
    });

    return res.status(200).json({
      success: true,
      count: salles.length,
      data: salles,
    });
  } catch (error) {
    console.error('[Réservations] Failed to fetch salles:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération des salles.',
    });
  }
};

/**
 * GET /api/reservations
 *
 * Fetch all room reservations, including the room's basic info and the
 * requester's identity, ordered by date descending.
 *
 * Query params (optional):
 *   - statut (Demandee | Approuvee | Rejetee | Annulee)
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getReservations = async (req, res) => {
  try {
    const { statut } = req.query;

    const where = {};

    if (statut) {
      if (!VALID_RESERVATION_STATUTS.includes(statut)) {
        return res.status(400).json({
          success: false,
          message: `Statut invalide: "${statut}". Valeurs autorisées: ${VALID_RESERVATION_STATUTS.join(', ')}.`,
        });
      }
      where.statut = statut;
    }

    const reservations = await prisma.reservationSalle.findMany({
      where,
      include: RESERVATION_INCLUDE,
      orderBy: { date: 'desc' },
    });

    return res.status(200).json({
      success: true,
      count: reservations.length,
      data: reservations,
    });
  } catch (error) {
    console.error('[Réservations] Failed to fetch reservations:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération des réservations.',
    });
  }
};

/**
 * POST /api/reservations
 *
 * Create a new room reservation request. Status defaults to 'Demandee'.
 *
 * Body:
 *   - id_salle     (required) UUID of the room being requested
 *   - id_demandeur (required) UUID of the requesting user
 *   - date         (required) "YYYY-MM-DD"
 *   - heure_debut  (required) "HH:mm" or "HH:mm:ss"
 *   - heure_fin    (required) "HH:mm" or "HH:mm:ss"
 *   - motif        (required) reason for the reservation
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const createReservation = async (req, res) => {
  try {
    const { id_salle, id_demandeur, date, heure_debut, heure_fin, motif } = req.body;

    // --- Validation ---

    if (!id_salle || !UUID_REGEX.test(id_salle)) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "id_salle" est requis et doit être un UUID valide.',
      });
    }

    if (!id_demandeur || !UUID_REGEX.test(id_demandeur)) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "id_demandeur" est requis et doit être un UUID valide.',
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "date" est requis.',
      });
    }

    const parsedDate = parseDateOnly(date);
    if (!parsedDate) {
      return res.status(400).json({
        success: false,
        message: `"date" n'est pas une date valide: "${date}".`,
      });
    }

    if (!heure_debut) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "heure_debut" est requis.',
      });
    }

    const parsedHeureDebut = parseTimeOnly(heure_debut);
    if (!parsedHeureDebut) {
      return res.status(400).json({
        success: false,
        message: `"heure_debut" n'est pas une heure valide: "${heure_debut}". Format attendu: "HH:mm".`,
      });
    }

    if (!heure_fin) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "heure_fin" est requis.',
      });
    }

    const parsedHeureFin = parseTimeOnly(heure_fin);
    if (!parsedHeureFin) {
      return res.status(400).json({
        success: false,
        message: `"heure_fin" n'est pas une heure valide: "${heure_fin}". Format attendu: "HH:mm".`,
      });
    }

    // Since both times are anchored to the same base date, a direct
    // comparison correctly validates chronological order.
    if (parsedHeureFin <= parsedHeureDebut) {
      return res.status(400).json({
        success: false,
        message: '"heure_fin" doit être postérieure à "heure_debut".',
      });
    }

    if (!motif || typeof motif !== 'string' || !motif.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "motif" est requis.',
      });
    }

    // --- Verify the room exists before creating the reservation ---
    const salle = await prisma.salle.findUnique({
      where: { id_salle },
    });

    if (!salle) {
      return res.status(404).json({
        success: false,
        message: `Aucune salle trouvée avec l'id "${id_salle}".`,
      });
    }

    const newReservation = await prisma.reservationSalle.create({
      data: {
        id_salle,
        id_demandeur,
        date: parsedDate,
        heure_debut: parsedHeureDebut,
        heure_fin: parsedHeureFin,
        motif: motif.trim(),
        statut: 'Demandee',
      },
      include: RESERVATION_INCLUDE,
    });

    return res.status(201).json({
      success: true,
      message: 'Réservation créée avec succès.',
      data: newReservation,
    });
  } catch (error) {
    // Prisma P2003 = foreign key constraint violation (invalid id_salle
    // or id_demandeur that slipped past the findUnique check)
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Référence invalide: vérifiez "id_salle" et "id_demandeur".',
      });
    }

    console.error('[Réservations] Failed to create reservation:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la création de la réservation.',
    });
  }
};

/**
 * PUT /api/reservations/:id/statut
 *
 * Update the status of a reservation (e.g. approve or reject a request).
 *
 * URL params:
 *   - id: id_reservation (UUID)
 *
 * Body:
 *   - statut (required) one of Demandee | Approuvee | Rejetee | Annulee
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const updateReservationStatut = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

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

    if (!VALID_RESERVATION_STATUTS.includes(statut)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide: "${statut}". Valeurs autorisées: ${VALID_RESERVATION_STATUTS.join(', ')}.`,
      });
    }

    const existingReservation = await prisma.reservationSalle.findUnique({
      where: { id_reservation: id },
    });

    if (!existingReservation) {
      return res.status(404).json({
        success: false,
        message: `Aucune réservation trouvée avec l'id "${id}".`,
      });
    }

    const updatedReservation = await prisma.reservationSalle.update({
      where: { id_reservation: id },
      data: { statut },
      include: RESERVATION_INCLUDE,
    });

    return res.status(200).json({
      success: true,
      message: 'Statut de la réservation mis à jour avec succès.',
      data: updatedReservation,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'La réservation est introuvable ou a déjà été supprimée.',
      });
    }

    console.error('[Réservations] Failed to update reservation status:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la mise à jour du statut.',
    });
  }
};

/**
 * GET /api/utilisateurs
 */
const getUtilisateurs = async (req, res) => {
  try {
    const { role } = req.query;
    
    // On cherche uniquement les utilisateurs actifs
    const where = { actif: true };

    if (role) {
      // Mapping intelligent pour gérer les différences de nommage dans votre BDD
      if (role === 'PROFESSEUR') {
        where.role = { 
          nom_role: { in: ['PROFESSEUR', 'PROFESSOR', 'Professeur', 'professor'] } 
        };
      } else if (role === 'SCOLARITE') {
        where.role = { 
          nom_role: { in: ['SCOLARITE', 'Scolarité', 'ADMIN', 'SCOLARITE_STAFF'] } 
        };
      } else if (role === 'RH') {
        where.role = { 
          nom_role: { in: ['RH', 'HR', 'Ressources Humaines'] } 
        };
      } else {
        // Pour ETUDIANT ou autre : recherche qui ignore les majuscules/minuscules
        where.role = { 
          nom_role: { contains: role, mode: 'insensitive' } 
        };
      }
    }

    const utilisateurs = await prisma.utilisateur.findMany({
      where,
      select: {
        id_utilisateur: true,
        nom: true,
        prenom: true,
        email: true,
        role: {
          select: { nom_role: true }
        }
      },
      orderBy: [
        { nom: 'asc' },
        { prenom: 'asc' }
      ]
    });

    // 💡 LOG UTILE : Affichera dans le terminal backend ce qu'il a trouvé
    console.log(`[Recherche Utilisateurs] Rôle demandé: "${role}" -> ${utilisateurs.length} trouvés.`);

    return res.status(200).json({
      success: true,
      count: utilisateurs.length,
      data: utilisateurs,
    });
  } catch (error) {
    console.error('[Utilisateurs] Failed to fetch users:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs.',
    });
  }
};

module.exports = {
  getSalles,
  getReservations,
  createReservation,
  updateReservationStatut,
  getUtilisateurs,
};