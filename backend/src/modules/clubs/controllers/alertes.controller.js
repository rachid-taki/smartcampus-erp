require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.split('?')[0];
const pool = new Pool({ connectionString: cleanUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// GET /api/alertes
// ---------------------------------------------------------------------------
exports.getAlertes = async (req, res) => {
  try {
    const { statut, gravite } = req.query;
    const where = {};

    if (statut) where.statut = statut;
    if (gravite) where.priorite = gravite; // Dans votre schéma, c'est 'priorite'

    // Utilisation directe du modèle exact de votre schema.prisma : alerteIa
    const alertes = await prisma.alerteIa.findMany({
      where,
      include: {
        salle: true
      },
      orderBy: {
        date_detection: 'desc', // Dans votre schéma, c'est 'date_detection'
      },
    });

    return res.status(200).json({
      success: true,
      count: alertes.length,
      data: alertes,
    });
  } catch (error) {
    console.error('[alertes.controller] getAlertes error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des alertes.',
    });
  }
};

// ---------------------------------------------------------------------------
// PUT /api/alertes/:id/statut
// ---------------------------------------------------------------------------
exports.updateStatut = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    if (!statut) {
      return res.status(400).json({ success: false, message: 'Le champ statut est requis.' });
    }

    const updated = await prisma.alerteIa.update({
      where: { id_alerte: id }, // Clé primaire définie dans votre schéma
      data: { statut },
      include: { salle: true },
    });

    return res.status(200).json({
      success: true,
      message: 'Statut de l\'alerte mis à jour avec succès.',
      data: updated,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Alerte introuvable.' });
    }
    console.error('[alertes.controller] updateStatut error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour du statut.',
    });
  }
};

// ---------------------------------------------------------------------------
// POST /api/alertes/analyze
// ---------------------------------------------------------------------------
exports.analyze = async (req, res) => {
  try {
    // Simulation intelligente basée sur vos sessions en cours
    const sessionsEnCours = await prisma.sessionSalle.findMany({
      where: { statut: 'En_Cours' },
      include: { salle: true, presences: true },
    });

    let nouvellesAlertes = 0;

    for (const session of sessionsEnCours) {
      const nbPresents = session.presences ? session.presences.length : 0;
      const capaciteSalle = session.salle?.capacite || 0;

      // Règle 1 : Salle vide alors qu'une session est en cours
      if (nbPresents === 0) {
        // Vérifier si l'alerte existe déjà pour éviter les doublons
        const existe = await prisma.alerteIa.findFirst({
          where: { id_salle: session.id_salle, statut: 'Nouvelle' }
        });

        if (!existe) {
          await prisma.alerteIa.create({
            data: {
              id_salle: session.id_salle,
              type: 'Salle_Fantome',
              description: 'Session en cours mais aucun étudiant pointé dans la salle.',
              priorite: 'Haute',
              statut: 'Nouvelle',
            }
          });
          nouvellesAlertes++;
        }
      }

      // Règle 2 : Surcharge de capacité
      if (capaciteSalle > 0 && nbPresents > capaciteSalle) {
        const existe = await prisma.alerteIa.findFirst({
          where: { id_salle: session.id_salle, statut: 'Nouvelle' }
        });

        if (!existe) {
          await prisma.alerteIa.create({
            data: {
              id_salle: session.id_salle,
              type: 'Surcharge',
              description: `Capacité de la salle dépassée (${nbPresents}/${capaciteSalle} étudiants).`,
              priorite: 'Urgente',
              statut: 'Nouvelle',
            }
          });
          nouvellesAlertes++;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Analyse terminée. ${nouvellesAlertes} nouvelle(s) alerte(s) générée(s).`,
      alertes_creees: nouvellesAlertes,
    });
  } catch (error) {
    console.error('[alertes.controller] analyze error:', error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur lors de l'analyse IA des sessions.",
    });
  }
};