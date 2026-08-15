const pool = require("../../../config/database");

const normalize = (text) =>
    text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const RULES = [
    {
        categorie: "Accueil",
        keywords: [
            "bonjour", "salut", "bonsoir", "salam", "hello", "hey", "aide", "help", "cv",
            "bonjr", "bsoir", "slt", "bjr", "hlp", "aidé", "aides", "aider",
            "bonjours", "sallut", "salutt", "cc", "coucou"
        ],
        answer: "Bonjour ! Je suis l'assistant virtuel de SmartCampus ERP. Je peux vous renseigner sur : les demandes administratives, les réclamations, le calendrier académique, les documents, la bourse, l'AMO et bien plus. Que puis-je faire pour vous ?",
        action: null,
        quickReplies: ["Faire une demande", "Mes notes", "Calendrier", "Contacter la scolarité"],
    },
    {
        categorie: "Demandes",
        keywords: [
            "demande", "attestation", "convention", "stage", "releve", "certificat de scolarite",
            "faire une demande", "nouvelle demande",
            "demmande", "dmande", "damande", "dmand", "demmnde", "demander",
            "atestation", "attestion", "attestattion", "atestattion", "atestion",
            "convenssion", "convension", "conventtion", "convantion",
            "staje", "stagee", "stages", "stg",
            "relevé", "relever", "relève", "relever de note",
            "certif", "certiff", "certficat", "certificatt",
            "scolarité", "scolarite", "scolairté"
        ],
        answer: "Pour faire une demande administrative (attestation de scolarité, relevé de notes, convention de stage...) : cliquez sur le bouton ci-dessous. Choisissez le type, remplissez le formulaire et soumettez. Vous pourrez suivre son avancement en temps réel.",
        action: { label: "Faire une nouvelle demande", url: "/student/requests?new=1" },
        quickReplies: ["Suivre ma demande", "Mes documents", "Menu"],
    },
    {
        categorie: "Réclamations",
        keywords: [
            "reclamation", "contester", "contestation", "reclamer", "probleme note",
            "réclamation", "réclammation", "reclammation", "reclamaion", "reclammation",
            "contester note", "contestter", "contester une note",
            "probleme", "problème", "problemes", "soucis", "souci"
        ],
        answer: "Vous pouvez déposer une réclamation depuis la page Réclamations. Catégories disponibles : note, AMO, bourse, email académique et certificat médical. Cliquez sur le bouton ci-dessous pour démarrer.",
        action: { label: "Déposer une réclamation", url: "/student/reclamations?new=1" },
        quickReplies: ["Contester une note", "Certificat médical", "Bourse", "AMO"],
    },
    {
        categorie: "Notes",
        keywords: [
            "notes", "resultats", "moyenne", "deliberation", "resultat examen",
            "notte", "nottes", "nots", "notte", "nots", "notee",
            "résultats", "résultat", "resultat", "résultats examen",
            "moyennes", "moyenne generale", "moyennes generale",
            "délibération", "delibération", "delib", "deliberation",
            "bulletin", "bulletin de notes", "releve"
        ],
        answer: "Les résultats sont affichés après chaque délibération. Si vous souhaitez contester une note, déposez une réclamation de note dans un délai de 15 jours après l'affichage des résultats.",
        action: { label: "Contester une note", url: "/student/reclamations?new=1&category=Note" },
        quickReplies: ["Calendrier", "Déposer une réclamation", "Menu"],
    },
    {
        categorie: "Certificat médical",
        keywords: [
            "certificat medical", "malade", "maladie", "absence", "justificatif medical", "consultation",
            "certif medical", "certiff", "certificatt medical",
            "absense", "absences", "absent", "abs",
            "maladee", "maladiee", "malad",
            "justificatif", "justificattif", "justiff",
            "medecin", "docteur", "hopital", "hôpital", "urgences",
            "arret maladie", "arrêt maladie"
        ],
        answer: "Pour justifier une absence, déposez votre certificat médical via la page Réclamations. Le service de la scolarité le vérifiera et le validera.",
        action: { label: "Déposer un certificat médical", url: "/student/reclamations?new=1&category=CertificatMedical" },
        quickReplies: ["Mes absences", "Autre réclamation", "Menu"],
    },
    {
        categorie: "Calendrier",
        keywords: [
            "calendrier", "emploi du temps", "examen", "vacances", "rentree", "dates", "planning", "session",
            "callendrier", "calendier", "callendiere", "calandrier", "callandrier", "calendrié",
            "emplois du temps", "emploie du temps", "edtd", "edt",
            "exament", "examens", "exam", "exmens", "examain",
            "vaccances", "vacance", "vacanse",
            "rentrée", "rentré", "rentreee",
            "planing", "plannig", "plannning",
            "sessions", "sesssion", "session examen"
        ],
        answer: "Consultez la page Calendrier pour voir toutes les dates clés de l'année académique : début des enseignements, examens, délibérations, vacances et fêtes.",
        action: { label: "Voir le calendrier", url: "/student/calendrier" },
        quickReplies: ["Mes examens", "Faire une demande", "Menu"],
    },
    {
        categorie: "Bourse",
        keywords: [
            "bourse", "paiement bourse", "echelon", "bourse non recu",
            "boursee", "boursee", "boursse",
            "payement", "paiemnt", "payement bourse",
            "échelon", "echelons", "échelons",
            "non recu", "non reçu", "pas recu", "pas reçu",
            "cnous", "cnouss", "crous"
        ],
        answer: "En cas de problème avec votre bourse (retard de paiement, dossier incomplet...), déposez une réclamation Bourse en précisant votre numéro de dossier si possible.",
        action: { label: "Déposer une réclamation Bourse", url: "/student/reclamations?new=1&category=Bourse" },
        quickReplies: ["AMO", "Contacter la scolarité", "Menu"],
    },
    {
        categorie: "AMO",
        keywords: [
            "amo", "assurance", "mutuelle", "remboursement", "anam", "couverture medicale",
            "amoo", "amo ",
            "assurrance", "assurence", "assurence",
            "mutuele", "mutuelle medicale",
            "remboursementt", "rembourssement", "remboursment",
            "anamm", "anam",
            "couverture", "couverturre", "couvertur"
        ],
        answer: "Pour tout problème lié à l'AMO (activation, remboursement, dossier), déposez une réclamation AMO. Le service concerné traitera votre demande.",
        action: { label: "Déposer une réclamation AMO", url: "/student/reclamations?new=1&category=AMO" },
        quickReplies: ["Bourse", "Certificat médical", "Menu"],
    },
    {
        categorie: "Email académique",
        keywords: [
            "email academique", "compte email", "email etudiant", "outlook", "mot de passe email", "messagerie",
            "emeil", "e-mail", "emai", "emails",
            "académique", "academike", "academique",
            "outlouk", "outloock", "outlok",
            "messagerie", "messaging", "messageri", "mesagerie",
            "mdp email", "password email", "mot de pass"
        ],
        answer: "Si vous avez un problème avec votre email académique (accès, mot de passe perdu...), déposez une réclamation Email académique. Le service informatique vous répondra.",
        action: { label: "Déposer une réclamation Email", url: "/student/reclamations?new=1&category=Email" },
        quickReplies: ["Paramètres", "Contacter la scolarité", "Menu"],
    },
    {
        categorie: "Documents",
        keywords: [
            "documents", "deposer", "fichier", "telecharger", "piece jointe",
            "documentt", "documment", "documments",
            "déposer", "deposser", "depossé",
            "fichierr", "fichiers", "fichier joint",
            "télécharger", "telechargé", "télecharger", "download",
            "pièce jointe", "piece jointes", "pj", "pjs",
            "pdf", "scan", "scann"
        ],
        answer: "Retrouvez tous vos documents dans la page Mes documents. Vous pouvez les rechercher, filtrer par format et les télécharger.",
        action: { label: "Voir mes documents", url: "/student/documents" },
        quickReplies: ["Faire une demande", "Menu"],
    },
    {
        categorie: "Compte",
        keywords: [
            "mot de passe", "compte", "parametres", "securite", "modifier profil", "photo profil",
            "motdepasse", "mot de pass", "mpd", "mdp", "password", "pass",
            "comptes", "compt", "compte bloqué",
            "paramètres", "parametres", "paramétres", "settings",
            "sécurité", "securité", "securitée",
            "connexion", "conection", "connecter", "login",
            "bloqué", "bloque", "desactivé", "désactivé"
        ],
        answer: "Pour gérer votre compte : allez dans la page Paramètres. Vous pouvez y changer votre mot de passe et gérer vos préférences de notifications.",
        action: { label: "Ouvrir les paramètres", url: "/student/settings" },
        quickReplies: ["Voir mon profil", "Menu"],
    },
    {
        categorie: "Profil",
        keywords: [
            "profil", "photo", "informations personnelles", "modifier profil",
            "profille", "profile", "profils",
            "photo profil", "photo profille", "avatar",
            "informations", "info personnelles", "infos perso",
            "téléphone", "telephone", "adresse", "adresse email"
        ],
        answer: "Vous pouvez consulter et modifier vos informations personnelles depuis la page Mon profil.",
        action: { label: "Voir mon profil", url: "/student/profile" },
        quickReplies: ["Paramètres", "Menu"],
    },
    {
        categorie: "Contact",
        keywords: [
            "contact", "scolarite", "bureau", "telephone", "administration", "joindre", "email scolarite",
            "scolarité", "scolaritee", "scolairté",
            "buraux", "burreau", "bureaux",
            "téléphone", "tel", "tél", "numéro",
            "admin", "administrattion", "adminstration",
            "joindres", "contacté", "contacté scolarité",
            "adresse", "ou se trouve", "localisation", "lieu",
            "renseignement", "renseignements", "info"
        ],
        answer: "Vous pouvez contacter le service de la scolarité :\n\n✉️ **Par messagerie** : via le portail (réponse sous 24-48h)\n📍 **Sur place** : bureau de la scolarité, bâtiment principal\n📞 **Téléphone** : aux heures ouvrables (8h30-16h30)\n\nPour toute demande formelle, privilégiez le portail.",
        action: { label: "Ouvrir la messagerie", url: "/student/messages" },
        quickReplies: ["Faire une demande", "Déposer une réclamation", "Menu"],
    },
    {
        categorie: "Remerciement",
        keywords: [
            "merci", "thanks", "super", "parfait", "genial",
            "mercii", "merciii", "merci beaucoup", "thx",
            "top", "génial", "génnial", "parfait", "parfaite",
            "cool", "ok", "oki", "d'accord", "dac", "bien"
        ],
        answer: "Avec plaisir ! N'hésitez pas si vous avez d'autres questions. Bonne journée sur SmartCampus ERP !",
        action: null,
        quickReplies: ["Menu"],
    },
    {
        categorie: "Menu",
        keywords: [
            "menu", "options", "que peux tu faire",
            "menue", "menus", "option", "optionss",
            "aide", "help", "quoi faire", "que faire"
        ],
        answer: "Voici ce que je peux faire pour vous :",
        action: null,
        quickReplies: ["Faire une demande", "Mes notes", "Calendrier", "Réclamation", "Contacter la scolarité"],
    },
];

const FALLBACK_ANSWER =
    "Je n'ai pas suffisamment d'informations pour répondre précisément à votre question. Mais vous avez deux options pour obtenir de l'aide :\n\n" +
    "✉️ **Contacter la scolarité** via la messagerie du portail (réponse sous 24-48h)\n" +
    "🏫 **Vous rendre sur place** au bureau de la scolarité (lundi-vendredi, 8h30-16h30)\n\n" +
    "En attendant, voici quelques sujets que je peux traiter :";

const FALLBACK_QUICK_REPLIES = [
    "Faire une demande",
    "Mes notes",
    "Calendrier",
    "Contacter la scolarité",
    "Menu",
];

const FALLBACK_ACTION = {
    label: "Ouvrir la messagerie",
    url: "/student/messages",
};

const estimateTokens = (text) => Math.ceil(text.length / 4);

const findBestAnswer = (message) => {
    const normalized = normalize(message);
    let best = null;
    let bestScore = 0;

    for (const rule of RULES) {
        let score = 0;
        for (const kw of rule.keywords) {
            if (normalized.includes(normalize(kw))) {
                score += normalize(kw).split(" ").length > 1 ? 3 : 1;
            }
        }
        if (score > bestScore) {
            bestScore = score;
            best = rule;
        }
    }

    if (!best || bestScore === 0) {
        return {
            categorie: "Autre",
            answer: FALLBACK_ANSWER,
            action: FALLBACK_ACTION,
            quickReplies: FALLBACK_QUICK_REPLIES,
        };
    }
    return {
        categorie: best.categorie,
        answer: best.answer,
        action: best.action || null,
        quickReplies: best.quickReplies || [],
    };
};

const createConversation = async (idEtudiant) => {
    const { rows } = await pool.query(
        `INSERT INTO conversation_ia (id_etudiant, statut)
         VALUES ($1, 'Active')
         RETURNING id_conversation_ia, date_creation, statut`,
        [idEtudiant]
    );
    return {
        id: rows[0].id_conversation_ia,
        createdAt: rows[0].date_creation,
        statut: rows[0].statut,
    };
};

const getConversations = async (idEtudiant) => {
        await cleanupOldConversations(idEtudiant);

    const { rows } = await pool.query(
        `SELECT c.id_conversation_ia, c.date_creation, c.statut,
                (SELECT m.contenu FROM message_ia m
                 WHERE m.id_conversation_ia = c.id_conversation_ia AND m.role = 'User'
                 ORDER BY m.date_envoi ASC LIMIT 1) AS titre
         FROM conversation_ia c
         WHERE c.id_etudiant = $1
         ORDER BY c.date_creation DESC`,
        [idEtudiant]
    );
    return rows.map((c) => ({
        id: c.id_conversation_ia,
        createdAt: c.date_creation,
        statut: c.statut,
        titre: c.titre ?? "Nouvelle conversation",
    }));
};

const getMessages = async (idConversation, idEtudiant) => {
    const { rows } = await pool.query(
        `SELECT m.id_message_ia, m.role, m.contenu, m.date_envoi, m.metadata
         FROM message_ia m
         JOIN conversation_ia c ON c.id_conversation_ia = m.id_conversation_ia
         WHERE m.id_conversation_ia = $1 AND c.id_etudiant = $2
         ORDER BY m.date_envoi ASC`,
        [idConversation, idEtudiant]
    );
    return rows.map((m) => ({
        id: m.id_message_ia,
        role: m.role,
        contenu: m.contenu,
        dateEnvoi: m.date_envoi,
        action: m.metadata?.action || null,
        quickReplies: m.metadata?.quickReplies || [],
    }));
};

const saveMessage = async (idConversation, role, contenu, metadata = null) => {
    await pool.query(
        `INSERT INTO message_ia (id_conversation_ia, role, contenu, tokens, metadata)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [idConversation, role, contenu, estimateTokens(contenu), metadata ? JSON.stringify(metadata) : null]
    );
};

const chat = async (idEtudiant, { conversationId, message }) => {
        await cleanupOldConversations(idEtudiant);

    let convId = conversationId;

    if (!convId) {
        const conv = await createConversation(idEtudiant);
        convId = conv.id;
    } else {
        const { rows } = await pool.query(
            `SELECT id_conversation_ia FROM conversation_ia
             WHERE id_conversation_ia = $1 AND id_etudiant = $2`,
            [convId, idEtudiant]
        );
        if (rows.length === 0) {
            throw new Error("Conversation introuvable.");
        }
    }

    await saveMessage(convId, "User", message);

    const { categorie, answer, action, quickReplies } = findBestAnswer(message);
    await saveMessage(convId, "Assistant", answer, { action, quickReplies });

    return {
        conversationId: convId,
        categorie,
        answer,
        action: action || null,
        quickReplies: quickReplies || [],
    };
};

const cleanupOldConversations = async (idEtudiant = null) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const { rows } = await client.query(
            `SELECT c.id_conversation_ia
             FROM conversation_ia c
             WHERE ($1::uuid IS NULL OR c.id_etudiant = $1)
               AND c.date_creation < NOW() - INTERVAL '15 minutes'
               AND NOT EXISTS (
                   SELECT 1 FROM message_ia m
                   WHERE m.id_conversation_ia = c.id_conversation_ia
                     AND m.date_envoi > NOW() - INTERVAL '15 minutes'
               )`,
            [idEtudiant]
        );

        for (const r of rows) {
            await client.query(
                `DELETE FROM message_ia WHERE id_conversation_ia = $1`,
                [r.id_conversation_ia]
            );
            await client.query(
                `DELETE FROM conversation_ia WHERE id_conversation_ia = $1`,
                [r.id_conversation_ia]
            );
        }

        await client.query("COMMIT");
        return rows.length;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

module.exports = {
    chat,
    getConversations,
    getMessages,
    createConversation,
    cleanupOldConversations,
};