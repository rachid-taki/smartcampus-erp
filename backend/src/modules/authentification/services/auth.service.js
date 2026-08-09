// const pool = require("../config/database");
const pool = require("../../../config/database");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
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
            r.nom_role AS role
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

// password recovery 

const generateResetOtp = async (email) => {

    // Verify that the email exists
    const userResult = await pool.query(
        `
        SELECT id_utilisateur, email
        FROM utilisateur
        WHERE email = $1
        `,
        [email]
    );

    if (userResult.rows.length === 0) {
        throw new Error("Aucun compte n'est associé à cet email.");
    }

    const user = userResult.rows[0];

    // Generate a random 6-digit OTP
   const otp = crypto.randomInt(100000, 999999).toString();

    const hashedOtp = await bcrypt.hash(otp, 10);

    // Expiration time (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete previous unused OTPs
    await pool.query(
        `
        DELETE FROM password_reset_tokens
        WHERE id_utilisateur = $1
        `,
        [user.id_utilisateur]
    );

    // Save the new OTP
    await pool.query(
        `
        INSERT INTO password_reset_tokens
        (
            id_utilisateur,
            otp,
            expires_at
        )
        VALUES ($1,$2,$3)
        `,
        [
            user.id_utilisateur,
            hashedOtp,
            expiresAt
        ]
    );

    return otp;
};
const verifyOtp = async (email, otp) => {

    const { rows } = await pool.query(
        `
        SELECT
            prt.id,
            prt.otp,
            prt.expires_at,
            u.id_utilisateur
        FROM password_reset_tokens prt
        JOIN utilisateur u
            ON prt.id_utilisateur = u.id_utilisateur
        WHERE u.email = $1
        `,
        [email]
    );

    if (rows.length === 0) {
        throw new Error("Code OTP invalide.");
    }

    const token = rows[0];

    if (new Date() > token.expires_at) {
        throw new Error("Le code OTP a expiré.");
    }

    const valid = await bcrypt.compare(
        otp,
        token.otp
    );

    if (!valid) {
        throw new Error("Code OTP incorrect.");
    }

    return true;
};
const resetPassword = async (
    email,
    otp,
    password
) => {

    // Verify OTP first
    await verifyOtp(email, otp);

    const hashedPassword = await bcrypt.hash(
        password,
        10
    );

    const { rows } = await pool.query(
        `
        SELECT id_utilisateur
        FROM utilisateur
        WHERE email = $1
        `,
        [email]
    );

    const user = rows[0];

    await pool.query(
        `
        UPDATE utilisateur
        SET mot_de_passe = $1
        WHERE id_utilisateur = $2
        `,
        [
            hashedPassword,
            user.id_utilisateur
        ]
    );

    // Delete OTP after use
    await pool.query(
        `
        DELETE FROM password_reset_tokens
        WHERE id_utilisateur = $1
        `,
        [user.id_utilisateur]
    );

    return true;
};

module.exports = {
    login,
    register,
    generateResetOtp,
    verifyOtp,
    resetPassword
};