const notificationService = require("../services/notification.service");

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

module.exports = { getPreferences, updatePreferences };