const auditService = require("../services/audit.service");

const getAllLogs = async (req, res) => {

    try {

        const logs = await auditService.getAllLogs();

        res.json({
            success: true,
            logs
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

const getLogById = async (req, res) => {

    try {

        const log = await auditService.getLogById(req.params.id);

        res.json({
            success: true,
            log
        });

    } catch (error) {

        res.status(404).json({
            success: false,
            message: error.message
        });

    }

};

module.exports = {
    getAllLogs,
    getLogById
};