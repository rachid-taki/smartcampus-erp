const mailer = require("./mailer");


const sendEmail = async ({ to, subject, htmlContent, textContent }) => {
    try {
        if (!process.env.BREVO_API_KEY) {
            console.warn("⚠️ BREVO_API_KEY non configurée, email non envoyé");
            return { success: false, error: "API key manquante" };
        }

        const emailData = {
            sender: {
                name: "SmartCampus ERP",
                email: process.env.BREVO_SENDER_EMAIL || "noreply@smartcampus.ma",
            },
            to,
            subject,
            htmlContent,
        };

        if (textContent) {
            emailData.textContent = textContent;
        }

        const response = await mailer.sendTransacEmail(emailData);

        console.log("✅ Email envoyé via Brevo:", response.messageId);
        return { success: true, messageId: response.messageId };
    } catch (err) {
        console.error("❌ Erreur Brevo:", err.response?.body || err.message);
        return { success: false, error: err.message };
    }
};

module.exports = { sendEmail };