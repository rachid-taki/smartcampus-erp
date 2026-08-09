// const pool = require("../../config/database");
const pool = require("../../../config/database");
module.exports = (permissionName) => {
  return async (req, res, next) => {
    try {
      const role = req.user.role;

      const { rows } = await pool.query(
        `
                SELECT p.nom
                FROM role r
                INNER JOIN role_permission rp
                    ON r.id_role = rp.id_role
                INNER JOIN permission p
                    ON p.id_permission = rp.id_permission
                WHERE r.nom_role = $1
                `,
        [role],
      );

      const permissions = rows.map((p) => p.nom);

      if (!permissions.includes(permissionName)) {
        return res.status(403).json({
          success: false,
          message: "Permission refusée.",
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };
};
