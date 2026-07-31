const studentService = require("../services/student.service");

const getProfile = async (req, res) => {
    try {

        const student = await studentService.getProfile(
            req.user.id_utilisateur
        );

        res.json({
            success: true,
            user: student,
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message,
        });

    }
};

module.exports = {
    getProfile,
};