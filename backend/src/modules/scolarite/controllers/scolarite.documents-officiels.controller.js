require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.split('?')[0];
const pool = new Pool({ connectionString: cleanUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// GET: List all official documents (Excluding the BYTEA buffer to keep the API fast)
const getOfficialDocuments = async (req, res) => {
  try {
    const docs = await prisma.documentOfficiel.findMany({
      orderBy: { date_generation: 'desc' },
      select: {
        id_document_officiel: true,
        id_demande: true,
        id_etudiant: true,
        nom: true,
        type: true,
        categorie: true,
        taille: true,
        hash: true,
        date_generation: true,
        nombre_telechargements: true,
      }
    });
    return res.status(200).json({ success: true, count: docs.length, data: docs });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// GET: Download the actual BYTEA file and increment the download counter
const downloadOfficialDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await prisma.documentOfficiel.findUnique({ 
      where: { id_document_officiel: id } 
    });

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document introuvable.' });
    }

    // Increment download tracking
    await prisma.documentOfficiel.update({
      where: { id_document_officiel: id },
      data: { 
        nombre_telechargements: { increment: 1 }, 
        dernier_telechargement: new Date() 
      }
    });

    // Send the binary buffer to the browser
    res.setHeader('Content-Type', doc.type || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.nom}"`);
    return res.send(doc.contenu);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Erreur de téléchargement.' });
  }
};

module.exports = { getOfficialDocuments, downloadOfficialDocument };