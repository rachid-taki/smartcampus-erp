const pool = require("../../../config/database");
const bcrypt = require("bcrypt");


const getDashboardStats = async () => {
    const [
        usersTotal,
        usersActive,
        rolesTotal,
        rolesDistribution,
        recentUsers,
        requestsByStatus,
        requestsTotal,
        reclamationsTotal,
        monthlyRegistrations,
        auditLast7Days,
        activityHeatmap,
        systemAlerts,
    ] = await Promise.all([
        pool.query(`SELECT COUNT(*) as total FROM utilisateur`),
        pool.query(`SELECT COUNT(*) as total FROM utilisateur WHERE actif = TRUE`),
        pool.query(`SELECT COUNT(*) as total FROM role`),
        pool.query(
            `SELECT r.nom_role, COUNT(u.id_utilisateur)::int as count
             FROM role r
             LEFT JOIN utilisateur u ON u.id_role = r.id_role
             GROUP BY r.nom_role
             ORDER BY count DESC`
        ),
        pool.query(
            `SELECT u.id_utilisateur, u.nom, u.prenom, u.email, u.date_creation, r.nom_role
             FROM utilisateur u
             JOIN role r ON r.id_role = u.id_role
             ORDER BY u.date_creation DESC
             LIMIT 5`
        ),
        pool.query(
            `SELECT statut, COUNT(*)::int as count FROM demande GROUP BY statut`
        ),
        pool.query(`SELECT COUNT(*)::int as total FROM demande`),
        pool.query(`SELECT COUNT(*)::int as total FROM reclamation`),
        pool.query(
            `SELECT 
                to_char(date_trunc('month', date_creation), 'YYYY-MM') as month,
                COUNT(*)::int as count
             FROM utilisateur
             WHERE date_creation >= NOW() - INTERVAL '12 months'
             GROUP BY month
             ORDER BY month ASC`
        ),
        pool.query(
            `SELECT 
                to_char(date_trunc('day', date_action), 'YYYY-MM-DD') as day,
                COUNT(*)::int as count
             FROM audit_log
             WHERE date_action >= NOW() - INTERVAL '7 days'
             GROUP BY day
             ORDER BY day ASC`
        ),
        pool.query(
            `SELECT 
                EXTRACT(DOW FROM date_action)::int as day,
                EXTRACT(HOUR FROM date_action)::int as hour,
                COUNT(*)::int as count
             FROM audit_log
             WHERE date_action >= NOW() - INTERVAL '30 days'
             GROUP BY day, hour
             ORDER BY day, hour`
        ),
        pool.query(
            `SELECT action, module, date_action, COUNT(*)::int as count
             FROM audit_log
             WHERE date_action >= NOW() - INTERVAL '24 hours'
             GROUP BY action, module, date_action
             ORDER BY date_action DESC
             LIMIT 5`
        ),
    ]);

    const totalUsers = parseInt(usersTotal.rows[0].total);
    const activeUsers = parseInt(usersActive.rows[0].total);
    const lastMonthUsers = parseInt(
        (await pool.query(
            `SELECT COUNT(*) as total FROM utilisateur 
             WHERE date_creation >= NOW() - INTERVAL '2 months' 
             AND date_creation < NOW() - INTERVAL '1 month'`
        )).rows[0].total
    );
    const currentMonthUsers = parseInt(
        (await pool.query(
            `SELECT COUNT(*) as total FROM utilisateur 
             WHERE date_creation >= NOW() - INTERVAL '1 month'`
        )).rows[0].total
    );

    return {
        kpis: {
            totalUsers,
            activeUsers,
            totalRoles: parseInt(rolesTotal.rows[0].total),
            totalRequests: parseInt(requestsTotal.rows[0].total),
            totalReclamations: parseInt(reclamationsTotal.rows[0].total),
            userGrowth: lastMonthUsers > 0
                ? Math.round(((currentMonthUsers - lastMonthUsers) / lastMonthUsers) * 100)
                : currentMonthUsers > 0 ? 100 : 0,
        },
        rolesDistribution: rolesDistribution.rows,
        recentUsers: recentUsers.rows,
        requestsByStatus: requestsByStatus.rows,
        monthlyRegistrations: monthlyRegistrations.rows.map((r) => ({
            ...r,
            label: new Date(r.month + "-01").toLocaleDateString("fr-FR", { month: "short" }),
        })),
        auditLast7Days: auditLast7Days.rows,
        activityHeatmap: activityHeatmap.rows,
        systemAlerts: systemAlerts.rows,
    };
};

// ============ GESTION UTILISATEURS ============

const getUsers = async (filters = {}) => {
    let query = `
        SELECT 
            u.id_utilisateur, u.nom, u.prenom, u.email, u.telephone,
            u.actif, u.date_creation,
            r.nom_role
        FROM utilisateur u
        JOIN role r ON r.id_role = u.id_role
        WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (filters.search) {
        query += ` AND (u.nom ILIKE $${paramIndex} OR u.prenom ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
    }

    if (filters.role) {
        query += ` AND r.nom_role = $${paramIndex}`;
        params.push(filters.role);
        paramIndex++;
    }

    if (filters.actif !== undefined && filters.actif !== "") {
        query += ` AND u.actif = $${paramIndex}`;
        params.push(filters.actif === "true");
        paramIndex++;
    }

    query += ` ORDER BY u.date_creation DESC LIMIT 100`;

    const { rows } = await pool.query(query, params);
    return rows;
};

const createUser = async (userData) => {
    const { nom, prenom, email, telephone, roleName, password } = userData;

    // Vérifier si l'email existe déjà
    const existing = await pool.query(
        `SELECT id_utilisateur FROM utilisateur WHERE email = $1`,
        [email]
    );
    if (existing.rows.length > 0) {
        throw new Error("Un utilisateur avec cet email existe déjà");
    }

    // Récupérer l'ID du rôle
    const roleResult = await pool.query(
        `SELECT id_role FROM role WHERE nom_role = $1`,
        [roleName]
    );
    if (roleResult.rows.length === 0) {
        throw new Error("Rôle introuvable");
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password || "ChangeMe@2026", 10);

    const { rows } = await pool.query(
        `INSERT INTO utilisateur (id_role, nom, prenom, email, mot_de_passe, telephone, actif, date_creation)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW())
         RETURNING id_utilisateur, nom, prenom, email, date_creation`,
        [roleResult.rows[0].id_role, nom, prenom, email, hashedPassword, telephone]
    );

    return rows[0];
};

const updateUser = async (idUtilisateur, userData) => {
    const { nom, prenom, email, telephone, roleName, actif } = userData;

    // Récupérer l'ID du rôle si fourni
    let idRole = null;
    if (roleName) {
        const roleResult = await pool.query(
            `SELECT id_role FROM role WHERE nom_role = $1`,
            [roleName]
        );
        idRole = roleResult.rows[0]?.id_role;
    }

    const { rows } = await pool.query(
        `UPDATE utilisateur
         SET nom = COALESCE($2, nom),
             prenom = COALESCE($3, prenom),
             email = COALESCE($4, email),
             telephone = COALESCE($5, telephone),
             id_role = COALESCE($6, id_role),
             actif = COALESCE($7, actif)
         WHERE id_utilisateur = $1
         RETURNING id_utilisateur, nom, prenom, email, actif`,
        [idUtilisateur, nom, prenom, email, telephone, idRole, actif]
    );

    if (rows.length === 0) throw new Error("Utilisateur introuvable");
    return rows[0];
};

const toggleUserStatus = async (idUtilisateur) => {
    const { rows } = await pool.query(
        `UPDATE utilisateur
         SET actif = NOT actif
         WHERE id_utilisateur = $1
         RETURNING id_utilisateur, actif`,
        [idUtilisateur]
    );
    if (rows.length === 0) throw new Error("Utilisateur introuvable");
    return rows[0];
};

const resetUserPassword = async (idUtilisateur, newPassword) => {
    const hashedPassword = await bcrypt.hash(newPassword || "ResetMe@2026", 10);
    const { rows } = await pool.query(
        `UPDATE utilisateur
         SET mot_de_passe = $2
         WHERE id_utilisateur = $1
         RETURNING id_utilisateur`,
        [idUtilisateur, hashedPassword]
    );
    if (rows.length === 0) throw new Error("Utilisateur introuvable");
    return { success: true };
};


const getRoles = async () => {
    const { rows } = await pool.query(
        `SELECT 
            r.id_role, r.nom_role, r.description,
            COUNT(u.id_utilisateur) as users_count
         FROM role r
         LEFT JOIN utilisateur u ON u.id_role = r.id_role
         GROUP BY r.id_role
         ORDER BY r.nom_role`
    );
    return rows;
};

const createRole = async ({ nom_role, description }) => {
    const { rows } = await pool.query(
        `INSERT INTO role (nom_role, description)
         VALUES ($1, $2)
         RETURNING *`,
        [nom_role, description]
    );
    return rows[0];
};


const getPermissions = async () => {
    const { rows } = await pool.query(
        `SELECT * FROM permission ORDER BY module, nom`
    );
    return rows;
};

const getRolePermissions = async (idRole) => {
    const { rows } = await pool.query(
        `SELECT p.id_permission
         FROM role_permission rp
         JOIN permission p ON p.id_permission = rp.id_permission
         WHERE rp.id_role = $1`,
        [idRole]
    );
    return rows.map((r) => r.id_permission);
};

const updateRolePermissions = async (idRole, permissionIds) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Supprimer toutes les permissions existantes
        await client.query(
            `DELETE FROM role_permission WHERE id_role = $1`,
            [idRole]
        );

        // Ajouter les nouvelles permissions
        for (const permId of permissionIds) {
            await client.query(
                `INSERT INTO role_permission (id_role, id_permission)
                 VALUES ($1, $2)`,
                [idRole, permId]
            );
        }

        await client.query("COMMIT");
        return { success: true };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

const getRecentActivity = async () => {
    const { rows } = await pool.query(
        `SELECT 
            a.id_log, a.action, a.module, a.entite, a.date_action,
            u.nom, u.prenom, u.email, r.nom_role
         FROM audit_log a
         LEFT JOIN utilisateur u ON u.id_utilisateur = a.id_utilisateur
         LEFT JOIN role r ON r.id_role = u.id_role
         ORDER BY a.date_action DESC
         LIMIT 15`
    );
    return rows;
};

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
    getRecentActivity,
};