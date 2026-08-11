const pool = require("../../../config/database");

/**
 * Logger une action dans l'audit log
 */
const logAction = async ({
    idUtilisateur,
    action,
    module,
    entite = null,
    entiteId = null,
    adresseIp = null,
    userAgent = null,
    donneesAvant = null,
    donneesApres = null,
}) => {
    try {
        await pool.query(
            `INSERT INTO audit_log 
             (id_utilisateur, action, module, entite, entite_id, adresse_ip, user_agent, donnees_avant, donnees_apres)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                idUtilisateur,
                action,
                module,
                entite,
                entiteId,
                adresseIp,
                userAgent,
                donneesAvant ? JSON.stringify(donneesAvant) : null,
                donneesApres ? JSON.stringify(donneesApres) : null,
            ]
        );
    } catch (err) {
        console.error("❌ Erreur audit log:", err.message);
    }
};

/**
 * Récupérer les logs d'audit avec filtres
 */
const getAuditLogs = async (filters = {}) => {
    let query = `
        SELECT 
            a.id_log,
            a.action,
            a.module,
            a.entite,
            a.entite_id,
            a.adresse_ip,
            a.user_agent,
            a.donnees_avant,
            a.donnees_apres,
            a.date_action,
            u.nom,
            u.prenom,
            u.email,
            r.nom_role
        FROM audit_log a
        LEFT JOIN utilisateur u ON u.id_utilisateur = a.id_utilisateur
        LEFT JOIN role r ON r.id_role = u.id_role
        WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (filters.module) {
        query += ` AND a.module = $${paramIndex}`;
        params.push(filters.module);
        paramIndex++;
    }

    if (filters.entite) {
        query += ` AND a.entite = $${paramIndex}`;
        params.push(filters.entite);
        paramIndex++;
    }

    if (filters.action) {
        query += ` AND a.action ILIKE $${paramIndex}`;
        params.push(`%${filters.action}%`);
        paramIndex++;
    }

    if (filters.search) {
        query += ` AND (u.nom ILIKE $${paramIndex} OR u.prenom ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR a.action ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
    }

    query += ` ORDER BY a.date_action DESC LIMIT 200`;

    const { rows } = await pool.query(query, params);
    return rows;
};

/**
 * Obtenir les statistiques d'audit
 */
const getAuditStats = async () => {
    const [totalResult, todayResult, actionsResult, modulesResult] = await Promise.all([
        pool.query(`SELECT COUNT(*) as total FROM audit_log`),
        pool.query(`SELECT COUNT(*) as total FROM audit_log WHERE date_action >= CURRENT_DATE`),
        pool.query(
            `SELECT action, COUNT(*) as count 
             FROM audit_log 
             GROUP BY action 
             ORDER BY count DESC 
             LIMIT 5`
        ),
        pool.query(
            `SELECT module, COUNT(*) as count 
             FROM audit_log 
             WHERE module IS NOT NULL
             GROUP BY module 
             ORDER BY count DESC`
        ),
    ]);

    return {
        total: parseInt(totalResult.rows[0].total),
        today: parseInt(todayResult.rows[0].total),
        topActions: actionsResult.rows,
        modules: modulesResult.rows,
    };
};

module.exports = {
     logAction,
     getAuditLogs,
     getAuditStats,
     };