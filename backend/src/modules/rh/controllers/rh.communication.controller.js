require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const nodemailer = require('nodemailer');

const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.split('?')[0];
const pool = new Pool({ connectionString: cleanUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * POST /api/rh/communications/send
 * 
 * Envoie un email à un, plusieurs ou tous les employés.
 * Accepte du texte riche (HTML) et des pièces jointes.
 */
const sendRhMessage = async (req, res) => {
  try {
    // Les données envoyées via FormData (multipart/form-data)
    const { target, subject, messageBody } = req.body;
    const files = req.files || []; // Fichiers interceptés par Multer

    if (!target || !subject || !messageBody) {
      return res.status(400).json({ 
        success: false, 
        message: "Les champs cible (target), sujet et message sont requis." 
      });
    }

    // 1. Déterminer les destinataires
    let targetUsers = [];

    if (target === 'ALL') {
      // Récupérer tous les employés actifs
      const employes = await prisma.employe.findMany({
        where: { statut: 'Actif' },
        include: { utilisateur: true }
      });
      targetUsers = employes.map(e => e.utilisateur).filter(u => u && u.email);
    } else {
      // Cas de destinataires spécifiques (attendu : un tableau d'IDs JSON stringifié)
      try {
        const employeIds = JSON.parse(target);
        if (!Array.isArray(employeIds) || employeIds.length === 0) {
          throw new Error();
        }
        const employes = await prisma.employe.findMany({
          where: { id_employe: { in: employeIds } },
          include: { utilisateur: true }
        });
        targetUsers = employes.map(e => e.utilisateur).filter(u => u && u.email);
      } catch (e) {
        return res.status(400).json({ 
          success: false, 
          message: "Le format des destinataires est invalide." 
        });
      }
    }

    if (targetUsers.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Aucun destinataire valide trouvé (vérifiez les emails)." 
      });
    }

    const emailAddresses = targetUsers.map(u => u.email);

    // 2. Formater les pièces jointes pour Nodemailer
    const attachments = files.map(file => ({
      filename: file.originalname,
      content: file.buffer, // Buffer mémoire (pas de fichier physique écrit sur le disque)
      contentType: file.mimetype
    }));

    // 3. Habillage HTML professionnel du message 
    const htmlTemplate = ` <div style=" margin: 0; padding: 40px 20px; background-color: #f3f6fa; font-family: Arial, Helvetica, sans-serif; color: #374151; "> <div style=" max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08); "> <!-- Header --> <div style=" background-color: #173a63; padding: 28px 32px; text-align: center; "> <div style=" display: inline-block; padding: 8px 14px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: #ffffff; font-size: 12px; font-weight: bold; letter-spacing: 1px; "> SMARTCAMPUS </div> <h1 style=" margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; line-height: 1.3; "> Université SmartCampus </h1> <p style=" margin: 8px 0 0; color: #c9d9ea; font-size: 14px; "> Direction des Ressources Humaines </p> </div> <!-- Content --> <div style=" padding: 36px 34px; "> <!-- Subject --> <div style=" margin-bottom: 28px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb; "> <p style=" margin: 0 0 6px; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; "> Objet du message </p> <h2 style=" margin: 0; color: #172033; font-size: 21px; font-weight: 700; line-height: 1.4; "> ${subject} </h2> </div> <!-- Message --> <div style=" color: #374151; font-size: 15px; line-height: 1.75; "> ${messageBody} </div> </div> <!-- Divider --> <div style=" height: 1px; background-color: #e5e7eb; margin: 0 34px; "></div> <!-- Footer --> <div style=" padding: 24px 30px; background-color: #f8fafc; text-align: center; "> <p style=" margin: 0 0 8px; color: #475569; font-size: 12px; font-weight: 600; "> Portail RH — Université SmartCampus </p> <p style=" margin: 0; color: #94a3b8; font-size: 11px; line-height: 1.6; "> Ce message a été envoyé automatiquement depuis le portail RH SmartCampus. <br /> Merci de ne pas répondre directement à cet e-mail. </p> </div> </div> <!-- Copyright --> <p style=" margin: 18px 0 0; text-align: center; color: #94a3b8; font-size: 10px; "> © ${new Date().getFullYear()} Université SmartCampus. Tous droits réservés. </p> </div> `;

    // 4. Configuration SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.RH_SMTP_HOST,
      port: process.env.RH_SMTP_PORT,
      secure: process.env.RH_SMTP_PORT == 465,
      auth: { 
        user: process.env.RH_SMTP_USER, 
        pass: process.env.RH_SMTP_PASS 
      },
    });

    // 5. Envoi de l'email
    // On utilise "bcc" (Copie Carbone Invisible) pour protéger la confidentialité des employés !
    await transporter.sendMail({
      from: `"Ressources Humaines - SmartCampus" <${process.env.RH_SMTP_USER}>`,
      to: process.env.RH_SMTP_USER, // S'envoie à soi-même
      bcc: emailAddresses,          // Cache les adresses des employés entre eux
      subject: subject,
      html: htmlTemplate,
      attachments: attachments
    });

    // 6. Bonus Créatif : Créer une Notification In-App pour tous les destinataires
    // Cela permet aux employés de savoir qu'un email important a été envoyé, même s'ils ne consultent pas leur boîte mail immédiatement.
    const notificationsData = targetUsers.map(user => ({
      id_utilisateur: user.id_utilisateur,
      titre: "Nouveau message RH",
      message: `Le service RH a envoyé un message : "${subject}". Veuillez consulter votre boîte mail professionnelle.`,
      type: "Info",
      lu: false,
      priorite: "Info"
    }));

    if (notificationsData.length > 0) {
      await prisma.notification.createMany({
        data: notificationsData,
        skipDuplicates: true
      });
    }

    return res.status(200).json({
      success: true,
      message: `Message envoyé avec succès à ${emailAddresses.length} employé(s).`,
      count: emailAddresses.length
    });

  } catch (error) {
    console.error('[RH Communications] Erreur lors de l\'envoi du message:', error);
    return res.status(500).json({ 
      success: false, 
      message: "Une erreur est survenue lors de l'envoi de la communication." 
    });
  }
};

module.exports = {
  sendRhMessage
};