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
        keywords: ["bonjour", "salut", "bonsoir", "salam", "hello", "hey", "aide", "help", "cv"],
        answer:
            "Bonjour ! Je suis l'assistant virtuel de SmartCampus ERP. Je peux vous renseigner sur : les demandes administratives, les réclamations, le calendrier académique, les documents, la bourse, l'AMO et bien plus. Que puis-je faire pour vous ?",
        action: null,
    },
    {
        categorie: "Demandes",
        keywords: ["demande", "attestation", "convention", "stage", "releve", "certificat de scolarite", "faire une demande", "nouvelle demande"],
        answer:
            "Pour faire une demande administrative (attestation de scolarité, relevé de notes, convention de stage...) : cliquez sur le bouton ci-dessous. Choisissez le type, remplissez le formulaire et soumettez. Vous pourrez suivre son avancement en temps réel.",
        action: {
            label: "Faire une nouvelle demande",
            url: "/student/requests?new=1",
        },
    },
    {
        categorie: "Réclamations",
        keywords: ["reclamation", "contester", "contestation", "reclamer", "probleme note"],
        answer:
            "Vous pouvez déposer une réclamation depuis la page Réclamations. Catégories disponibles : note, AMO, bourse, email académique et certificat médical. Cliquez sur le bouton ci-dessous pour démarrer.",
        action: {
            label: "Déposer une réclamation",
            url: "/student/reclamations?new=1",
        },
    },
    {
        categorie: "Notes",
        keywords: ["notes", "resultats", "moyenne", "deliberation", "resultat examen"],
        answer:
            "Les résultats sont affichés après chaque délibération. Si vous souhaitez contester une note, déposez une réclamation de note dans un délai de 15 jours après l'affichage des résultats.",
        action: {
            label: "Contester une note",
            url: "/student/reclamations?new=1&category=Note",
        },
    },
    {
        categorie: "Certificat médical",
        keywords: ["certificat medical", "malade", "maladie", "absence", "justificatif medical", "consultation"],
        answer:
            "Pour justifier une absence, déposez votre certificat médical via la page Réclamations. Le service de la scolarité le vérifiera et le validera.",
        action: {
            label: "Déposer un certificat médical",
            url: "/student/reclamations?new=1&category=CertificatMedical",
        },
    },
    {
        categorie: "Calendrier",
        keywords: ["calendrier", "emploi du temps", "examen", "vacances", "rentree", "dates", "planning", "session"],
        answer:
            "Consultez la page Calendrier pour voir toutes les dates clés de l'année académique : début des enseignements, examens, délibérations, vacances et fêtes.",
        action: {
            label: "Voir le calendrier",
            url: "/student/calendrier",
        },
    },
    {
        categorie: "Bourse",
        keywords: ["bourse", "paiement bourse", "echelon", "bourse non recu"],
        answer:
            "En cas de problème avec votre bourse (retard de paiement, dossier incomplet...), déposez une réclamation Bourse en précisant votre numéro de dossier si possible.",
        action: {
            label: "Déposer une réclamation Bourse",
            url: "/student/reclamations?new=1&category=Bourse",
        },
    },
    {
        categorie: "AMO",
        keywords: ["amo", "assurance", "mutuelle", "remboursement", "anam", "couverture medicale"],
        answer:
            "Pour tout problème lié à l'AMO (activation, remboursement, dossier), déposez une réclamation AMO. Le service concerné traitera votre demande.",
        action: {
            label: "Déposer une réclamation AMO",
            url: "/student/reclamations?new=1&category=AMO",
        },
    },
    {
        categorie: "Email académique",
        keywords: ["email academique", "compte email", "email etudiant", "outlook", "mot de passe email", "messagerie"],
        answer:
            "Si vous avez un problème avec votre email académique (accès, mot de passe perdu...), déposez une réclamation Email académique. Le service informatique vous répondra.",
        action: {
            label: "Déposer une réclamation Email",
            url: "/student/reclamations?new=1&category=Email",
        },
    },
    {
        categorie: "Documents",
        keywords: ["documents", "deposer", "fichier", "telecharger", "piece jointe"],
        answer:
            "Retrouvez tous vos documents dans la page Mes documents. Vous pouvez les rechercher, filtrer par format et les télécharger.",
        action: {
            label: "Voir mes documents",
            url: "/student/documents",
        },
    },
    {
        categorie: "Compte",
        keywords: ["mot de passe", "compte", "parametres", "securite", "modifier profil", "photo profil"],
        answer:
            "Pour gérer votre compte : allez dans la page Paramètres. Vous pouvez y changer votre mot de passe et gérer vos préférences de notifications.",
        action: {
            label: "Ouvrir les paramètres",
            url: "/student/settings",
        },
    },
    {
        categorie: "Profil",
        keywords: ["profil", "photo", "informations personnelles", "modifier profil"],
        answer:
            "Vous pouvez consulter et modifier vos informations personnelles depuis la page Mon profil.",
        action: {
            label: "Voir mon profil",
            url: "/student/profile",
        },
    },
    {
        categorie: "Contact",
        keywords: ["contact", "scolarite", "bureau", "telephone", "administration", "joindre", "email scolarite"],
        answer:
            "Vous pouvez contacter le service de la scolarité par email à scolarite@ensiasd.ac.ma ou vous rendre au bureau de la scolarité pendant les heures ouvrables. Pour toute demande formelle, privilégiez le portail.",
        action: null,
    },
    {
        categorie: "Remerciement",
        keywords: ["merci", "thanks", "super", "parfait", "genial"],
        answer: "Avec plaisir ! N'hésitez pas si vous avez d'autres questions. Bonne journée sur SmartCampus ERP !",
        action: null,
    },
];
const FALLBACK_ANSWER =
    "Désolé, je n'ai pas bien compris votre question. Je peux vous aider avec : les demandes administratives, les réclamations (note, AMO, bourse, email, certificat médical), le calendrier académique, vos documents ou votre compte. Essayez de reformuler !";

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
            action: null,
        };
    }
    return { categorie: best.categorie, answer: best.answer, action: best.action || null };
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
        `SELECT m.id_message_ia, m.role, m.contenu, m.date_envoi
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
    }));
};

const saveMessage = async (idConversation, role, contenu) => {
    await pool.query(
        `INSERT INTO message_ia (id_conversation_ia, role, contenu, tokens)
         VALUES ($1, $2, $3, $4)`,
        [idConversation, role, contenu, estimateTokens(contenu)]
    );
};

const chat = async (idEtudiant, { conversationId, message }) => {
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

    const { categorie, answer, action } = findBestAnswer(message);
    await saveMessage(convId, "Assistant", answer);

    return {
        conversationId: convId,
        categorie,
        answer,
        action: action || null,
    };
};

module.exports = {
    chat,
    getConversations,
    getMessages,
    createConversation,
};