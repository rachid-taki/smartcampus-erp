// const pool = require("../config/database");
const pool = require("../../../config/database");

const log = async ({
    id_utilisateur = null,
    action,
    module,
    entite,
    entite_id = null,
    adresse_ip = null,
    user_agent = null,
    donnees_avant = null,
    donnees_apres = null
}) => {

    await pool.query(
        `
        INSERT INTO audit_log (
            id_utilisateur,
            action,
            module,
            entite,
            entite_id,
            adresse_ip,
            user_agent,
            donnees_avant,
            donnees_apres
        )
        VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9
        )
        `,
        [
            id_utilisateur,
            action,
            module,
            entite,
            entite_id,
            adresse_ip,
            user_agent,
            donnees_avant,
            donnees_apres
        ]
    );

};
const getAllLogs = async () => {

    const { rows } = await pool.query(`
        SELECT
            a.id_log,
            a.action,
            a.module,
            a.entite,
            a.entite_id,
            a.date_action,
            a.adresse_ip,
            u.nom,
            u.prenom,
            u.email
        FROM audit_log a
        LEFT JOIN utilisateur u
            ON a.id_utilisateur = u.id_utilisateur
        ORDER BY a.date_action DESC
    `);

    return rows;

};

const getLogById = async (id) => {

    const { rows } = await pool.query(
        `
        SELECT *
        FROM audit_log
        WHERE id_log = $1
        `,
        [id]
    );

    if (rows.length === 0) {
        throw new Error("Log introuvable.");
    }

    return rows[0];

};

module.exports = {
    log,
    getAllLogs,
    getLogById
};