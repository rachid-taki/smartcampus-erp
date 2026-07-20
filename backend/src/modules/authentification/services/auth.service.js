// const pool = require("../config/database");
const pool = require("../../../config/database");
const bcrypt = require("bcrypt");
const { generateToken } = require("../utils/jwt");

const login = async (email, mot_de_passe) => {

    const query = `
        SELECT
            u.id_utilisateur,
            u.nom,
            u.prenom,
            u.email,
            u.mot_de_passe,
            u.actif,
            r.nom_role
        FROM utilisateur u
        INNER JOIN role r
            ON u.id_role = r.id_role
        WHERE u.email = $1
    `;

    const { rows } = await pool.query(query, [email]);

    if (rows.length === 0) {
        throw new Error("Email ou mot de passe incorrect.");
    }

    const user = rows[0];

    if (!user.actif) {
        throw new Error("Votre compte est désactivé.");
    }

    const match = await bcrypt.compare(
        mot_de_passe,
        user.mot_de_passe
    );

    if (!match) {
        throw new Error("Email ou mot de passe incorrect.");
    }

    await pool.query(
        `
        UPDATE utilisateur
        SET derniere_connexion = NOW()
        WHERE id_utilisateur = $1
        `,
        [user.id_utilisateur]
    );

    const token = generateToken(user);

    delete user.mot_de_passe;

    return {
        token,
        user,
    };
};
const register = async (userData) => {

    const {
        role,
        nom,
        prenom,
        email,
        mot_de_passe,
        telephone
    } = userData;
if (!role || !nom || !prenom || !email || !mot_de_passe) {
    throw new Error("Tous les champs obligatoires doivent être remplis.");
}
   const roleResult = await pool.query(
    "SELECT id_role FROM role WHERE nom_role = $1",
    [role]
);
//debugging 
// console.log("Role received:", role);
// console.log("Role query result:", roleResult.rows); 


if (roleResult.rows.length === 0) {
    throw new Error("Rôle introuvable.");
}

const id_role = roleResult.rows[0].id_role;
    const emailCheck = await pool.query(
        "SELECT * FROM utilisateur WHERE email = $1",
        [email]
    );

    if (emailCheck.rows.length > 0) {
        throw new Error("Cet email existe déjà.");
    }

   console.log(userData);
   console.log("Password =", mot_de_passe);
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

    const query = `
        INSERT INTO utilisateur(
            id_role,
            nom,
            prenom,
            email,
            mot_de_passe,
            telephone
        )
        VALUES($1,$2,$3,$4,$5,$6)
        RETURNING
            id_utilisateur,
            nom,
            prenom,
            email,
            telephone,
            actif,
            date_creation
    `;

    const values = [
        id_role,
        nom,
        prenom,
        email,
        hashedPassword,
        telephone
    ];

    const { rows } = await pool.query(query, values);

    return rows[0];

};

module.exports = {
    login,
    register
};