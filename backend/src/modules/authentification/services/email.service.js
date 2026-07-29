const apiInstance = require("../../../config/mailer");

const sendOtp = async (email, otp) => {
    await apiInstance.sendTransacEmail({
        sender: {
            name: process.env.BREVO_SENDER_NAME,
            email: process.env.BREVO_SENDER_EMAIL,
        },

        to: [
            {
                email,
            },
        ],

        subject: "Code de réinitialisation du mot de passe",

        htmlContent: `
            <h2>SmartCampus ERP</h2>

            <p>Votre code OTP est :</p>

            <h1 style="letter-spacing:4px;">${otp}</h1>

            <p>Ce code expire dans 10 minutes.</p>
        `,
    });
};

module.exports = {
    sendOtp,
};