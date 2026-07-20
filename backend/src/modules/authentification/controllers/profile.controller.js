const profileService = require("../services/profile.service");



const getProfile = async (req, res) => {

    try {

        const profile = await profileService.getProfile(req.user.id);
        
        res.json({
            success: true,
            profile
        });

    } catch (error) {

        res.status(404).json({
            success: false,
            message: error.message
        });

    }

};
// update profile 
const updateProfile = async (req, res) => {

    try {

        const profile = await profileService.updateProfile(
            req.user.id,
            req.body
        );
        await auditService.log({
            id_utilisateur: req.user.id,
            action: "UPDATE_PROFILE",
            module: "PROFILE",
            entite: "UTILISATEUR",
            entite_id: req.user.id,
            adresse_ip: req.ip,
            user_agent: req.headers["user-agent"],
            donnees_apres: profile
        });
        const auditService = require("../services/audit.service");

        res.json({
            success: true,
            message: "Profil mis à jour avec succès.",
            profile
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};
// change password 
const changePassword = async (req, res) => {

    try {

        await profileService.changePassword(
            req.user.id,
            req.body
        );
        // audit 
        await auditService.log({
            id_utilisateur: req.user.id,
            action: "CHANGE_PASSWORD",
            module: "PROFILE",
            entite: "UTILISATEUR",
            entite_id: req.user.id,
            adresse_ip: req.ip,
            user_agent: req.headers["user-agent"]
        });
        res.json({
            success: true,
            message: "Mot de passe modifié avec succès."
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};
module.exports = {
    getProfile,
    updateProfile,
    changePassword
};