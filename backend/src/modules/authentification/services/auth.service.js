// const pool = require("../config/database");
const pool = require("../../../config/database");
const bcrypt = require("bcrypt");
const { generateToken } = require("../utils/jwt");

const login = async (email, password) => {

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
    

  const match = await bcrypt.compare(password, user.mot_de_passe);
  
    console.log("Password match =", match);
    console.log("Password entered:", password);
    console.log("Password in DB:", user.mot_de_passe);

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
// registre

const register = async (userData) => {

    const {
        nom,
        prenom,
        email,
        password,
        telephone
    } = userData;

    // Required fields
    if (!nom || !prenom || !email || !password) {
        throw new Error("Tous les champs obligatoires doivent être remplis.");
    }

    // Check that the academic email exists
    const userResult = await pool.query(
        `SELECT * FROM utilisateur WHERE email = $1`,
        [email]
    );

    if (userResult.rows.length === 0) {
        throw new Error("Cet email n'appartient pas à SmartCampus.");
    }

    const existingUser = userResult.rows[0];

    // Account already activated
    if (existingUser.mot_de_passe) {
        throw new Error("Ce compte est déjà activé.");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Complete the account
    await pool.query(
        `
        UPDATE utilisateur
        SET
            nom = $1,
            prenom = $2,
            telephone = $3,
            mot_de_passe = $4
        WHERE email = $5
        `,
        [
            nom,
            prenom,
            telephone,
            hashedPassword,
            email
        ]
    );

    // Return the completed user
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
        WHERE email = $1
        `,
        [email]
    );

    return rows[0];
};

module.exports = {
    login,
    register
};