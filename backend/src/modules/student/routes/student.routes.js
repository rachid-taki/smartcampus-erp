const express = require("express");

const router = express.Router();

const authMiddleware = require("../../authentification/middlewares/auth.middleware");
const authorize = require("../../authentification/middlewares/authorize.middleware");

const studentController = require("../controllers/student.controller");

const upload = require("../middlewares/upload.middleware");

router.get(
  "/profile",
  authMiddleware,
  authorize(["ETUDIANT"]),
  studentController.getProfile,
);

router.get(
  "/requests/recent",
  authMiddleware,
  studentController.getRecentRequests,
);
router.get(
  "/documents/recent",
  authMiddleware,
  authorize(["ETUDIANT"]),
  studentController.getRecentDocuments,
);
router.get(
  "/documents/:id/download",
  authMiddleware,
  authorize(["ETUDIANT", "SCOLARITE"]),  
  studentController.downloadDocument,
);

router.get(
  "/notifications/recent",
  authMiddleware,
  authorize(["ETUDIANT"]),
  studentController.getRecentNotifications,
);

router.get(
  "/attestation/latest",
  authMiddleware,
  authorize(["ETUDIANT"]),
  studentController.getLatestAttestation,
);
router.get(
  "/requests",
  authMiddleware,
  authorize(["ETUDIANT"]),
  studentController.getAllRequests,
);

router.get(
  "/request-types",
  authMiddleware,
  authorize(["ETUDIANT"]),
  studentController.getRequestTypes,
);

router.post(
  "/requests",
  authMiddleware,
  authorize(["ETUDIANT"]),
  upload.array("documents"),
  studentController.createRequest,
);
router.patch(
  "/profile/photo",
  authMiddleware,
  authorize(["ETUDIANT"]),
  upload.single("photo"),
  studentController.updateProfilePhoto,
);
router.patch(
  "/profile/password",
  authMiddleware,
  authorize(["ETUDIANT"]),
  studentController.updatePassword,
);
router.get(
  "/notifications",
  authMiddleware,
  authorize(["ETUDIANT"]),
  studentController.getNotifications,
);

router.patch(
  "/notifications/read-all",
  authMiddleware,
  authorize(["ETUDIANT"]),
  studentController.markAllNotificationsRead,
);

router.patch(
  "/notifications/:id/read",
  authMiddleware,
  authorize(["ETUDIANT"]),
  studentController.markNotificationRead,
);
router.get(
  "/reclamation-types",
  authMiddleware,
  authorize(["ETUDIANT"]),
  studentController.getReclamationTypes,
);
router.get(
  "/reclamations",
  authMiddleware,
  authorize(["ETUDIANT"]),
  studentController.getReclamations,
);
router.get(
  "/reclamations/professors",
  authMiddleware,
  authorize(["ETUDIANT"]),
  studentController.getProfessors,
);
router.post(
  "/reclamations",
  authMiddleware,
  authorize(["ETUDIANT"]),
  upload.single("certificat"),
  studentController.createReclamation,
);
router.get(
  "/knowledge/search",
  authMiddleware,
  studentController.searchKnowledge,
);
router.get(
  "/knowledge/categories",
  authMiddleware,
  studentController.getKnowledgeCategories,
);
router.post(
  "/classify",
  authMiddleware,
  authorize(["ETUDIANT"]),
  studentController.classifyText,
);
router.get(
  "/messages/conversations",
  authMiddleware,
  authorize(["ETUDIANT"]),
  studentController.getConversations,
);
router.post(
  "/messages/conversations",
  authMiddleware,
  authorize(["ETUDIANT"]),
  studentController.createConversation,
);
router.get(
  "/messages/conversations/:id",
  authMiddleware,
  authorize(["ETUDIANT"]),
  studentController.getMessages,
);
router.post(
  "/messages/conversations/:id",
  authMiddleware,
  authorize(["ETUDIANT"]),
  upload.array("pieces", 5),  
  studentController.sendMessage
);
router.patch(
  "/messages/conversations/:id/read",
  authMiddleware,
  authorize(["ETUDIANT"]),
  studentController.markConversationRead,
);
router.get(
  "/documents-officiels",
  authMiddleware,
  authorize(["ETUDIANT"]),
  studentController.getDocumentsOfficiels
);

router.get(
  "/documents-officiels/:id/download",
  authMiddleware,
  authorize(["ETUDIANT"]),
  studentController.downloadDocumentOfficiel
);
module.exports = router;
