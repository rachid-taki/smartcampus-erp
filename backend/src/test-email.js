require("dotenv").config();
const { sendEmail } = require("./config/brevo");

(async () => {
    const result = await sendEmail({
        to: [{ email: "rachidtaki941@gmail.com", name: "Test" }],
        subject: "🧪 Test SmartCampus",
        htmlContent: "<h1>Ça marche ! 🎉</h1><p>Test d'envoi Brevo réussi.</p>",
    });
    console.log("Résultat:", result);
})();