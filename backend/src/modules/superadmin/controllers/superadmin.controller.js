const superadminService = require("../services/superadmin.service");
const auditService = require("../services/audit.service"); 
const { getClientIp, getUserAgent } = require("../../../utils/request");
const importService = require("../services/pdfImport.service");  




const getDashboardStats = async (req, res) => {
    try {
        const stats = await superadminService.getDashboardStats();
        res.json({ success: true, stats });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await superadminService.getUsers(req.query);
        res.json({ success: true, users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const createUser = async (req, res) => {
    try {
        const user = await superadminService.createUser(req.body);
        
        await auditService.logAction({
            idUtilisateur: req.user.id,
            action: "CREATE",
            module: "Utilisateurs",
            entite: "UTILISATEUR",
            entiteId: user.id_utilisateur,
            adresseIp: getClientIp(req),
            userAgent: getUserAgent(req),
            donneesApres: {
                email: user.email,
                nom: user.nom,
                prenom: user.prenom,
                role: req.body.roleName,
            },
        });
        
        res.status(201).json({ success: true, user });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};


const updateUser = async (req, res) => {
    try {
        const user = await superadminService.updateUser(req.params.id, req.body);
        res.json({ success: true, user });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const toggleUserStatus = async (req, res) => {
    try {
        const result = await superadminService.toggleUserStatus(req.params.id);
        
        await auditService.logAction({
            idUtilisateur: req.user.id,
            action: "UPDATE",
            module: "Utilisateurs",
            entite: "UTILISATEUR",
            entiteId: req.params.id,
            adresseIp: getClientIp(req),
            userAgent: getUserAgent(req),
            donneesAvant: { statut: !result.actif },
            donneesApres: { statut: result.actif },
        });
        
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const resetUserPassword = async (req, res) => {
    try {
        await superadminService.resetUserPassword(req.params.id, req.body.newPassword);
        res.json({ success: true, message: "Mot de passe réinitialisé" });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const getRoles = async (req, res) => {
    try {
        const roles = await superadminService.getRoles();
        res.json({ success: true, roles });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const createRole = async (req, res) => {
    try {
        const role = await superadminService.createRole(req.body);
        
        await auditService.logAction(
            req.user.id,
            "CREATION",
            "UTILISATEUR",
            role.id_role,
            { roleName: role.nom_role }
        );
        
        res.status(201).json({ success: true, role });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const getPermissions = async (req, res) => {
    try {
        const permissions = await superadminService.getPermissions();
        res.json({ success: true, permissions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getRolePermissions = async (req, res) => {
    try {
        const permissions = await superadminService.getRolePermissions(req.params.id);
        res.json({ success: true, permissions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const updateRolePermissions = async (req, res) => {
    try {
        const oldPerms = await superadminService.getRolePermissions(req.params.id);
        
        await superadminService.updateRolePermissions(req.params.id, req.body.permissionIds);
        
        await auditService.logAction({
            idUtilisateur: req.user.id,
            action: "UPDATE",
            module: "Permissions",
            entite: "ROLE",
            entiteId: req.params.id,
            adresseIp: getClientIp(req),
            userAgent: getUserAgent(req),
            donneesAvant: { permissions: oldPerms },
            donneesApres: { permissions: req.body.permissionIds },
        });
        
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const getAuditLogs = async (req, res) => {
    try {
        const logs = await auditService.getAuditLogs(req.query);
        res.json({ success: true, logs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getAuditStats = async (req, res) => {
    try {
        const stats = await auditService.getAuditStats();
        res.json({ success: true, stats });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};



const extractUsersFromFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Aucun fichier reçu" });
        }
        const allowed = ["pdf", "doc", "docx", "xls", "xlsx", "csv", "zip", "txt"];
        const ext = (req.file.originalname.split(".").pop() || "").toLowerCase();
        if (!allowed.includes(ext)) {
            return res.status(400).json({ success: false, message: "Format non supporté (PDF, DOC, DOCX, XLS, XLSX, CSV, ZIP, TXT)" });
        }

        const users = await importService.extractUsersFromFile(req.file.buffer, req.file.originalname);
        res.json({ success: true, students: users, count: users.length });
    } catch (err) {
        console.error("❌ Erreur extraction:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

const bulkCreateUsers = async (req, res) => {
    try {
        const { students } = req.body;
        if (!Array.isArray(students) || students.length === 0) {
            return res.status(400).json({ success: false, message: "Liste vide" });
        }

        const results = await importService.bulkCreateUsers(students);

        await auditService.logAction({
            idUtilisateur: req.user.id,
            action: "CREATE",
            module: "Utilisateurs",
            entite: "UTILISATEUR",
            adresseIp: req.headers["x-forwarded-for"]?.split(",")[0] || req.ip,
            userAgent: req.headers["user-agent"],
            donneesApres: {
                bulkImport: true,
                created: results.created.length,
                skipped: results.skipped.length,
                failed: results.failed.length,
            },
        });

        res.json({ success: true, results });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// controller
const getRecentActivity = async (req, res) => {
    try {
        const activity = await superadminService.getRecentActivity();
        res.json({ success: true, activity });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// route


// module.exports : ajouter getRecentActivity




module.exports = {
    getDashboardStats,
    getUsers,
    createUser,
    updateUser,
    toggleUserStatus,
    resetUserPassword,
    getRoles,
    createRole,
    getPermissions,
    getRolePermissions,
    updateRolePermissions,
    getAuditLogs,
    getAuditStats,  
    extractUsersFromFile,
    bulkCreateUsers,
    getRecentActivity,
};