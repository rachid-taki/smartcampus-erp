const cron = require("node-cron");
const { cleanupOldConversations } = require("../modules/assistant/services/assistant.service");

const startAssistantCleanup = () => {
    cron.schedule("*/5 * * * *", async () => {
        try {
            const count = await cleanupOldConversations(null);
            if (count > 0) {
                console.log(`🧹 Nettoyage assistant : ${count} conversation(s) supprimée(s)`);
            }
        } catch (err) {
            console.error("Erreur nettoyage assistant:", err.message);
        }
    });
    console.log("🧹 Nettoyage assistant planifié (toutes les 5 min)");
};

module.exports = { startAssistantCleanup };