const pool = require("../../../config/database");

const createConversation = async (idEtudiant, { sujet }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const convResult = await client.query(
            `INSERT INTO conversation (sujet, statut, id_etudiant)
             VALUES ($1, 'Ouverte', $2)
             RETURNING id_conversation, sujet, date_creation, statut`,
            [sujet, idEtudiant]
        );

        const conv = convResult.rows[0];

        await client.query(
            `INSERT INTO conversation_participant (id_conversation, id_utilisateur)
             VALUES ($1, $2)`,
            [conv.id_conversation, idEtudiant]
        );

        await client.query("COMMIT");

        return {
            id: conv.id_conversation,
            sujet: conv.sujet,
            createdAt: conv.date_creation,
            statut: conv.statut,
        };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

const getConversations = async (idEtudiant) => {
    const { rows } = await pool.query(
        `SELECT 
            c.id_conversation,
            c.sujet,
            c.date_creation,
            c.statut,
            (SELECT m.contenu FROM message m
             WHERE m.id_conversation = c.id_conversation
             ORDER BY m.date_envoi DESC LIMIT 1) AS dernier_message,
            (SELECT m.date_envoi FROM message m
             WHERE m.id_conversation = c.id_conversation
             ORDER BY m.date_envoi DESC LIMIT 1) AS derniere_activite,
            (SELECT COUNT(*) FROM message m
             WHERE m.id_conversation = c.id_conversation
             AND m.lu = FALSE AND m.id_expediteur != $1) AS non_lus
         FROM conversation c
         WHERE c.id_etudiant = $1
         ORDER BY derniere_activite DESC NULLS LAST, c.date_creation DESC`,
        [idEtudiant]
    );

    return rows.map((c) => ({
        id: c.id_conversation,
        sujet: c.sujet ?? "Nouvelle conversation",
        createdAt: c.date_creation,
        statut: c.statut,
        dernierMessage: c.dernier_message,
        derniereActivite: c.derniere_activite,
        nonLus: parseInt(c.non_lus, 10),
    }));
};

const getMessages = async (idConversation, idEtudiant) => {
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
            CASE WHEN m.id_expediteur = $2 THEN TRUE ELSE FALSE END AS is_mine
         FROM message m
         JOIN conversation c ON c.id_conversation = m.id_conversation
         JOIN utilisateur u ON u.id_utilisateur = m.id_expediteur
         WHERE m.id_conversation = $1 AND c.id_etudiant = $2
         ORDER BY m.date_envoi ASC`,
        [idConversation, idEtudiant]
    );

    const messages = rows.map((m) => ({
        id: m.id_message,
        contenu: m.contenu,
        dateEnvoi: m.date_envoi,
        lu: m.lu,
        isMine: m.is_mine,
        expediteur: `${m.prenom} ${m.nom}`,
        piecesJointes: m.pieces_jointes ?? [],
    }));

    // Charger les détails des documents pour chaque message
    for (const msg of messages) {
        if (msg.piecesJointes.length > 0) {
            const docIds = msg.piecesJointes.map((pj) => pj.id_document);
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

const markConversationRead = async (idConversation, idEtudiant) => {
    await pool.query(
        `UPDATE message
         SET lu = TRUE
         WHERE id_conversation = $1 AND id_expediteur != $2 AND lu = FALSE`,
        [idConversation, idEtudiant]
    );
    return true;
};

module.exports = {
    createConversation,
    getConversations,
    getMessages,
    sendMessage,
    markConversationRead,
};