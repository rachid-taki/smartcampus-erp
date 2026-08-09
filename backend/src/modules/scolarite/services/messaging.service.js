const pool = require("../../../config/database");

const getAllConversations = async () => {
    const { rows } = await pool.query(
        `SELECT 
            c.id_conversation,
            c.sujet,
            c.date_creation,
            c.statut,
            c.id_etudiant,
            u.prenom AS etudiant_prenom,
            u.nom AS etudiant_nom,
            u.email AS etudiant_email,
            e.cne,
            e.cin,
            e.niveau,
            f.code AS filiere_nom,
            (SELECT m.contenu FROM message m
             WHERE m.id_conversation = c.id_conversation
             ORDER BY m.date_envoi DESC LIMIT 1) AS dernier_message,
            (SELECT m.date_envoi FROM message m
             WHERE m.id_conversation = c.id_conversation
             ORDER BY m.date_envoi DESC LIMIT 1) AS derniere_activite,
            (SELECT COUNT(*) FROM message m
             WHERE m.id_conversation = c.id_conversation
             AND m.lu = FALSE AND m.id_expediteur != (
                 SELECT id_utilisateur FROM utilisateur 
                 JOIN role ON role.id_role = utilisateur.id_role 
                 WHERE role.nom_role = 'SCOLARITE' LIMIT 1
             )) AS non_lus
         FROM conversation c
         JOIN etudiant e ON e.id_etudiant = c.id_etudiant
         JOIN utilisateur u ON u.id_utilisateur = e.id_etudiant
         LEFT JOIN filiere f ON f.id_filiere = e.id_filiere
         ORDER BY derniere_activite DESC NULLS LAST, c.date_creation DESC`
    );

    return rows.map((c) => ({
        id: c.id_conversation,
        sujet: c.sujet ?? "Nouvelle conversation",
        createdAt: c.date_creation,
        statut: c.statut,
        etudiant: {
            id: c.id_etudiant,
            nom: `${c.etudiant_prenom ?? ""} ${c.etudiant_nom ?? ""}`.trim(),
            email: c.etudiant_email ?? "",
            telephone: null,
            cne: c.cne ?? null,
            cin: c.cin ?? null,
            codeApogee: null,
            niveau: c.niveau ?? null,
            groupe: null,
            filiere: c.filiere_nom ?? null,
            departement: null,
        },
        dernierMessage: c.dernier_message,
        derniereActivite: c.derniere_activite,
        nonLus: parseInt(c.non_lus, 10) || 0,
    }));
};

const getConversationMessages = async (idConversation) => {
    const { rows } = await pool.query(
        `SELECT 
            m.id_message,
            m.id_expediteur,
            m.contenu,
            m.date_envoi,
            m.lu,
            m.pieces_jointes,
            u.prenom,
            u.nom,
            r.nom_role
         FROM message m
         JOIN utilisateur u ON u.id_utilisateur = m.id_expediteur
         JOIN role r ON r.id_role = u.id_role
         WHERE m.id_conversation = $1
         ORDER BY m.date_envoi ASC`,
        [idConversation]
    );

    const messages = rows.map((m) => ({
        id: m.id_message,
        contenu: m.contenu,
        dateEnvoi: m.date_envoi,
        lu: m.lu,
        expediteur: {
            id: m.id_expediteur,
            nom: `${m.prenom} ${m.nom}`,
            role: m.nom_role,
        },
        piecesJointes: m.pieces_jointes ?? [],
    }));

    for (const msg of messages) {
        if (msg.piecesJointes.length > 0) {
            const docIds = msg.piecesJointes.map((pj) => pj.id_document);
            if (docIds.length > 0) {
                const { rows: docs } = await pool.query(
                    `SELECT id_document, nom, type, taille, date_upload
                     FROM document
                     WHERE id_document = ANY($1)`,
                    [docIds]
                );
                msg.piecesJointes = docs.map((d) => ({
                    id_document: d.id_document,
                    nom: d.nom,
                    type: d.type,
                    taille: d.taille,
                    url: `/api/student/documents/${d.id_document}/download`,
                }));
            }
        }
    }

    return messages;
};

const sendMessage = async (idConversation, idExpediteur, { contenu, files }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const msgResult = await client.query(
            `INSERT INTO message (id_conversation, id_expediteur, contenu, pieces_jointes)
             VALUES ($1, $2, $3, $4)
             RETURNING id_message, date_envoi`,
            [idConversation, idExpediteur, contenu, JSON.stringify([])]
        );

        const message = msgResult.rows[0];
        const piecesJointes = [];

        for (const file of files ?? []) {
            // ✅ Maintenant on passe id_message
            const docResult = await client.query(
                `INSERT INTO document (id_message, nom, type, taille, contenu, date_upload, telecharge)
                 VALUES ($1, $2, $3, $4, $5, NOW(), FALSE)
                 RETURNING id_document`,
                [message.id_message, file.originalname, file.mimetype, file.size, file.buffer]
            );

            piecesJointes.push({
                id_document: docResult.rows[0].id_document,
                nom: file.originalname,
                type: file.mimetype,
                taille: file.size,
            });
        }

        await client.query(
            `UPDATE message SET pieces_jointes = $1 WHERE id_message = $2`,
            [JSON.stringify(piecesJointes), message.id_message]
        );

        await client.query("COMMIT");

        return {
            id: message.id_message,
            dateEnvoi: message.date_envoi,
        };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

const markConversationRead = async (idConversation, idScolarite) => {
    await pool.query(
        `UPDATE message
         SET lu = TRUE
         WHERE id_conversation = $1 AND id_expediteur != $2 AND lu = FALSE`,
        [idConversation, idScolarite]
    );
    return true;
};

module.exports = {
    getAllConversations,
    getConversationMessages,
    sendMessage,
    markConversationRead,
};