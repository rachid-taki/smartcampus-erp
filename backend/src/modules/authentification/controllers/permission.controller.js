const permissionService = require("../services/permission.service");
const auditService = require("../services/audit.service");


const getAllPermissions = async (req, res) => {

    try {

        const permissions = await permissionService.getAllPermissions();

        res.json({
            success: true,
            permissions
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

const getPermissionById = async (req, res) => {

    try {

        const permission = await permissionService.getPermissionById(
            req.params.id
        );

        res.json({
            success: true,
            permission
        });

    } catch (error) {

        res.status(404).json({
            success: false,
            message: error.message
        });

    }

};
// creat permissions 
const createPermission = async (req, res) => {

    try {

        const permission = await permissionService.createPermission(req.body);
        // audit cree permissions 
          await auditService.log({
            id_utilisateur: req.user.id,
            action: "CREATE_PERMISSION",
            module: "PERMISSION",
            entite: "PERMISSION",
            entite_id: permission.id_permission,
            adresse_ip: req.ip,
            user_agent: req.headers["user-agent"],
            donnees_apres: permission
        });
        res.status(201).json({
            success: true,
            message: "Permission créée avec succès.",
            permission
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};
// update permission by id 
const updatePermission = async (req, res) => {

    try {

        const permission = await permissionService.updatePermission(
            req.params.id,
            req.body
        );
        // audit update permission 
        await auditService.log({
            id_utilisateur: req.user.id,
            action: "UPDATE_PERMISSION",
            module: "PERMISSION",
            entite: "PERMISSION",
            entite_id: permission.id_permission,
            adresse_ip: req.ip,
            user_agent: req.headers["user-agent"],
            donnees_apres: permission
        });
              
        res.json({
            success: true,
            message: "Permission modifiée avec succès.",
            permission
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};
// delet une permission par le super admin
const deletePermission = async (req, res) => {

    try {

        await permissionService.deletePermission(req.params.id);

        await auditService.log({
            id_utilisateur: req.user.id,
            action: "DELETE_PERMISSION",
            module: "PERMISSION",
            entite: "PERMISSION",
            entite_id: req.params.id,
            adresse_ip: req.ip,
            user_agent: req.headers["user-agent"]
        });
        res.json({
            success: true,
            message: "Permission supprimée avec succès."
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};
module.exports = {
    getAllPermissions,
    getPermissionById,
    createPermission,
    updatePermission,
    deletePermission
};
