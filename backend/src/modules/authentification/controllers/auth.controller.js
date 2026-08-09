const authService = require("../services/auth.service");
const auditService = require("../services/audit.service");
const { sendOtp } = require("../services/email.service");


const login = async (req, res) => {
    try {
       
        const { email, password  } = req.body;

        if (!email || !password ) {
            return res.status(400).json({
                success: false,
                message: "Email et mot de passe sont obligatoires."
            });
        }

        const result = await authService.login(email, password );
        await auditService.log({
                id_utilisateur: result.user.id_utilisateur,
                action: "LOGIN",
                module: "AUTH",
                entite: "UTILISATEUR",
                entite_id: result.user.id_utilisateur,
                adresse_ip: req.ip,
                user_agent: req.headers["user-agent"],
                donnees_apres: {
                    email: result.user.email
    }
});
        res.status(200).json({
            success: true,
            message: "Connexion réussie.",
            token: result.token,
            user: result.user,
            role: result.user.role
        });

    } catch (error) {
        console.error(error);
        res.status(401).json({
            success: false,
            message: error.message
        });

    }
};

const register = async (req, res) => {

    try {

        const user = await authService.register(req.body);
        await auditService.log({
                id_utilisateur: user.id_utilisateur,
                action: "REGISTER",
                module: "AUTH",
                entite: "UTILISATEUR",
                entite_id: user.id_utilisateur,
                adresse_ip: req.ip,
                user_agent: req.headers["user-agent"],
                donnees_apres: user
            });
        res.status(201).json({
            success: true,
            message: "Utilisateur créé avec succès.",
            user
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const forgotPassword = async (req, res) => {

    try {

        console.log("BODY:", req.body);

        const { email } = req.body;

        const otp = await authService.generateResetOtp(email);

        console.log("OTP generated:", otp);

        await sendOtp(email, otp);

        console.log("Email sent successfully.");

        res.status(200).json({
            success: true,
            message: "Le code OTP a été envoyé."
        });

    } catch (error) {

        console.error("Forgot password error:", error);

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const verifyOtp = async (req, res) => {
    try {

         console.log("VERIFY BODY:", req.body);
         
        const { email, otp } = req.body;

        await authService.verifyOtp(email, otp);


        const result = await authService.verifyOtp(email, otp);
        console.log("VERIFY RESULT:", result);

        res.status(200).json({
            success: true,
            message: "OTP valide."
        });

    } catch (error) {

        console.error("VERIFY ERROR:", error);

        res.status(400).json({
            success: false,
            message: error.message
        });

    }
};

const resetPassword = async (req, res) => {
    try {

        const { email, otp, password } = req.body;

        await authService.resetPassword(
            email,
            otp,
            password
        );

        res.status(200).json({
            success: true,
            message: "Mot de passe réinitialisé."
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }
};

module.exports = {
    login,
    register,
    forgotPassword,
    verifyOtp,
    resetPassword
};