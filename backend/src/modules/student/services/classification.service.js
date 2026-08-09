const KEYWORDS = {
    Note: ["note", "examen", "moyenne", "contester", "contestation", "professeur", "correction", "copie", "module", "rattrapage"],
    AMO: ["amo", "assurance", "remboursement", "soins", "médical", "hôpital", "clinique", "ordonnance", "facture"],
    Bourse: ["bourse", "paiement", "échelon", "aide", "financière", "revenus", "dossier bourse"],
    Email: ["email", "compte", "mot de passe", "accès", "messagerie", "outlook", "identifiant"],
    CertificatMedical: ["certificat", "absence", "malade", "maladie", "justificatif", "consultation", "arrêt"],
};

const URGENT_WORDS = ["urgent", "immédiat", "demain", "aujourd'hui", "hôpital", "urgence", "examens aujourd'hui", "deadline"];

const PRIORITIES = {
    Urgente: 4,
    Haute: 3,
    Normale: 2,
    Basse: 1,
};

const normalize = (text) =>
    text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const classifyReclamation = (text) => {
    const normalized = normalize(text);
    const scores = {};

    for (const [categorie, keywords] of Object.entries(KEYWORDS)) {
        let score = 0;
        for (const keyword of keywords) {
            if (normalized.includes(normalize(keyword))) {
                score += keyword.length > 6 ? 2 : 1;
            }
        }
        scores[categorie] = score;
    }

    const bestCategorie = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const confidence = totalScore > 0 ? Math.round((bestCategorie[1] / totalScore) * 100) : 0;

    let priorite = "Normale";
    const hasUrgentWords = URGENT_WORDS.some((word) => normalized.includes(normalize(word)));
    
    if (hasUrgentWords) {
        priorite = "Urgente";
    } else if (bestCategorie[1] >= 3) {
        priorite = "Haute";
    }

    return {
        categorie: bestCategorie[1] > 0 ? bestCategorie[0] : "Autre",
        confiance: confidence,
        priorite,
        resume: generateSummary(text, bestCategorie[0]),
    };
};

const generateSummary = (text, categorie) => {
    const maxLen = 100;
    const clean = text.replace(/\s+/g, " ").trim();
    return clean.length > maxLen ? clean.substring(0, maxLen) + "..." : clean;
};

module.exports = {
    classifyReclamation,
};