const messagingService = require("../services/messaging.service");

const getAllConversations = async (req, res) => {
    try {
        const conversations = await messagingService.getAllConversations();
        res.json({ success: true, conversations });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getConversationMessages = async (req, res) => {
    try {
        const messages = await messagingService.getConversationMessages(req.params.id);
        res.json({ success: true, messages });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const sendMessage = async (req, res) => {
    try {
        const { contenu } = req.body;
        if (!contenu || !contenu.trim()) {
            return res.status(400).json({ success: false, message: "Le message est vide." });
        }

        const message = await messagingService.sendMessage(req.params.id, req.user.id, {
            contenu: contenu.trim(),
            files: req.files ?? [],
        });
        res.status(201).json({ success: true, message });
    } catch (err) {
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

module.exports = {
    getAllConversations,
    getConversationMessages,
    sendMessage,
    markConversationRead,
};