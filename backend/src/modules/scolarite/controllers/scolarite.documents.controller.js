require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.split('?')[0];
const pool = new Pool({ connectionString: cleanUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const multer = require('multer');

// Configuration Multer (Stockage en mémoire, Max 10 Mo)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const uploadMiddleware = upload.single('fichier');

const getDocuments = async (req, res) => {
  try {
    const { id_demande, id_reclamation } = req.query;

    if (id_demande && id_reclamation) {
      return res.status(400).json({ success: false, message: 'Filtrez par id_demande OU id_reclamation, pas les deux.' });
    }

    const where = {};
    if (id_demande) where.id_demande = id_demande;
    if (id_reclamation) where.id_reclamation = id_reclamation;

    const documents = await prisma.document.findMany({
      where,
      orderBy: { date_upload: 'desc' },
      // On exclut le champ `contenu` (binaire) pour ne pas alourdir la réponse JSON
      select: {
        id_document: true,
        id_demande: true,
        id_reclamation: true,
        nom: true,
        type: true,
        taille: true,
        hash: true,
        version: true,
        date_upload: true,
        telecharge: true,
      }
    });

    return res.status(200).json({ success: true, count: documents.length, data: documents });
  } catch (error) {
    console.error('[Scolarité Documents] Erreur fetch:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des documents.' });
  }
};

const createDocument = async (req, res) => {
  try {
    const fichier = req.file;
    const { id_demande, isOfficial, categorie, message } = req.body;

    if (!fichier) return res.status(400).json({ success: false, message: 'Aucun fichier sélectionné.' });
    if (!id_demande) return res.status(400).json({ success: false, message: 'La sélection d\'une demande est obligatoire.' });

    // Récupérer la demande pour lier correctement l'étudiant
    const demande = await prisma.demande.findUnique({
      where: { id_demande },
      include: { etudiant: { include: { utilisateur: true } } }
    });

    if (!demande) return res.status(404).json({ success: false, message: 'Demande introuvable.' });

    let newDocMetadata;
    const isDocOfficial = isOfficial === 'true';

    // 1. Insertion selon le type de document
    if (isDocOfficial) {
      const newOfficiel = await prisma.documentOfficiel.create({
        data: {
          id_demande,
          id_etudiant: demande.id_etudiant,
          nom: fichier.originalname,
          type: fichier.mimetype,
          taille: fichier.size,
          contenu: fichier.buffer,
          categorie: categorie || 'Autre',
        }
      });
      const { contenu, ...meta } = newOfficiel;
      newDocMetadata = meta;
    } else {
      const newSoumis = await prisma.document.create({
        data: {
          id_demande,
          nom: fichier.originalname,
          type: fichier.mimetype,
          taille: fichier.size,
          contenu: fichier.buffer,
        }
      });
      const { contenu, ...meta } = newSoumis;
      newDocMetadata = meta;
    }

    // 2. Création du message / notification si renseigné
    if (message && message.trim() !== '') {
      await prisma.notification.create({
        data: {
          id_utilisateur: demande.id_etudiant,
          titre: isDocOfficial ? `Nouveau document officiel : ${fichier.originalname}` : "Nouveau document ajouté à votre dossier",
          message: `Un document a été joint à votre demande #${demande.numero}.\n\nMessage de l'administration : ${message.trim()}`,
          type: 'Document',
          priorite: 'Info'
        }
      });
    }

    return res.status(201).json({
      success: true,
      message: isDocOfficial ? 'Document officiel généré et sauvegardé.' : 'Document soumis enregistré avec succès.',
      data: newDocMetadata,
    });
  } catch (error) {
    console.error('[Scolarité Documents] Erreur création:', error);
    return res.status(500).json({ success: false, message: "Erreur lors de l'enregistrement du document." });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.document.delete({ where: { id_document: id } });
    return res.status(200).json({ success: true, message: 'Document supprimé avec succès.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Document introuvable.' });
    return res.status(500).json({ success: false, message: 'Erreur lors de la suppression.' });
  }
};

// Nouvelle route pour télécharger un document standard (Documents Soumis)
const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await prisma.document.findUnique({ where: { id_document: id } });

    if (!doc) return res.status(404).json({ success: false, message: 'Document introuvable.' });

    res.setHeader('Content-Type', doc.type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.nom)}"`);
    res.setHeader('Content-Length', doc.taille);
    res.send(doc.contenu);
  } catch (error) {
    console.error('[Scolarité Documents] Erreur téléchargement:', error);
    return res.status(500).json({ success: false, message: 'Erreur de téléchargement.' });
  }
};

module.exports = { getDocuments, createDocument, deleteDocument, downloadDocument, uploadMiddleware };