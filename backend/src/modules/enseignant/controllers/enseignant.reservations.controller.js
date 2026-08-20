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

const VALID_RESERVATION_STATUTS = ['Demandee', 'Approuvee', 'Rejetee', 'Annulee'];
// Statuts still eligible for cancellation by the requesting teacher.
const CANCELLABLE_STATUTS = ['Demandee', 'Approuvee'];

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
 * Build the UTC day-range [startOfDay, endOfDay) for a given parsed
 * date, used to match a `@db.Date` column regardless of any residual
 * time component in storage.
 *
 * @param {Date} parsedDate
 * @returns {{ gte: Date, lt: Date }}
 */
const buildDayRange = (parsedDate) => {
  const start = new Date(
    Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate())
  );
  const end = new Date(
    Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate() + 1)
  );
  return { gte: start, lt: end };
};

/**
 * GET /api/enseignant/salles/disponibles
 *
 * Fetch rooms available for a given date + time slot. Returns all
 * active ("Disponible") rooms, excluding any room that already has an
 * overlapping approved ReservationSalle or an overlapping SessionSalle
 * on that date. If the SessionSalle model isn't present on this Prisma
 * client (e.g. schema not yet migrated), that check is silently
 * skipped and only the ReservationSalle overlap is applied.
 *
 * Query params:
 *   - date          (required) "YYYY-MM-DD"
 *   - heure_debut   (required) "HH:mm"
 *   - heure_fin     (required) "HH:mm"
 *   - capacite_min  (optional) minimum room capacity
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getSallesDisponibles = async (req, res) => {
  try {
    const { date, heure_debut, heure_fin, capacite_min } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Le paramètre "date" est requis.',
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
        message: 'Le paramètre "heure_debut" est requis.',
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
        message: 'Le paramètre "heure_fin" est requis.',
      });
    }

    const parsedHeureFin = parseTimeOnly(heure_fin);
    if (!parsedHeureFin) {
      return res.status(400).json({
        success: false,
        message: `"heure_fin" n'est pas une heure valide: "${heure_fin}". Format attendu: "HH:mm".`,
      });
    }

    if (parsedHeureFin <= parsedHeureDebut) {
      return res.status(400).json({
        success: false,
        message: '"heure_fin" doit être postérieure à "heure_debut".',
      });
    }

    let parsedCapaciteMin;
    if (capacite_min !== undefined && capacite_min !== '') {
      parsedCapaciteMin = Number(capacite_min);
      if (Number.isNaN(parsedCapaciteMin) || parsedCapaciteMin < 0) {
        return res.status(400).json({
          success: false,
          message: 'Le paramètre "capacite_min" doit être un nombre positif ou nul.',
        });
      }
    }

    // --- Base pool: all active rooms, optionally filtered by capacity ---
    const salleWhere = { statut: 'Disponible' };
    if (parsedCapaciteMin !== undefined) {
      salleWhere.capacite = { gte: parsedCapaciteMin };
    }

    const dayRange = buildDayRange(parsedDate);

    // --- Find room ids already occupied by an approved reservation
    // whose time window overlaps the requested slot. Overlap condition:
    // existing.heure_debut < requested.heure_fin AND existing.heure_fin > requested.heure_debut ---
    const conflictingReservations = await prisma.reservationSalle.findMany({
      where: {
        statut: 'Approuvee',
        date: dayRange,
        heure_debut: { lt: parsedHeureFin },
        heure_fin: { gt: parsedHeureDebut },
      },
      select: { id_salle: true },
    });

    const occupiedSalleIds = new Set(conflictingReservations.map((r) => r.id_salle));

    // --- Bonus: also exclude rooms with an overlapping SessionSalle,
    // if that model exists on this Prisma client. Wrapped defensively
    // so a missing/renamed model doesn't break this endpoint. ---
    if (prisma.sessionSalle && typeof prisma.sessionSalle.findMany === 'function') {
      try {
        const conflictingSessions = await prisma.sessionSalle.findMany({
          where: {
            date: dayRange,
            heure_debut: { lt: parsedHeureFin },
            heure_fin: { gt: parsedHeureDebut },
            statut: { in: ['Planifiee', 'En_Cours'] },
          },
          select: { id_salle: true },
        });
        conflictingSessions.forEach((s) => occupiedSalleIds.add(s.id_salle));
      } catch (sessionError) {
        // Non-fatal — fall back to reservation-only conflict detection.
        console.warn(
          '[Enseignant Réservations] SessionSalle overlap check skipped:',
          sessionError.message
        );
      }
    }

    if (occupiedSalleIds.size > 0) {
      salleWhere.id_salle = { notIn: Array.from(occupiedSalleIds) };
    }

    const sallesDisponibles = await prisma.salle.findMany({
      where: salleWhere,
      orderBy: { numero: 'asc' },
    });

    return res.status(200).json({
      success: true,
      message: 'Salles disponibles récupérées avec succès.',
      data: sallesDisponibles,
    });
  } catch (error) {
    console.error('[Enseignant Réservations] Failed to fetch available rooms:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la recherche des salles disponibles.',
    });
  }
};

/**
 * POST /api/enseignant/reservations
 *
 * Create a new room reservation request on behalf of a teacher.
 * Status defaults to 'Demandee'.
 *
 * Body:
 *   - id_salle      (required) UUID of the requested room
 *   - id_demandeur  (required) UUID of the requesting teacher (Utilisateur)
 *   - date          (required) "YYYY-MM-DD"
 *   - heure_debut   (required) "HH:mm"
 *   - heure_fin     (required) "HH:mm"
 *   - motif         (required) reason for the reservation
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

    // Both times are anchored to the same base date, so a direct
    // comparison correctly validates chronological order.
    if (parsedHeureFin <= parsedHeureDebut) {
      return res.status(400).json({
        success: false,
        message: "L'heure de fin doit être postérieure à l'heure de début.",
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
      include: {
        salle: {
          select: { numero: true, nom: true, type: true },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Demande de réservation créée avec succès.',
      data: newReservation,
    });
  } catch (error) {
    // Prisma P2003 = foreign key constraint violation (invalid id_salle
    // or id_demandeur)
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Référence invalide: vérifiez "id_salle" et "id_demandeur".',
      });
    }

    console.error('[Enseignant Réservations] Failed to create reservation:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la création de la réservation.',
    });
  }
};

/**
 * GET /api/enseignant/reservations/:id_enseignant
 *
 * Fetch the reservation history for a specific teacher, including the
 * room's basic info, ordered by date descending.
 *
 * URL params:
 *   - id_enseignant: id_demandeur (UUID)
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getReservationsByEnseignant = async (req, res) => {
  try {
    const { id_enseignant } = req.params;

    if (!id_enseignant || !UUID_REGEX.test(id_enseignant)) {
      return res.status(400).json({
        success: false,
        message: `L'identifiant fourni ("${id_enseignant}") n'est pas un UUID valide.`,
      });
    }

    const reservations = await prisma.reservationSalle.findMany({
      where: { id_demandeur: id_enseignant },
      include: {
        salle: {
          select: { numero: true, nom: true, type: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    return res.status(200).json({
      success: true,
      message: 'Historique des réservations récupéré avec succès.',
      data: reservations,
    });
  } catch (error) {
    console.error('[Enseignant Réservations] Failed to fetch teacher reservations:', error);
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la récupération de l'historique des réservations.",
    });
  }
};

/**
 * PUT /api/enseignant/reservations/:id/annuler
 *
 * Cancel a reservation made by a teacher. Only allowed while the
 * reservation's current statut is 'Demandee' or 'Approuvee'.
 *
 * URL params:
 *   - id: id_reservation (UUID)
 *
 * Body (optional):
 *   - id_demandeur (optional) if provided, enforces that only the
 *     original requester can cancel their own reservation — ideally
 *     sourced from req.user once auth middleware exists
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const annulerReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_demandeur } = req.body || {};

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: `L'identifiant fourni ("${id}") n'est pas un UUID valide.`,
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

    // Optional ownership check: if the caller supplies id_demandeur,
    // ensure it matches the reservation's original requester.
    if (id_demandeur && existingReservation.id_demandeur !== id_demandeur) {
      return res.status(403).json({
        success: false,
        message: "Vous n'êtes pas autorisé à annuler cette réservation.",
      });
    }

    if (!CANCELLABLE_STATUTS.includes(existingReservation.statut)) {
      return res.status(400).json({
        success: false,
        message: `Cette réservation ne peut plus être annulée (statut actuel: "${existingReservation.statut}"). Seules les réservations "Demandee" ou "Approuvee" peuvent être annulées.`,
      });
    }

    const cancelledReservation = await prisma.reservationSalle.update({
      where: { id_reservation: id },
      data: { statut: 'Annulee' },
      include: {
        salle: {
          select: { numero: true, nom: true, type: true },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Réservation annulée avec succès.',
      data: cancelledReservation,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'La réservation est introuvable ou a déjà été supprimée.',
      });
    }

    console.error('[Enseignant Réservations] Failed to cancel reservation:', error);
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de l'annulation de la réservation.",
    });
  }
};

module.exports = {
  getSallesDisponibles,
  createReservation,
  getReservationsByEnseignant,
  annulerReservation,
};