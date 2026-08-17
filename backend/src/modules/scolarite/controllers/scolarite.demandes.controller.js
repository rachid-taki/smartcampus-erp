require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const multer = require('multer');
const crypto = require('crypto');

const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.split('?')[0];
const pool = new Pool({ connectionString: cleanUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Seuls les PDF et images sont autorisés.'), false);
  },
});

const uploadDocument = upload.single('document');

const VALID_STATUTS = ['Brouillon', 'Soumise', 'En_Traitement', 'Validee', 'Rejetee', 'Cloturee'];

const DOCUMENT_OFFICIAL_TYPES = ['ATTESTATION_SCOLARITE', 'RELEVE_NOTES', 'ATTESTATION', 'RELEVE'];

const isDocumentOfficialType = (typeDemande) => {
  if (!typeDemande) return false;
  const code = (typeDemande.code || '').toUpperCase();
  const libelle = (typeDemande.libelle || '').toLowerCase();
  return DOCUMENT_OFFICIAL_TYPES.some((c) => code.includes(c)) ||
         libelle.includes('attestation') || libelle.includes('relevé') || libelle.includes('releve');
};

const getDocumentCategorie = (typeDemande) => {
  if (!typeDemande) return 'autre';
  const libelle = (typeDemande.libelle || '').toLowerCase();
  if (libelle.includes('relevé') || libelle.includes('releve')) return 'releve_notes';
  if (libelle.includes('attestation')) return 'attestation';
  return 'autre';
};


const getDemandes = async (req, res) => {
  try {
    const { statut, search } = req.query;
    const where = {};

    if (statut) {
      if (!VALID_STATUTS.includes(statut)) {
        return res.status(400).json({
          success: false,
          message: `Statut invalide: "${statut}".`,
        });
      }
      where.statut = statut;
    }

    if (search) {
      where.OR = [
        { numero: { contains: search, mode: 'insensitive' } },
        { objet: { contains: search, mode: 'insensitive' } },
      ];
    }

    const demandes = await prisma.demande.findMany({
      where,
      orderBy: { date_creation: 'desc' },
      include: {
        type_demande: {
          select: { id_type: true, libelle: true, code: true },
        },
        documents_officiels: {
          select: {
            id_document_officiel: true,
            nom: true,
            date_generation: true,
          },
          take: 1,
          orderBy: { date_generation: 'desc' },
        },
      },
    });

    return res.status(200).json({ success: true, count: demandes.length, data: demandes });
  } catch (error) {
    console.error('[Scolarité Demandes] Failed to fetch:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des demandes.',
    });
  }
};


const updateDemandeStatus = async (req, res) => {
  try {
    const { id } = req.params;

    
    const statut = req.body?.statut;
    const commentaires = req.body?.commentaires;
    const fichier = req.file; 

    console.log('[updateDemandeStatus] Reçu:', { id, statut, hasFile: !!fichier, mimetype: fichier?.mimetype });

    if (!statut) {
      return res.status(400).json({ success: false, message: 'Le champ "statut" est requis.' });
    }

    if (!VALID_STATUTS.includes(statut)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide: "${statut}".`,
      });
    }

    const existingDemande = await prisma.demande.findUnique({
      where: { id_demande: id },
      include: { etudiant: true, type_demande: true },
    });

    if (!existingDemande) {
      return res.status(404).json({ success: false, message: `Aucune demande avec l'id "${id}".` });
    }

    
    const idTraitePar = (req.user && req.user.id_scolarite) || null;

    
    const updateData = { statut };
    
    if (idTraitePar) {
      updateData.id_traite_par = idTraitePar;
    }
    
    if (commentaires !== undefined && commentaires !== '') {
      updateData.commentaires = commentaires;
    }

    const updatedDemande = await prisma.demande.update({
      where: { id_demande: id },
      data: updateData,
    });

    
    let documentOfficiel = null;

    if (fichier && statut === 'Validee' && isDocumentOfficialType(existingDemande.type_demande)) {
      try {
        const hash = crypto.createHash('sha256').update(fichier.buffer).digest('hex');
        const categorie = getDocumentCategorie(existingDemande.type_demande);
        const safeNumero = (existingDemande.numero || id).replace(/[^a-zA-Z0-9_-]/g, '_');
        const nomFichier = fichier.originalname || `${categorie}_${safeNumero}.pdf`;

        documentOfficiel = await prisma.document_officiel.create({
          data: {
            id_demande: existingDemande.id_demande,
            id_etudiant: existingDemande.id_etudiant,
            nom: nomFichier,
            type: fichier.mimetype,
            categorie: categorie,
            contenu: fichier.buffer,
            taille: fichier.buffer.length,
            hash: hash,
          },
        });

        console.log(`[Scolarité] ✅ Document "${nomFichier}" sauvegardé`);
      } catch (docError) {
        console.error('[Scolarité] Erreur création document_officiel:', docError);
        
      }
    }

    return res.status(200).json({
      success: true,
      message: documentOfficiel
        ? 'Statut mis à jour et document officiel envoyé avec succès.'
        : 'Statut de la demande mis à jour avec succès.',
      data: updatedDemande,
    });
  } catch (error) {
    
    console.error('[Scolarité Demandes] PATCH ERROR:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    });

    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Demande introuvable.' });
    }

    if (error instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Erreur fichier: ${error.message}` });
    }

    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut.',
      details: error.message, 
    });
  }
};


const downloadDocumentOfficiel = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await prisma.document_officiel.findFirst({
      where: { id_demande: id },
      orderBy: { date_generation: 'desc' },
    });

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Aucun document officiel trouvé.' });
    }

    await prisma.document_officiel.update({
      where: { id_document_officiel: doc.id_document_officiel },
      data: {
        nombre_telechargements: { increment: 1 },
        dernier_telechargement: new Date(),
      },
    });

    res.setHeader('Content-Type', doc.type || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.nom)}"`);
    res.setHeader('Content-Length', doc.taille);
    res.send(doc.contenu);
  } catch (error) {
    console.error('[Scolarité] Download error:', error);
    return res.status(500).json({ success: false, message: 'Erreur de téléchargement.' });
  }
};
const listDocuments = async (req, res) => {
  try {
    const { id } = req.params;

    const docs = await prisma.document_officiel.findMany({
      where: { id_demande: id },
      orderBy: { date_generation: 'desc' },
      select: {
        id_document_officiel: true,
        nom: true,
        type: true,
        categorie: true,
        taille: true,
        date_generation: true,
        nombre_telechargements: true,
        dernier_telechargement: true,
      },
    });

    return res.status(200).json({
      success: true,
      count: docs.length,
      data: docs,
    });
  } catch (error) {
    console.error('[Scolarité] Failed to list documents:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des documents.',
    });
  }
};

module.exports = {
  getDemandes,
  updateDemandeStatus,
  downloadDocumentOfficiel,
  listDocuments,
  uploadDocument,
};