// const pool = require("../config/database");
const pool = require("../../../config/database");

const assignPermissions = async (roleId, permissions) => {

    // vérifier que le rôle existe
    const role = await pool.query(
        "SELECT * FROM role WHERE id_role = $1",
        [roleId]
    );

    if (role.rows.length === 0) {
        throw new Error("Rôle introuvable.");
    }

    // supprimer les anciennes permissions
    await pool.query(
        "DELETE FROM role_permission WHERE id_role = $1",
        [roleId]
    );

    // ajouter les nouvelles permissions
    for (const permissionId of permissions) {

        await pool.query(
            `
            INSERT INTO role_permission(
                id_role,
                id_permission
            )
            VALUES($1,$2)
            `,
            [roleId, permissionId]
        );

    }

    return;
};
// get permission of a role
const getRolePermissions = async (roleId) => {

    const role = await pool.query(
        "SELECT * FROM role WHERE id_role = $1",
        [roleId]
    );

    if (role.rows.length === 0) {
        throw new Error("Rôle introuvable.");
    }

    const { rows } = await pool.query(
        `
        SELECT
            p.id_permission,
            p.nom,
            p.module,
            p.description
        FROM permission p
        INNER JOIN role_permission rp
            ON rp.id_permission = p.id_permission
        WHERE rp.id_role = $1
        ORDER BY p.module, p.nom
        `,
        [roleId]
    );

    return rows;
};
module.exports = {
    assignPermissions,
    getRolePermissions
};