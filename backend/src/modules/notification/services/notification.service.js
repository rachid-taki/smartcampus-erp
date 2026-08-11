const pool = require("../../../config/database");
const { sendEmail } = require("../../../config/brevo");
const {
    demandeSoumiseTemplate,
    statutDemandeTemplate,
    documentDisponibleTemplate,
} = require("../templates/emailTemplates");

const getUserInfos = async (idUtilisateur) => {
    const { rows } = await pool.query(
        `SELECT 
            id_utilisateur, email, prenom, nom,
            notif_email, notif_demandes, notif_documents, notif_calendrier
         FROM utilisateur
         WHERE id_utilisateur = $1 AND actif = TRUE`,
        [idUtilisateur]
    );
    return rows[0] || null;
};

const notifyDemandeSoumise = async (idEtudiant, demande) => {
    try {
        const user = await getUserInfos(idEtudiant);
        if (!user) return;

        if (!user.notif_email || !user.notif_demandes) {
            console.log(`📧 Notification ignorée pour ${user.email} (préférences)`);
            return;
        }

        const html = demandeSoumiseTemplate({
            prenom: user.prenom,
            numero: demande.numero,
            type: demande.type,
            objet: demande.objet,
        });

        await sendEmail({
            to: [{ email: user.email, name: `${user.prenom} ${user.nom}` }],
            subject: `✅ Demande ${demande.numero} soumise - SmartCampus`,
            htmlContent: html,
        });
    } catch (err) {
        console.error("❌ Erreur notifyDemandeSoumise:", err.message);
    }
};

const notifyStatutDemande = async (idEtudiant, demande) => {
    try {
        const user = await getUserInfos(idEtudiant);
        if (!user) return;

        if (!user.notif_email || !user.notif_demandes) return;

        const html = statutDemandeTemplate({
            prenom: user.prenom,
            numero: demande.numero,
            type: demande.type,
            statut: demande.statut,
            commentaire: demande.commentaire,
        });

        await sendEmail({
            to: [{ email: user.email, name: `${user.prenom} ${user.nom}` }],
            subject: `📊 Votre demande ${demande.numero} : ${demande.statut} - SmartCampus`,
            htmlContent: html,
        });
    } catch (err) {
        console.error("❌ Erreur notifyStatutDemande:", err.message);
    }
};

const notifyDocumentDisponible = async (idEtudiant, document) => {
    try {
        const user = await getUserInfos(idEtudiant);
        if (!user) return;

        if (!user.notif_email || !user.notif_documents) return;

        const html = documentDisponibleTemplate({
            prenom: user.prenom,
            nomDocument: document.nom,
            categorie: document.categorie,
        });

        await sendEmail({
            to: [{ email: user.email, name: `${user.prenom} ${user.nom}` }],
            subject: `📄 Nouveau document disponible - SmartCampus`,
            htmlContent: html,
        });
    } catch (err) {
        console.error("❌ Erreur notifyDocumentDisponible:", err.message);
    }
};

const updatePreferences = async (idUtilisateur, prefs) => {
    const { rows } = await pool.query(
        `UPDATE utilisateur
         SET notif_email = $2,
             notif_demandes = $3,
             notif_documents = $4,
             notif_calendrier = $5
         WHERE id_utilisateur = $1
         RETURNING notif_email, notif_demandes, notif_documents, notif_calendrier`,
        [
            idUtilisateur,
            prefs.notifEmail ?? true,
            prefs.notifDemandes ?? true,
            prefs.notifDocuments ?? true,
            prefs.notifCalendrier ?? false,
        ]
    );
    return rows[0];
};

const getPreferences = async (idUtilisateur) => {
    const user = await getUserInfos(idUtilisateur);
    if (!user) return null;
    return {
        notifEmail: user.notif_email,
        notifDemandes: user.notif_demandes,
        notifDocuments: user.notif_documents,
        notifCalendrier: user.notif_calendrier,
    };
};

module.exports = {
    notifyDemandeSoumise,
    notifyStatutDemande,
    notifyDocumentDisponible,
    updatePreferences,
    getPreferences,
};