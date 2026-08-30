const studentService = require("../services/student.service");
const knowledgeService = require("../services/knowledge.service");
const classificationService = require("../services/classification.service");
const pool = require("../../../config/database"); 




const getProfile = async (req, res) => {
    try {

        console.log(req.user);
        const student = await studentService.getProfile(
        req.user.id
);

        res.json({
            success: true,
            user: student,
        });
    } catch (err) {
    console.error(err);

    res.status(500).json({
        success: false,
        message: err.message,
        stack: err.stack,
    });
}
};
const getRecentRequests = async (req, res) => {
    try {
        const requests = await studentService.getRecentRequests(
            req.user.id
        );

        res.json({
            success: true,
            requests,
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};
const getRecentDocuments = async (req, res) => {
    try {

        const documents =
            await studentService.getRecentDocuments(req.user.id);

        res.json({
            success: true,
            documents,
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message,
        });

    }
};
const downloadDocument = async (req, res) => {
    try {
        const document = await studentService.downloadDocument(req.params.id);

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document introuvable",
            });
        }

        // Vérification d'accès
        // L'étudiant ne peut télécharger QUE ses propres documents
        // La scolarité peut télécharger tous les documents
        if (req.user.role === "ETUDIANT") {
            const studentDoc = await pool.query(
                `SELECT d.id_document 
                 FROM document d
                 JOIN demande dem ON dem.id_demande = d.id_demande
                 WHERE d.id_document = $1 AND dem.id_etudiant = $2`,
                [req.params.id, req.user.id]
            );
            
            const messageDoc = await pool.query(
                `SELECT d.id_document 
                 FROM document d
                 JOIN message m ON m.id_message = d.id_message
                 JOIN conversation c ON c.id_conversation = m.id_conversation
                 WHERE d.id_document = $1 AND c.id_etudiant = $2`,
                [req.params.id, req.user.id]
            );

            if (studentDoc.rows.length === 0 && messageDoc.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: "Accès refusé à ce document",
                });
            }
        }
        // SCOLARITE peut tout télécharger (pas de vérification)

        res.setHeader("Content-Type", document.type);
        res.setHeader("Content-Disposition", `attachment; filename="${document.nom}"`);
        res.send(document.contenu);
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

const getRecentNotifications = async (req, res) => {

    try {

        const notifications =
            await studentService.getRecentNotifications(
                req.user.id
            );

        res.json({
            success: true,
            notifications
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};

const getLatestAttestation = async (req, res) => {
    try {
        const data = await studentService.getLatestAttestationOfficielle(req.user.id);
        res.json({
            success: true,
            attestation: data,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

const getAllRequests = async (req, res) => {

    try {

        const requests =
            await studentService.getAllRequests(req.user.id);

        res.json({
            success: true,
            requests
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};
const getRequestTypes = async (req, res) => {

    try {

        const types =
            await studentService.getRequestTypes();

        res.json({
            success: true,
            types
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};
const createRequest = async (req, res) => {

    try {
        

        const request = await studentService.createRequest(
            req.user.id,
            req.body,
            req.files
        );

        res.json({
            success: true,
            request,
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message,
        });

    }

};

const updateProfilePhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Aucune image reçue." });
        }
        if (!req.file.mimetype.startsWith("image/")) {
            return res.status(400).json({ message: "Le fichier doit être une image." });
        }
        if (req.file.size > 3 * 1024 * 1024) {
            return res.status(400).json({ message: "L'image ne doit pas dépasser 3 Mo." });
        }

        const id = req.user.id; // Make sure this matches your auth middleware payload
        await studentService.updatePhoto(id, req.file.buffer, req.file.mimetype);

        res.json({
            message: "Photo mise à jour avec succès",
            photo: `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la mise à jour de la photo." });
    }
};
const bcrypt = require("bcrypt"); // Same package you use in auth.service.js

const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // 1. Server-side validation (Exact same rules as Login.tsx)
        const strong =
            newPassword.length >= 12 &&
            /[A-Z]/.test(newPassword) &&
            /[a-z]/.test(newPassword) &&
            /[0-9]/.test(newPassword) &&
            /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

        if (!strong) {
            return res.status(400).json({ 
                success: false, 
                message: "Le mot de passe ne respecte pas les exigences de sécurité." 
            });
        }

        // 2. Get current hash
        const currentHash = await studentService.getPasswordHash(req.user.id);
        if (!currentHash) {
            return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
        }

        // 3. Verify current password (Just like in your login function)
        const match = await bcrypt.compare(currentPassword, currentHash);
        if (!match) {
            return res.status(401).json({ 
                success: false, 
                message: "Le mot de passe actuel est incorrect." 
            });
        }

        // 4. Hash new password (Just like in your register function)
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // 5. Update in DB
        await studentService.updatePassword(req.user.id, hashedPassword);

        res.json({ success: true, message: "Mot de passe mis à jour avec succès." });
    } catch (err) {
        console.error("❌ ERROR IN UPDATE PASSWORD:", err);
        res.status(500).json({ success: false, message: "Erreur lors de la mise à jour." });
    }
};
const getNotifications = async (req, res) => {
    try {
        const notifications = await studentService.getNotifications(req.user.id);
        res.json({ success: true, notifications });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const markNotificationRead = async (req, res) => {
    try {
        await studentService.markNotificationRead(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const markAllNotificationsRead = async (req, res) => {
    try {
        await studentService.markAllNotificationsRead(req.user.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
const getReclamationTypes = async (req, res) => {
    try {
        const types = await studentService.getReclamationTypes();
        res.json({ success: true, types });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getReclamations = async (req, res) => {
    try {
        const reclamations = await studentService.getReclamations(req.user.id);
        res.json({ success: true, reclamations });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const createReclamation = async (req, res) => {
    try {
        const reclamation = await studentService.createReclamation(
            req.user.id,
            req.body,
            req.file
        );
        res.status(201).json({ success: true, reclamation });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
const getProfessors = async (req, res) => {
    try {
        const professors = await studentService.getProfessors();
        res.json({ success: true, professors });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const searchKnowledge = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ success: false, message: "Paramètre de recherche manquant." });
        }
        const results = await knowledgeService.searchKnowledge(q);
        res.json({ success: true, results });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getKnowledgeCategories = async (req, res) => {
    try {
        const categories = await knowledgeService.getAllCategories();
        res.json({ success: true, categories });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
const classifyText = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || text.trim().length < 10) {
            return res.status(400).json({ success: false, message: "Texte trop court pour classification." });
        }
        const result = classificationService.classifyReclamation(text);
        res.json({ success: true, classification: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
const messagingService = require("../services/messaging.service");

const getConversations = async (req, res) => {
    try {
        const conversations = await messagingService.getConversations(req.user.id);
        res.json({ success: true, conversations });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const createConversation = async (req, res) => {
    try {
        const { sujet } = req.body;
        if (!sujet || !sujet.trim()) {
            return res.status(400).json({ success: false, message: "Le sujet est requis." });
        }
        const conversation = await messagingService.createConversation(req.user.id, { sujet: sujet.trim() });
        res.status(201).json({ success: true, conversation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getMessages = async (req, res) => {
    try {
        const messages = await messagingService.getMessages(req.params.id, req.user.id);
        res.json({ success: true, messages });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const sendMessage = async (req, res) => {
    try {
        const { contenu } = req.body;
        const files = req.files ?? [];
        
        if ((!contenu || !contenu.trim()) && files.length === 0) {
            return res.status(400).json({ success: false, message: "Le message est vide." });
        }

        const message = await messagingService.sendMessage(req.params.id, req.user.id, {
            contenu: contenu?.trim() ?? "",
            files: files,
        });
        res.status(201).json({ success: true, message });
    } catch (err) {
        console.error("❌ Erreur sendMessage:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

const markConversationRead = async (req, res) => {
    try {
        await messagingService.markConversationRead(req.params.id, req.user.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
const getDocumentsOfficiels = async (req, res) => {
    try {
        const documents = await studentService.getDocumentsOfficiels(req.user.id);
        res.json({ success: true, documents });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const downloadDocumentOfficiel = async (req, res) => {
    try {
        const document = await studentService.downloadDocumentOfficiel(
            req.params.id,
            req.user.id
        );

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document officiel introuvable",
            });
        }

        res.setHeader("Content-Type", document.type);
        res.setHeader("Content-Disposition", `attachment; filename="${document.nom}"`);
        res.send(document.contenu);
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};
// GET /api/student/presidence - Récupérer le club de l'étudiant président
// GET /api/student/check-presidence - Le président est-il connecté ?
const checkPresidence = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pc.id_club, c.nom
       FROM president_club pc
       JOIN club c ON c.id_club = pc.id_club
       WHERE pc.id_etudiant = $1 AND pc.statut = 'Actif'
       LIMIT 1`,
      [req.user.id]
    );

    res.json({
      success: true,
      isPresident: result.rows.length > 0,
      clubName: result.rows[0]?.nom || null,
    });
  } catch (err) {
    res.json({ success: true, isPresident: false });
  }
};

// GET /api/student/presidence - Club + budget + demandes du président
const getPresidenceClub = async (req, res) => {
  try {
    const presidentRes = await pool.query(
      `SELECT pc.*, c.nom, c.description, c.budget
       FROM president_club pc
       JOIN club c ON c.id_club = pc.id_club
       WHERE pc.id_etudiant = $1 AND pc.statut = 'Actif'
       LIMIT 1`,
      [req.user.id]
    );

    if (presidentRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vous n'êtes pas président d'un club",
      });
    }

    const president = presidentRes.rows[0];

    const demandesRes = await pool.query(
      `SELECT * FROM demande_club
       WHERE id_club = $1
       ORDER BY date_demande DESC`,
      [president.id_club]
    );

    res.json({
      success: true,
      club: {
        id_club: president.id_club,
        nom: president.nom,
        description: president.description,
        budget: president.budget,
      },
      demandes: demandesRes.rows,
    });
  } catch (err) {
    console.error("Erreur getPresidenceClub:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/student/presidence/demandes - Créer une demande de club
const createDemandeClub = async (req, res) => {
  try {
    const etudiantId = req.user.id;
    const { type, objet, description, budgetDemande, dateDebut, heureDebut, heureFin, justificatif } = req.body;

    const presidentResult = await pool.query(
      `SELECT id_president, id_club FROM president_club WHERE id_etudiant = $1 AND statut = 'Actif' LIMIT 1`,
      [etudiantId]
    );
    if (presidentResult.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Vous n'êtes pas autorisé à créer des demandes" });
    }
    const president = presidentResult.rows[0];

    // ✅ Le président tape du texte libre — la conversion JSON est interne, il ne le voit jamais
    let justificatifsJson = null;
    if (justificatif && justificatif.trim() !== "") {
      try {
        JSON.parse(justificatif);                       // déjà du JSON valide → garder tel quel
        justificatifsJson = justificatif;
      } catch {
        justificatifsJson = JSON.stringify({ note: justificatif });  // texte libre → enveloppé
      }
    }

    const result = await pool.query(
      `INSERT INTO demande_club
        (id_club, id_president, type, objet, description, budget_demande,
         date_evenement, heure_debut, heure_fin, justificatifs, statut, date_demande)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Soumise',NOW())
       RETURNING *`,
      [president.id_club, president.id_president, type, objet, description,
       budgetDemande || 0, dateDebut || null, heureDebut || null, heureFin || null, justificatifsJson]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erreur createDemandeClub:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// POST /api/student/presidence/demandes - Créer une demande de club


module.exports = {
    getProfile,
    getRecentRequests,
    getRecentDocuments,
    downloadDocument,
    getRecentNotifications,
    getLatestAttestation,
    getAllRequests,
    getRequestTypes,
    createRequest,
    updateProfilePhoto, 
    updatePassword,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    getReclamationTypes,
    getReclamations,
    createReclamation,
    getProfessors,
    searchKnowledge,
    getKnowledgeCategories,
    classifyText,
    getConversations,
    createConversation,
    getMessages,
    sendMessage,
    markConversationRead,
    getDocumentsOfficiels,
    downloadDocumentOfficiel,
    getPresidenceClub,
    createDemandeClub,

    
    

};