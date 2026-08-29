require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const PDFDocument = require('pdfkit');

// --- NOUVEAUX IMPORTS ---
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
// ------------------------

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

// -----------------------------------------------------------------------------
// NOUVEAU HELPER : DESSINER LE CONTENU DU PDF (Utilisé pour Download & Email)
// -----------------------------------------------------------------------------
const drawAttestationContent = (doc, attestation) => {
  const utilisateur = attestation.employe?.utilisateur || null;
  const nom = utilisateur?.nom || 'N/A';
  const prenom = utilisateur?.prenom || 'N/A';
  const fonction = attestation.employe?.fonction || 'N/A';
  const departement = attestation.employe?.departement || 'N/A';
  const dateEmbauche = attestation.employe?.date_embauche
    ? formatDateFr(attestation.employe.date_embauche)
    : 'N/A';

  // --- LOGO DE L'ÉCOLE ---
  // Assurez-vous de placer un fichier "logo.png" dans le dossier "assets" à la racine du projet
  // Si le logo n'est pas trouvé, le code l'ignorera sans crasher.
  const logoPath = path.join(__dirname, '../../../assets/logo.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, 40, { width: 60 });
  }

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
    .text('Direction des Ressources Humaines', { align: 'center' });

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
      ? 'ATTESTATION DE TRAVAIL'
      : 'ATTESTATION DE SALAIRE';

  doc
    .fontSize(16)
    .fillColor('#111827')
    .font('Helvetica-Bold')
    .text(title, { align: 'center', underline: true });

  doc.moveDown(2);

  // ─────────────────────────────────────────────
  // Body content
  // ─────────────────────────────────────────────
  doc
    .fontSize(11)
    .fillColor('#111827')
    .font('Helvetica')
    .text(`Nous, Direction des Ressources Humaines de l'Université SmartCampus, attestons par la présente que :`, { align: 'left' });

  doc.moveDown(1.5);

  const leftCol = 100;
  
  // Rendu en colonnes claires
  doc.font('Helvetica-Bold').text('Nom et Prénom :', leftCol, doc.y, { continued: true }).font('Helvetica').text(`  ${prenom} ${nom}`);
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text('Fonction :', leftCol, doc.y, { continued: true }).font('Helvetica').text(`  ${fonction}`);
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text('Département :', leftCol, doc.y, { continued: true }).font('Helvetica').text(`  ${departement}`);
  doc.moveDown(0.5);

  if (attestation.type === 'Attestation_Travail') {
    doc.font('Helvetica-Bold').text('Date d\'embauche :', leftCol, doc.y, { continued: true }).font('Helvetica').text(`  ${dateEmbauche}`);
    doc.moveDown(2);
    
    doc.text(
      `Fait partie de nos effectifs et est employé(e) régulièrement au sein de notre établissement depuis la date mentionnée ci-dessus.`,
      50, doc.y, { align: 'justify' }
    );
  } else {
    // Attestation Salaire
    doc.moveDown(2);
    doc.text(
      `Est employé(e) au sein de notre établissement. Ce document tient lieu d'attestation officielle de statut. Les détails relatifs à la rémunération sont disponibles sur demande.`,
      50, doc.y, { align: 'justify' }
    );
  }

  doc.moveDown(1.5);
  doc.text('Cette attestation est délivrée à l\'intéressé(e) pour servir et valoir ce que de droit.', { align: 'justify' });

  doc.moveDown(3);

  // ─────────────────────────────────────────────
  // E-SIGNATURE VISUAL ENHANCEMENT
  // ─────────────────────────────────────────────
  const signatureY = doc.y;
  doc.rect(350, signatureY, 180, 80).fillOpacity(0.05).fillAndStroke('#10b981', '#10b981');
  
  doc.fillOpacity(1).fillColor('#065f46').fontSize(10).font('Helvetica-Bold')
     .text('SIGNATURE ÉLECTRONIQUE', 350, signatureY + 15, { width: 180, align: 'center' });
     
  doc.fontSize(8).font('Helvetica').fillColor('#374151')
     .text(`Validé par le système RH\nLe ${formatDateFr(new Date())}\nRéf: ${attestation.id_demande_rh.split('-')[0].toUpperCase()}`, 350, signatureY + 35, { width: 180, align: 'center' });

  doc.moveDown(5);

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
      `Document généré et signé électroniquement le ${formatDateFr(new Date())} par le Portail RH SmartCampus.`,
      { align: 'center' }
    );
};

/**
 * GET /api/rh/attestations
 * ... (Comments from original) ...
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
 * ... (Comments from original) ...
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
 * ... (Comments from original) ...
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
      include: ATTESTATION_INCLUDE // INCLUSION ajoutée pour récupérer l'email plus bas
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

    // ─────────────────────────────────────────────────────────────
    // NOUVEAU WORKFLOW : Envoi de l'email + Notification si "Validee"
    // ─────────────────────────────────────────────────────────────
    if (statut === 'Validee') {
      try {
        const employeeEmail = existingAttestation.employe.utilisateur.email;
        const employeeId = existingAttestation.employe.utilisateur.id_utilisateur;
        
        // 1. Créer le buffer du PDF en mémoire
        const pdfBuffer = await new Promise((resolve, reject) => {
          const doc = new PDFDocument({ size: 'A4', margin: 50 });
          const buffers = [];
          doc.on('data', buffers.push.bind(buffers));
          doc.on('end', () => resolve(Buffer.concat(buffers)));
          doc.on('error', reject);
          
          drawAttestationContent(doc, updatedAttestation);
          doc.end();
        });

        // 2. Configurer le transporteur SMTP spécial RH (avec variables d'environnement)
        const transporter = nodemailer.createTransport({
          host: process.env.RH_SMTP_HOST,
          port: process.env.RH_SMTP_PORT,
          secure: process.env.RH_SMTP_PORT == 465, // true for 465, false for other ports
          auth: { 
            user: process.env.RH_SMTP_USER, 
            pass: process.env.RH_SMTP_PASS 
          },
        });

        // 3. Envoyer l'email
        const attestationName = updatedAttestation.type === 'Attestation_Travail' ? 'Attestation de Travail' : 'Attestation de Salaire';
        await transporter.sendMail({
          from: `"Ressources Humaines - SmartCampus" <${process.env.RH_SMTP_USER}>`,
          to: employeeEmail,
          subject: `📄 Votre ${attestationName} est prête et signée`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #374151; line-height: 1.6;">
              <h2 style="color: #111827;">Bonjour ${existingAttestation.employe.utilisateur.prenom},</h2>
              <p>Votre demande pour une <strong>${attestationName}</strong> a été validée.</p>
              <p>Vous trouverez en pièce jointe la version numérique signée électroniquement.</p>
              <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 12px; margin-top: 20px;">
                <strong>Information importante :</strong><br/>
                Vous pouvez vous présenter au bureau des Ressources Humaines pour récupérer la version originale imprimée et tamponnée de ce document.
              </div>
              <br/>
              <p>Cordialement,<br/>L'équipe RH SmartCampus</p>
            </div>
          `,
          attachments: [{
            filename: `${updatedAttestation.type}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }]
        });

        // 4. Créer la notification In-App
        await prisma.notification.create({
          data: {
            id_utilisateur: employeeId,
            titre: "Attestation Prête",
            message: "Votre document a été envoyé par email. La version papier vous attend au bureau RH.",
            type: "Document",
            lu: false,
            priorite: "Info"
          }
        });
      } catch (err) {
        console.error("[RH Workflow] Erreur lors de l'envoi d'email ou notification:", err);
        // On log l'erreur mais on ne bloque pas la réponse de succès pour la mise à jour du statut.
      }
    }
    // ─────────────────────────────────────────────────────────────

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
 * ... (Comments from original) ...
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

    // On branche le document directement sur la réponse HTTP
    doc.pipe(res);

    // On dessine le contenu via notre helper partagé !
    drawAttestationContent(doc, attestation);

    // Fin du document (ferme le stream)
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