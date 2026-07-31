const pool = require("../../../config/database");

const getProfile = async (userId) => {
    const { rows } = await pool.query(
        `
        SELECT
            id_utilisateur,
            nom,
            prenom,
            email,
            telephone,
            actif
        FROM utilisateur
        WHERE id_utilisateur = $1
        `,
        [userId]
    );

    return rows[0];
};

module.exports = {
    getProfile,
};