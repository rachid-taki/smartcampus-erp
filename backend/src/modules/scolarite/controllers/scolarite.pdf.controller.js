require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const PDFDocument = require('pdfkit');
const { Buffer } = require('buffer');

const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.split('?')[0];
const pool = new Pool({ connectionString: cleanUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Simple UUID v4-ish format check (accepts any RFC 4122 UUID variant)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
 * GET /api/scolarite/demandes/:id/pdf
 *
 * Generate a formal PDF attestation for a specific Demande, 
 * save it to the `document_officiel` table as a BYTEA buffer, 
 * and then stream it back to the client.
 */
const generateDemandePdf = async (req, res) => {
  try {
    const { id } = req.params;

    // --- Validate the id param before hitting the database ---
    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: `L'identifiant fourni ("${id}") n'est pas un UUID valide.`,
      });
    }

    // --- Fetch the demande with its related etudiant -> utilisateur ---
    const demande = await prisma.demande.findUnique({
      where: { id_demande: id },
      include: {
        etudiant: {
          include: {
            utilisateur: true,
          },
        },
      },
    });

    if (!demande) {
      return res.status(404).json({
        success: false,
        message: `Aucune demande trouvée avec l'id "${id}".`,
      });
    }

    // Ensure we have an etudiant attached to save the official document
    if (!demande.id_etudiant) {
      return res.status(400).json({
        success: false,
        message: "Cette demande n'est associée à aucun étudiant. Impossible de générer un document officiel.",
      });
    }

    const utilisateur = demande.etudiant?.utilisateur || null;
    const cne = demande.etudiant?.cne || 'N/A';
    const nom = utilisateur?.nom || 'N/A';
    const prenom = utilisateur?.prenom || 'N/A';

    // --- Initialize the PDF document ---
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const safeNumero = (demande.numero || id).replace(/[^a-zA-Z0-9_-]/g, '_');
    
    // --- Buffer Collection ---
    // Instead of streaming directly to `res`, we capture the PDF chunks
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));

    doc.on('end', async () => {
      try {
        const pdfBuffer = Buffer.concat(buffers);

        // 1. Save the generated PDF directly to the PostgreSQL Database
        await prisma.document_officiel.create({
          data: {
            id_demande: demande.id_demande,
            id_etudiant: demande.id_etudiant,
            nom: `Attestation_${safeNumero}.pdf`,
            type: 'application/pdf',
            categorie: 'Attestation',
            contenu: pdfBuffer,
            taille: pdfBuffer.length,
          }
        });

        // 2. Send the buffer to the browser for immediate download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="Attestation_${safeNumero}.pdf"`
        );
        res.send(pdfBuffer);

      } catch (dbError) {
        console.error('[Scolarité PDF] Database save error:', dbError);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Erreur lors de la sauvegarde du document officiel en base de données.',
          });
        }
      }
    });

    // Handle stream-level errors
    doc.on('error', (streamError) => {
      console.error('[Scolarité PDF] PDF stream error:', streamError);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Une erreur est survenue lors de la génération du PDF.',
        });
      }
    });

    // ─────────────────────────────────────────────
    // Draw Header
    // ─────────────────────────────────────────────
    doc
      .fontSize(18)
      .fillColor('#1e3a8a')
      .font('Helvetica-Bold')
      .text('Université SmartCampus', { align: 'center' });

    doc
      .fontSize(12)
      .fillColor('#4b5563')
      .font('Helvetica')
      .text('Portail Scolarité', { align: 'center' });

    doc.moveDown(0.5);

    doc
      .strokeColor('#d1d5db')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.moveDown(1.5);

    // ─────────────────────────────────────────────
    // Draw Title
    // ─────────────────────────────────────────────
    doc
      .fontSize(16)
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text('Attestation de Demande', { align: 'center' });

    doc.moveDown(2);

    // ─────────────────────────────────────────────
    // Draw Student details
    // ─────────────────────────────────────────────
    doc
      .fontSize(12)
      .fillColor('#1e3a8a')
      .font('Helvetica-Bold')
      .text('Informations de l\'étudiant');

    doc.moveDown(0.5);

    const studentDetails = [
      ['Nom', nom],
      ['Prénom', prenom],
      ['CNE', cne],
    ];

    studentDetails.forEach(([label, value]) => {
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

    // ─────────────────────────────────────────────
    // Draw Request details
    // ─────────────────────────────────────────────
    doc
      .fontSize(12)
      .fillColor('#1e3a8a')
      .font('Helvetica-Bold')
      .text('Détails de la demande');

    doc.moveDown(0.5);

    const requestDetails = [
      ['Numéro', demande.numero || 'N/A'],
      ['Objet', demande.objet || 'N/A'],
      ['Statut', formatStatutLabel(demande.statut)],
      ['Date de création', formatDateFr(demande.date_creation)],
    ];

    requestDetails.forEach(([label, value]) => {
      doc
        .fontSize(11)
        .fillColor('#374151')
        .font('Helvetica-Bold')
        .text(`${label} : `, { continued: true })
        .font('Helvetica')
        .fillColor('#111827')
        .text(String(value));
    });

    doc.moveDown(3);

    doc
      .strokeColor('#d1d5db')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.moveDown(1);

    // ─────────────────────────────────────────────
    // Draw Footer
    // ─────────────────────────────────────────────
    doc
      .fontSize(9)
      .fillColor('#9ca3af')
      .font('Helvetica-Oblique')
      .text(
        `Document généré automatiquement le ${formatDateFr(new Date())} par le Portail Scolarité SmartCampus.`,
        { align: 'center' }
      );

    // --- Finalize the document (triggers the 'end' event and database save) ---
    doc.end();

  } catch (error) {
    console.error('[Scolarité PDF] Failed to generate demande PDF:', error);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Une erreur est survenue lors de la génération du PDF.',
      });
    }
  }
};

module.exports = {
  generateDemandePdf,
};