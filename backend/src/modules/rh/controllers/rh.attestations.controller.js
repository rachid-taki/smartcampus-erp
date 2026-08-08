require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const PDFDocument = require('pdfkit');

const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.split('?')[0];
const pool = new Pool({ connectionString: cleanUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Only these two types belong to "Gestion des Attestations" — enum_type_demande_rh
// also contains leave-related types we deliberately exclude here.
const ATTESTATION_TYPES = ['Attestation_Travail', 'Attestation_Salaire'];

const VALID_STATUTS = ['Soumise', 'En_Traitement', 'Validee', 'Rejetee'];

// Shared include shape used across list/detail/PDF queries so the
// requesting employee's identity and the handling HR staff's identity
// are always resolved consistently.
const ATTESTATION_INCLUDE = {
  employe: {
    include: {
      utilisateur: {
        select: {
          id_utilisateur: true,
          nom: true,
          prenom: true,
          email: true,
        },
      },
    },
  },
  // CRITICAL: traite_par on DemandeRh points to an Employe record (the HR
  // staff member), not directly to Utilisateur — so we must traverse
  // traite_par -> employe -> utilisateur to reach the staff member's name.
  traite_par: {
    include: {
      employe: {
        include: {
          utilisateur: {
            select: {
              nom: true,
              prenom: true,
            },
          },
        },
      },
    },
  },
};

const formatStatutLabel = (statut) => String(statut || '').replace(/_/g, ' ');

const formatDateFr = (date) => {
  try {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

/**
 * GET /api/rh/attestations
 *
 * Fetch all attestation requests (type in Attestation_Travail,
 * Attestation_Salaire), including the requesting employee's identity
 * and the handling HR staff member's identity (if assigned).
 *
 * Query params (optional):
 *   - statut (filter by status)
 *   - type   (filter by a specific attestation type)
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getAttestations = async (req, res) => {
  try {
    const { statut, type } = req.query;

    const where = {
      type: { in: ATTESTATION_TYPES },
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

    if (type) {
      if (!ATTESTATION_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Type invalide: "${type}". Valeurs autorisées: ${ATTESTATION_TYPES.join(', ')}.`,
        });
      }
      where.type = type;
    }

    const attestations = await prisma.demandeRh.findMany({
      where,
      include: ATTESTATION_INCLUDE,
      orderBy: { date_demande: 'desc' },
    });

    return res.status(200).json({
      success: true,
      count: attestations.length,
      data: attestations,
    });
  } catch (error) {
    console.error('[RH Attestations] Failed to fetch attestations:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération des attestations.',
    });
  }
};

/**
 * POST /api/rh/attestations
 *
 * Create a new attestation request (simulating an employee submitting one).
 * Status defaults to 'Soumise'.
 *
 * Body:
 *   - id_employe (required) UUID of the requesting employee
 *   - type       (required) one of Attestation_Travail | Attestation_Salaire
 *   - motif      (optional) reason for the request
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const createAttestation = async (req, res) => {
  try {
    const { id_employe, type, motif } = req.body;

    if (!id_employe || !UUID_REGEX.test(id_employe)) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "id_employe" est requis et doit être un UUID valide.',
      });
    }

    if (!type || !ATTESTATION_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Le champ "type" est requis et doit être l'un des suivants: ${ATTESTATION_TYPES.join(', ')}.`,
      });
    }

    // --- Verify the employee exists before creating the request ---
    const employe = await prisma.employe.findUnique({
      where: { id_employe },
    });

    if (!employe) {
      return res.status(404).json({
        success: false,
        message: `Aucun employé trouvé avec l'id "${id_employe}".`,
      });
    }

    const newAttestation = await prisma.demandeRh.create({
      data: {
        id_employe,
        type,
        statut: 'Soumise',
        date_demande: new Date(),
        motif: motif || null,
      },
      include: ATTESTATION_INCLUDE,
    });

    return res.status(201).json({
      success: true,
      message: "Demande d'attestation créée avec succès.",
      data: newAttestation,
    });
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Référence invalide: vérifiez que "id_employe" correspond à un employé existant.',
      });
    }

    console.error('[RH Attestations] Failed to create attestation:', error);
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la création de la demande d'attestation.",
    });
  }
};

/**
 * PUT /api/rh/attestations/:id/statut
 *
 * Update the status of an attestation request (HR validation/rejection).
 *
 * URL params:
 *   - id: id_demande_rh (UUID)
 *
 * Body:
 *   - statut           (required) one of Soumise | En_Traitement | Validee | Rejetee
 *   - commentaires_rh   (optional) HR notes/remarks
 *   - id_traite_par     (optional) id of the HR staff member (Employe) handling
 *                        it — ideally sourced from req.user once auth exists
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const updateAttestationStatut = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, commentaires_rh, id_traite_par } = req.body;

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

    if (!VALID_STATUTS.includes(statut)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide: "${statut}". Valeurs autorisées: ${VALID_STATUTS.join(', ')}.`,
      });
    }

    // --- Verify the request exists and is actually an "attestation" type ---
    const existingAttestation = await prisma.demandeRh.findUnique({
      where: { id_demande_rh: id },
    });

    if (!existingAttestation || !ATTESTATION_TYPES.includes(existingAttestation.type)) {
      return res.status(404).json({
        success: false,
        message: `Aucune demande d'attestation trouvée avec l'id "${id}".`,
      });
    }

    const staffId = (req.user && req.user.id_rh_staff) || id_traite_par || null;

    const updateData = { statut };

    if (commentaires_rh !== undefined) {
      updateData.commentaires_rh = commentaires_rh;
    }

    if (staffId) {
      updateData.id_traite_par = staffId;
    }

    const updatedAttestation = await prisma.demandeRh.update({
      where: { id_demande_rh: id },
      data: updateData,
      include: ATTESTATION_INCLUDE,
    });

    return res.status(200).json({
      success: true,
      message: "Statut de la demande d'attestation mis à jour avec succès.",
      data: updatedAttestation,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: "La demande d'attestation est introuvable ou a déjà été supprimée.",
      });
    }

    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Référence invalide: vérifiez la valeur de "id_traite_par".',
      });
    }

    console.error('[RH Attestations] Failed to update attestation status:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la mise à jour du statut.',
    });
  }
};

/**
 * GET /api/rh/attestations/:id/pdf
 *
 * Generate and stream a formal PDF attestation document.
 * Currently supports 'Attestation_Travail' (employment certificate)
 * with the employee's nom, prenom, fonction, departement, and
 * date_embauche. Other attestation types fall back to a generic layout.
 *
 * URL params:
 *   - id: id_demande_rh (UUID)
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const generateAttestationPdf = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: `L'identifiant fourni ("${id}") n'est pas un UUID valide.`,
      });
    }

    const attestation = await prisma.demandeRh.findUnique({
      where: { id_demande_rh: id },
      include: {
        employe: {
          include: {
            utilisateur: true,
          },
        },
      },
    });

    if (!attestation || !ATTESTATION_TYPES.includes(attestation.type)) {
      return res.status(404).json({
        success: false,
        message: `Aucune demande d'attestation trouvée avec l'id "${id}".`,
      });
    }

    const utilisateur = attestation.employe?.utilisateur || null;
    const nom = utilisateur?.nom || 'N/A';
    const prenom = utilisateur?.prenom || 'N/A';
    const fonction = attestation.employe?.fonction || 'N/A';
    const departement = attestation.employe?.departement || 'N/A';
    const dateEmbauche = attestation.employe?.date_embauche
      ? formatDateFr(attestation.employe.date_embauche)
      : 'N/A';

    // --- Initialize the PDF document ---
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // --- Set response headers for a downloadable PDF ---
    const docLabel =
      attestation.type === 'Attestation_Travail' ? 'Attestation_Travail' : 'Attestation_Salaire';
    const safeFileName = `${docLabel}_${prenom}_${nom}`.replace(/[^a-zA-Z0-9_-]/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.pdf"`);

    doc.on('error', (streamError) => {
      console.error('[RH Attestations] PDF stream error:', streamError);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Une erreur est survenue lors de la génération du PDF.',
        });
      }
    });

    doc.pipe(res);

    // ─────────────────────────────────────────────
    // Header
    // ─────────────────────────────────────────────
    doc
      .fontSize(18)
      .fillColor('#065f46')
      .font('Helvetica-Bold')
      .text('Université SmartCampus', { align: 'center' });

    doc
      .fontSize(12)
      .fillColor('#4b5563')
      .font('Helvetica')
      .text('Portail Ressources Humaines', { align: 'center' });

    doc.moveDown(0.5);

    doc
      .strokeColor('#d1d5db')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.moveDown(1.5);

    // ─────────────────────────────────────────────
    // Title (varies by attestation type)
    // ─────────────────────────────────────────────
    const title =
      attestation.type === 'Attestation_Travail'
        ? 'Attestation de Travail'
        : 'Attestation de Salaire';

    doc
      .fontSize(16)
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text(title, { align: 'center' });

    doc.moveDown(2);

    // ─────────────────────────────────────────────
    // Body content
    // ─────────────────────────────────────────────
    if (attestation.type === 'Attestation_Travail') {
      doc
        .fontSize(11)
        .fillColor('#111827')
        .font('Helvetica')
        .text(
          `Nous, Université SmartCampus, attestons par la présente que :`,
          { align: 'left' }
        );

      doc.moveDown(1);

      const details = [
        ['Nom', nom],
        ['Prénom', prenom],
        ['Fonction', fonction],
        ['Département', departement],
        ["Date d'embauche", dateEmbauche],
      ];

      details.forEach(([label, value]) => {
        doc
          .fontSize(11)
          .fillColor('#374151')
          .font('Helvetica-Bold')
          .text(`${label} : `, { continued: true })
          .font('Helvetica')
          .fillColor('#111827')
          .text(String(value));
      });

      doc.moveDown(1.5);

      doc
        .fontSize(11)
        .fillColor('#111827')
        .font('Helvetica')
        .text(
          `est employé(e) au sein de notre établissement en qualité de ${fonction}, ` +
            `au sein du département ${departement}, depuis le ${dateEmbauche}.`,
          { align: 'justify' }
        );

      doc.moveDown(1);

      doc
        .fontSize(11)
        .font('Helvetica')
        .text(
          'Cette attestation est délivrée à l\'intéressé(e) pour servir et valoir ce que de droit.',
          { align: 'justify' }
        );
    } else {
      // Attestation_Salaire — generic layout (salary figures aren't in
      // the DemandeRh/Employe schema provided, so this states identity
      // and function only; extend once payroll data is available).
      doc
        .fontSize(11)
        .fillColor('#111827')
        .font('Helvetica')
        .text(
          `Nous, Université SmartCampus, attestons par la présente que :`,
          { align: 'left' }
        );

      doc.moveDown(1);

      const details = [
        ['Nom', nom],
        ['Prénom', prenom],
        ['Fonction', fonction],
        ['Département', departement],
      ];

      details.forEach(([label, value]) => {
        doc
          .fontSize(11)
          .fillColor('#374151')
          .font('Helvetica-Bold')
          .text(`${label} : `, { continued: true })
          .font('Helvetica')
          .fillColor('#111827')
          .text(String(value));
      });

      doc.moveDown(1.5);

      doc
        .fontSize(11)
        .font('Helvetica')
        .text(
          'est employé(e) au sein de notre établissement. Les détails relatifs à la ' +
            'rémunération sont disponibles auprès du service des Ressources Humaines.',
          { align: 'justify' }
        );
    }

    doc.moveDown(3);

    doc
      .strokeColor('#d1d5db')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.moveDown(1);

    // ─────────────────────────────────────────────
    // Footer
    // ─────────────────────────────────────────────
    doc
      .fontSize(9)
      .fillColor('#9ca3af')
      .font('Helvetica-Oblique')
      .text(
        `Document généré automatiquement le ${formatDateFr(new Date())} par le Portail RH SmartCampus.`,
        { align: 'center' }
      );

    doc.end();
  } catch (error) {
    console.error('[RH Attestations] Failed to generate attestation PDF:', error);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Une erreur est survenue lors de la génération du PDF.',
      });
    }
  }
};

module.exports = {
  getAttestations,
  createAttestation,
  updateAttestationStatut,
  generateAttestationPdf,
};