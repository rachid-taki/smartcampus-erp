require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.split('?')[0];
const pool = new Pool({ connectionString: cleanUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * GET /api/scolarite/documents
 *
 * Fetch documents, optionally filtered by id_demande OR id_reclamation.
 * Results are ordered by date_upload descending (newest first).
 *
 * Query params:
 *   - id_demande     (optional) filter documents attached to a given demande
 *   - id_reclamation (optional) filter documents attached to a given reclamation
 *
 * NOTE: if both are provided, we treat it as an invalid filter combination
 * (mirrors the exclusivity rule enforced on creation) rather than silently
 * picking one — this avoids confusing/ambiguous query results.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getDocuments = async (req, res) => {
  try {
    const { id_demande, id_reclamation } = req.query;

    if (id_demande && id_reclamation) {
      return res.status(400).json({
        success: false,
        message:
          'Veuillez filtrer par "id_demande" OU "id_reclamation", pas les deux à la fois.',
      });
    }

    const where = {};
    if (id_demande) where.id_demande = id_demande;
    if (id_reclamation) where.id_reclamation = id_reclamation;

    const documents = await prisma.document.findMany({
      where,
      orderBy: { date_upload: 'desc' },
    });

    return res.status(200).json({
      success: true,
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    console.error('[Scolarité Documents] Failed to fetch documents:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération des documents.',
    });
  }
};

/**
 * POST /api/scolarite/documents
 *
 * Register a newly uploaded document's metadata. The physical file upload
 * (e.g. to S3) is assumed to have already happened elsewhere; this endpoint
 * only persists the resulting metadata row.
 *
 * Body:
 *   - nom            (required) file name
 *   - type           (required) file type/mimetype
 *   - url            (required) storage URL (e.g. S3 URL)
 *   - taille         (required) file size in bytes
 *   - id_demande     (exactly one of these two must be provided)
 *   - id_reclamation
 *   - hash           (optional)
 *   - version        (optional, defaults to 1 via schema default)
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const createDocument = async (req, res) => {
  try {
    const {
      nom,
      type,
      url,
      taille,
      hash,
      version,
      id_demande,
      id_reclamation,
    } = req.body;

    // --- Basic field validation ---

    if (!nom || typeof nom !== 'string' || !nom.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "nom" est requis.',
      });
    }

    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "url" est requis.',
      });
    }

    if (!type || typeof type !== 'string' || !type.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "type" est requis.',
      });
    }

    if (taille === undefined || taille === null || Number.isNaN(Number(taille))) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "taille" est requis et doit être un nombre.',
      });
    }

    // --- CRITICAL: exclusivity validation (id_demande XOR id_reclamation) ---

    const hasDemande = id_demande !== undefined && id_demande !== null && id_demande !== '';
    const hasReclamation =
      id_reclamation !== undefined && id_reclamation !== null && id_reclamation !== '';

    if (hasDemande && hasReclamation) {
      return res.status(400).json({
        success: false,
        message:
          'Un document ne peut pas être lié à la fois à "id_demande" ET "id_reclamation". Fournissez un seul des deux.',
      });
    }

    if (!hasDemande && !hasReclamation) {
      return res.status(400).json({
        success: false,
        message:
          'Un document doit être lié à "id_demande" OU "id_reclamation". Aucun des deux n\'a été fourni.',
      });
    }

    // --- Build the create payload ---

    const data = {
      nom: nom.trim(),
      type: type.trim(),
      url: url.trim(),
      taille: Number(taille),
      id_demande: hasDemande ? id_demande : null,
      id_reclamation: hasReclamation ? id_reclamation : null,
    };

    if (hash !== undefined && hash !== null && hash !== '') {
      data.hash = hash;
    }

    if (version !== undefined && version !== null && !Number.isNaN(Number(version))) {
      data.version = Number(version);
    }

    const newDocument = await prisma.document.create({ data });

    return res.status(201).json({
      success: true,
      message: 'Document enregistré avec succès.',
      data: newDocument,
    });
  } catch (error) {
    // In case the DB-level exclusivity constraint (CHECK constraint) still
    // fires despite our app-level validation (e.g. a race condition, or a
    // client bypassing this API), surface it as a clean 400 instead of a 500.
    if (error.code === 'P2010' || error.code === '23514') {
      return res.status(400).json({
        success: false,
        message:
          'Contrainte de base de données violée: un document doit être lié à exactement une demande ou une réclamation.',
      });
    }

    console.error('[Scolarité Documents] Failed to create document:', error);
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de l'enregistrement du document.",
    });
  }
};

/**
 * DELETE /api/scolarite/documents/:id
 *
 * Delete a document metadata record. Does NOT delete the physical file
 * from cloud storage — that must be handled separately by the caller
 * or a cleanup job.
 *
 * URL params:
 *   - id: id_document (UUID) of the document to delete
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    // --- Verify the document exists before attempting the delete ---

    const existingDocument = await prisma.document.findUnique({
      where: { id_document: id },
    });

    if (!existingDocument) {
      return res.status(404).json({
        success: false,
        message: `Aucun document trouvé avec l'id "${id}".`,
      });
    }

    await prisma.document.delete({
      where: { id_document: id },
    });

    return res.status(200).json({
      success: true,
      message: 'Document supprimé avec succès.',
    });
  } catch (error) {
    // Prisma throws P2025 when the record to delete is not found
    // (race condition: deleted between the findUnique check and delete)
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Le document est introuvable ou a déjà été supprimé.',
      });
    }

    console.error('[Scolarité Documents] Failed to delete document:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la suppression du document.',
    });
  }
};

module.exports = {
  getDocuments,
  createDocument,
  deleteDocument,
};