// const pool = require("../config/database");
const pool = require("../../../config/database");
const getProfile = async (id) => {

    const { rows } = await pool.query(
        `
        SELECT
            u.id_utilisateur,
            u.nom,
            u.prenom,
            u.email,
            u.telephone,
            u.photo,
            r.nom_role
        FROM utilisateur u
        INNER JOIN role r
            ON u.id_role = r.id_role
        WHERE u.id_utilisateur = $1
        `,
        [id]
    );

    if (rows.length === 0) {
        throw new Error("Utilisateur introuvable.");
    }

    return rows[0];
};
// update profile 
const updateProfile = async (id, data) => {

    const {
        nom,
        prenom,
        telephone,
        photo
    } = data;

    const { rows } = await pool.query(
        `
        UPDATE utilisateur
        SET
            nom = $1,
            prenom = $2,
            telephone = $3,
            photo = $4
        WHERE id_utilisateur = $5
        RETURNING
            id_utilisateur,
            nom,
            prenom,
            email,
            telephone,
            photo
        `,
        [
            nom,
            prenom,
            telephone,
            photo,
            id
        ]
    );

    if (rows.length === 0) {
        throw new Error("Utilisateur introuvable.");
    }

    return rows[0];
};
// change password 
const bcrypt = require("bcrypt");

const changePassword = async (id, data) => {

    const {
        ancienMotDePasse,
        nouveauMotDePasse
    } = data;

    const result = await pool.query(
        `
        SELECT mot_de_passe
        FROM utilisateur
        WHERE id_utilisateur = $1
        `,
        [id]
    );

    if (result.rows.length === 0) {
        throw new Error("Utilisateur introuvable.");
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(
        ancienMotDePasse,
        user.mot_de_passe
    );

    if (!match) {
        throw new Error("Ancien mot de passe incorrect.");
    }

    const hash = await bcrypt.hash(
        nouveauMotDePasse,
        10
    );

    await pool.query(
        `
        UPDATE utilisateur
        SET mot_de_passe = $1
        WHERE id_utilisateur = $2
        `,
        [hash, id]
    );

    return;
};
module.exports = {
    getProfile,
    updateProfile,
    changePassword
};