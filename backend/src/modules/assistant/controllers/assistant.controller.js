const assistantService = require("../services/assistant.service");

const chat = async (req, res) => {
    try {
        const { conversationId, message } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, message: "Le message est vide." });
        }
        const result = await assistantService.chat(req.user.id, {
            conversationId,
            message: message.trim(),
        });
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getConversations = async (req, res) => {
    try {
        const conversations = await assistantService.getConversations(req.user.id);
        res.json({ success: true, conversations });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getMessages = async (req, res) => {
    try {
        const messages = await assistantService.getMessages(req.params.id, req.user.id);
        res.json({ success: true, messages });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { chat, getConversations, getMessages };