const rolePermissionService = require("../services/rolePermission.service");
const auditService = require("../services/audit.service");


const assignPermissions = async (req, res) => {

    try {

        await rolePermissionService.assignPermissions(
            req.params.id,
            req.body.permissions
        );
        await auditService.log({
            id_utilisateur: req.user.id,
            action: "ASSIGN_PERMISSION",
            module: "RBAC",
            entite: "ROLE",
            entite_id: req.params.id,
            adresse_ip: req.ip,
            user_agent: req.headers["user-agent"],
            donnees_apres: req.body
        });
        res.json({
            success: true,
            message: "Permissions attribuées avec succès."
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};
// get role permissions 
const getRolePermissions = async (req, res) => {

    try {

        const permissions = await rolePermissionService.getRolePermissions(
            req.params.id
        );

        res.json({
            success: true,
            permissions
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};
module.exports = {
    assignPermissions,
    getRolePermissions
};