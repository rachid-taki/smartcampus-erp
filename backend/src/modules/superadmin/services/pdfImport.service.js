const pdfParse = require("pdf-parse");
const XLSX = require("xlsx");
const mammoth = require("mammoth");
const AdmZip = require("adm-zip");
const bcrypt = require("bcrypt");
const pool = require("../../../config/database");

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const MAX_DEPTH = 5;
const MAX_FILES = 300;

const STOP_WORDS = new Set([
    "Email", "Mail", "Adresse", "Telephone", "Tel", "Mobile",
    "Universite", "Faculte", "Departement", "Filiere", "Niveau",
    "Etudiant", "Etudiante", "Classe", "Groupe", "Section",
    "Bac", "License", "Master", "Doctorat", "Annee", "Session",
    "Nom", "Prenom", "Date", "Naissance", "Lieu",
    "Rue", "Ville", "Pays", "Code", "Numero", "Matricule",
    "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre",
    "Rabat", "Casablanca", "Marrakech", "Fes", "Tanger", "Agadir",
    "Maroc", "Morocco", "France", "Smartcampus", "Erp",
]);

const capitalize = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// ============ EXTRACTION DEPUIS TEXTE LIBRE ============

function extractFromText(text) {
    const emails = [...new Set(text.match(EMAIL_REGEX) || [])];
    const users = [];

    for (const email of emails) {
        const emailIndex = text.indexOf(email);
        const beforeText = text.substring(Math.max(0, emailIndex - 150), emailIndex).replace(/\s+/g, " ").trim();
        const afterText = text.substring(emailIndex + email.length, emailIndex + email.length + 150).replace(/\s+/g, " ").trim();
        const context = `${beforeText} ${afterText}`;

        const namePattern = /\b([A-ZÀ-Ý][a-zà-ÿA-ZÀ-Ý\-]{1,29}(?:\s[A-ZÀ-Ý][a-zà-ÿA-ZÀ-Ý\-]{1,29})?)\b/g;
        const matches = [...context.matchAll(namePattern)];

        const names = matches
            .map((m) => m[1].trim())
            .filter((n) => n.length >= 3 && n.length <= 40 && !STOP_WORDS.has(n))
            .slice(0, 4);

        let prenom = "";
        let nom = "";

        if (names.length >= 2) {
            prenom = names[0];
            nom = names.slice(1).join(" ");
        } else if (names.length === 1) {
            const parts = email.split("@")[0].split(/[._-]/).filter((p) => p.length > 2);
            if (parts.length >= 2) {
                prenom = capitalize(parts[0]);
                nom = capitalize(parts[1]);
            } else {
                prenom = names[0];
                nom = "—";
            }
        } else {
            const parts = email.split("@")[0].split(/[._-]/).filter((p) => p.length > 2);
            prenom = parts[0] ? capitalize(parts[0]) : "Utilisateur";
            nom = parts[1] ? capitalize(parts[1]) : "Inconnu";
        }

        users.push({ email: email.toLowerCase(), prenom, nom, telephone: null, roleName: "ETUDIANT" });
    }

    return users;
}

// ============ EXTRACTION STRUCTURÉE EXCEL ============

function extractFromExcel(buffer) {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const result = { users: [], texts: [] };

    for (const sheetName of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: "" });

        let emailCol = -1, nomCol = -1, prenomCol = -1, headerIdx = -1;

        for (let i = 0; i < Math.min(rows.length, 20); i++) {
            const row = rows[i].map((c) => String(c).toLowerCase().trim());
            const e = row.findIndex((c) => c.includes("email") || c.includes("mail") || c.includes("e-mail"));
            if (e !== -1) {
                emailCol = e;
                headerIdx = i;
                nomCol = row.findIndex((c) => c.includes("nom") && !c.includes("prenom") && !c.includes("prénom"));
                prenomCol = row.findIndex((c) => c.includes("prenom") || c.includes("prénom"));
                break;
            }
        }

        if (emailCol !== -1) {
            for (let i = headerIdx + 1; i < rows.length; i++) {
                const row = rows[i];
                const email = String(row[emailCol] || "").trim().toLowerCase();
                if (!EMAIL_REGEX.test(email)) continue;
                const nom = nomCol !== -1 ? String(row[nomCol] || "").trim() : "";
                const prenom = prenomCol !== -1 ? String(row[prenomCol] || "").trim() : "";
                result.users.push({
                    email,
                    nom: nom || "—",
                    prenom: prenom || "—",
                    telephone: null,
                    roleName: "ETUDIANT",
                });
            }
        } else {
            result.texts.push(XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]));
        }
    }

    return result;
}

// ============ TRAITEMENT RÉCURSIF (ZIP imbriqués) ============

async function processBuffer(buffer, filename, depth = 0, counter = { count: 0 }) {
    const ext = (filename.split(".").pop() || "").toLowerCase();
    const result = { texts: [], users: [] };

    if (counter.count >= MAX_FILES || depth > MAX_DEPTH) return result;
    counter.count++;

    try {
        if (ext === "pdf") {
            const data = await pdfParse(buffer);
            result.texts.push(data.text);
        } else if (ext === "docx") {
            const r = await mammoth.extractRawText({ buffer });
            result.texts.push(r.value || "");
        } else if (ext === "doc") {
            result.texts.push(buffer.toString("latin1"));
        } else if (ext === "txt") {
            result.texts.push(buffer.toString("utf8"));
        } else if (["xlsx", "xls", "csv"].includes(ext)) {
            const ex = extractFromExcel(buffer);
            result.users.push(...ex.users);
            result.texts.push(...ex.texts);
        } else if (ext === "zip") {
            const zip = new AdmZip(buffer);
            for (const entry of zip.getEntries()) {
                if (entry.isDirectory) continue;
                if (counter.count >= MAX_FILES) break;
                const inner = await processBuffer(entry.getData(), entry.entryName, depth + 1, counter);
                result.texts.push(...inner.texts);
                result.users.push(...inner.users);
            }
        }
    } catch (err) {
        console.error("⚠️ Impossible de lire:", filename, err.message);
    }

    return result;
}

// ============ POINT D'ENTRÉE ============

const extractUsersFromFile = async (buffer, filename) => {
    const { texts, users } = await processBuffer(buffer, filename);
    const fromText = texts.flatMap((t) => extractFromText(t));

    const map = new Map();
    [...users, ...fromText].forEach((u) => {
        if (u.email && !map.has(u.email)) map.set(u.email, u);
    });

    return Array.from(map.values());
};

// ============ CRÉATION EN MASSE (tous rôles) ============

const bulkCreateUsers = async (usersList) => {
    const roleCache = {};
    const defaultPassword = await bcrypt.hash("ChangeMe@2026", 10);
    const results = { created: [], skipped: [], failed: [] };

    for (const u of usersList) {
        try {
            const roleName = u.roleName || "ETUDIANT";

            if (!roleCache[roleName]) {
                const r = await pool.query(`SELECT id_role FROM role WHERE nom_role = $1`, [roleName]);
                roleCache[roleName] = r.rows[0]?.id_role || null;
            }
            const idRole = roleCache[roleName];
            if (!idRole) {
                results.failed.push({ email: u.email, reason: `Rôle ${roleName} introuvable` });
                continue;
            }

            const existing = await pool.query(
                `SELECT id_utilisateur FROM utilisateur WHERE email = $1`,
                [u.email]
            );
            if (existing.rows.length > 0) {
                results.skipped.push({ email: u.email, reason: "Email déjà existant" });
                continue;
            }

            const { rows } = await pool.query(
                `INSERT INTO utilisateur (id_role, nom, prenom, email, telephone, mot_de_passe, actif, date_creation)
                 VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW())
                 RETURNING id_utilisateur, email, nom, prenom`,
                [idRole, u.nom, u.prenom, u.email, u.telephone, defaultPassword]
            );

            results.created.push(rows[0]);
        } catch (err) {
            results.failed.push({ email: u.email, reason: err.message });
        }
    }

    return results;
};

module.exports = { 
     extractUsersFromFile,
     bulkCreateUsers,
    
    };