const notificationService = require("../services/notification.service");

const getNotifications = async (req, res) => {
    try {
        // req.user est injecté par votre authMiddleware
        const userId = req.user.id_utilisateur || req.user.id; 
        const notifications = await notificationService.getDbNotifications(userId);
        res.json({ success: true, data: notifications });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getPreferences = async (req, res) => {
    try {
        const prefs = await notificationService.getPreferences(req.user.id);
        res.json({ success: true, preferences: prefs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const updatePreferences = async (req, res) => {
    try {
        const prefs = await notificationService.updatePreferences(req.user.id, req.body);
        res.json({ success: true, preferences: prefs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const markAsRead = async (req, res) => {
    try {
        const userId = req.user.id_utilisateur || req.user.id;
        const { id } = req.params;
        const notif = await notificationService.markAsRead(userId, id);
        if (!notif) return res.status(404).json({ success: false, message: "Notification introuvable" });
        res.json({ success: true, data: notif });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id_utilisateur || req.user.id;
        const count = await notificationService.markAllAsRead(userId);
        res.json({ success: true, updated: count });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getPreferences, updatePreferences, getNotifications, markAsRead, markAllAsRead };