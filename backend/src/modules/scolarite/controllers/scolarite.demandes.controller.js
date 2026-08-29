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

const nodemailer = require('nodemailer');

// Configuration du transporteur d'e-mails (se connecte à votre Gmail)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true pour le port 465, false pour 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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
    const { statut, search, tab } = req.query;
    const where = {};

    // Gestion par onglets du Frontend (En Cours vs Historique)
    if (tab === 'historique') {
      where.statut = { in: ['Cloturee', 'Rejetee'] }; // Cloturee = Servée
    } else if (tab === 'actives') {
      where.statut = { in: ['Soumise', 'En_Traitement', 'Validee'] };
    } else if (statut) {
      if (!VALID_STATUTS.includes(statut)) {
        return res.status(400).json({ success: false, message: `Statut invalide: "${statut}".` });
      }
      where.statut = statut;
    }

    if (search) {
      where.OR = [
        { numero: { contains: search, mode: 'insensitive' } },
        { objet: { contains: search, mode: 'insensitive' } },
        { 
          etudiant: {
            utilisateur: {
              OR: [
                { nom: { contains: search, mode: 'insensitive' } },
                { prenom: { contains: search, mode: 'insensitive' } }
              ]
            }
          }
        }
      ];
    }

    const demandes = await prisma.demande.findMany({
      where,
      orderBy: { date_creation: 'desc' },
      include: {
        type_demande: {
          select: { id_type: true, libelle: true, code: true },
        },
        // INJECTION DES DETAILS COMPLETS DE L'ETUDIANT
        etudiant: {
          include: {
            utilisateur: {
              select: { nom: true, prenom: true, email: true, telephone: true }
            },
            filiere: {
              select: { nom: true, code: true }
            }
          }
        },
        documents_officiels: {
          select: { id_document_officiel: true, nom: true, date_generation: true },
          take: 1,
          orderBy: { date_generation: 'desc' },
        },
      },
    });

    return res.status(200).json({ success: true, count: demandes.length, data: demandes });
  } catch (error) {
    console.error('[Scolarité Demandes] Failed to fetch:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des demandes.' });
  }
};

const updateDemandeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const statut = req.body?.statut;
    const commentaires = req.body?.commentaires;
    const fichier = req.file; 
    
    // Nouvelles options de délivrance
    const sendEmail = String(req.body?.sendEmail) === 'true';
    const collectBureau = String(req.body?.collectBureau) === 'true';

    if (!statut) return res.status(400).json({ success: false, message: 'Le champ "statut" est requis.' });
    if (!VALID_STATUTS.includes(statut)) return res.status(400).json({ success: false, message: `Statut invalide: "${statut}".` });

    const existingDemande = await prisma.demande.findUnique({
      where: { id_demande: id },
      include: { 
        etudiant: { include: { utilisateur: true } }, 
        type_demande: true 
      },
    });

    if (!existingDemande) return res.status(404).json({ success: false, message: `Aucune demande avec l'id "${id}".` });

    const idTraitePar = (req.user && req.user.id_scolarite) || null;
    const updateData = { statut };
    
    if (idTraitePar) updateData.id_traite_par = idTraitePar;
    if (commentaires !== undefined && commentaires !== '') updateData.commentaires = commentaires;

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

        documentOfficiel = await prisma.documentOfficiel.create({
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
      } catch (docError) {
        console.error('[Scolarité] Erreur création document_officiel:', docError);
      }
    }

    // --- GESTION DES NOTIFICATIONS ET EMAILS ---
    if (statut === 'Validee' && (sendEmail || collectBureau)) {
      let notificationMsg = `Votre demande "${existingDemande.objet}" a été validée. `;
      
      if (sendEmail && collectBureau) {
        notificationMsg += `Le document a été envoyé sur votre e-mail académique et la version originale est disponible au bureau de l'administration.`;
      } else if (sendEmail) {
        notificationMsg += `Le document a été envoyé sur votre e-mail académique.`;
      } else if (collectBureau) {
        notificationMsg += `Veuillez vous présenter au bureau de l'administration pour récupérer votre document.`;
      }

      if (commentaires) {
        notificationMsg += `\n\nMot de l'administration : ${commentaires}`;
      }

      // 1. Création de la notification dans la base de données
      await prisma.notification.create({
        data: {
          id_utilisateur: existingDemande.id_etudiant,
          titre: `Demande Validée : ${existingDemande.numero}`,
          message: notificationMsg,
          type: 'Document', // Basé sur enum_type_notification
          priorite: 'Info'
        }
      });

      // 2. Envoi RÉEL de l'e-mail avec Nodemailer
      if (sendEmail) {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
          console.error("[EMAIL] ❌ Erreur : Identifiants SMTP manquants dans le fichier .env");
        } else {
          try {
            console.log(`[EMAIL] ⏳ Préparation de l'envoi à : ${existingDemande.etudiant.utilisateur.email}`);
            
            // Préparation du message
            const mailOptions = {
              from: `"Scolarité SmartCampus" <${process.env.SMTP_USER}>`,
              to: existingDemande.etudiant.utilisateur.email,
              subject: `Mise à jour de votre demande : ${existingDemande.numero}`,
              text: notificationMsg,
            };

            // S'il y a un fichier téléversé, on l'attache directement depuis la mémoire
            if (fichier) {
              mailOptions.attachments = [
                {
                  filename: (documentOfficiel && documentOfficiel.nom) || fichier.originalname || 'document.pdf',
                  content: fichier.buffer, 
                  contentType: fichier.mimetype
                }
              ];
            }

            // Envoi de l'e-mail
            const info = transporter.sendMail(mailOptions);
            console.log(`[EMAIL] ✅ E-mail envoyé avec succès ! (ID: ${info.messageId})`);
          } catch (mailError) {
            console.error(`[EMAIL] ❌ Échec de l'envoi de l'e-mail :`, mailError);
            // On ne fait pas planter la requête (return res.status(500)) juste parce que l'e-mail a échoué.
            // On affiche l'erreur dans la console, mais on confirme la validation côté frontend.
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: statut === 'Cloturee' 
        ? 'Demande marquée comme servée / clôturée avec succès.' 
        : 'Statut mis à jour et notifications envoyées avec succès.',
      data: updatedDemande,
    });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Demande introuvable.' });
    if (error instanceof multer.MulterError) return res.status(400).json({ success: false, message: `Erreur fichier: ${error.message}` });
    return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du statut.', details: error.message });
  }
};

const downloadDocumentOfficiel = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await prisma.documentOfficiel.findFirst({
      where: { id_demande: id },
      orderBy: { date_generation: 'desc' },
    });

    if (!doc) return res.status(404).json({ success: false, message: 'Aucun document officiel trouvé.' });

    await prisma.documentOfficiel.update({
      where: { id_document_officiel: doc.id_document_officiel },
      data: { nombre_telechargements: { increment: 1 }, dernier_telechargement: new Date() },
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
    const docs = await prisma.documentOfficiel.findMany({
      where: { id_demande: id },
      orderBy: { date_generation: 'desc' },
      select: {
        id_document_officiel: true, nom: true, type: true, categorie: true,
        taille: true, date_generation: true, nombre_telechargements: true, dernier_telechargement: true,
      },
    });
    return res.status(200).json({ success: true, count: docs.length, data: docs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des documents.' });
  }
};

module.exports = { getDemandes, updateDemandeStatus, downloadDocumentOfficiel, listDocuments, uploadDocument };