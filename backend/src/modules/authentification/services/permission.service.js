// const pool = require("../config/database");

const pool = require("../../../config/database");
// get all permissions 
const getAllPermissions = async () => {

    const { rows } = await pool.query(`
        SELECT
            id_permission,
            nom,
            module,
            description
        FROM permission
        ORDER BY module, nom
    `);

    return rows;
};
// get permsissions by id 
const getPermissionById = async (id) => {

    const { rows } = await pool.query(
        `
        SELECT
            id_permission,
            nom,
            module,
            description
        FROM permission
        WHERE id_permission = $1
        `,
        [id]
    );

    if (rows.length === 0) {
        throw new Error("Permission introuvable.");
    }

    return rows[0];
};

// creat permissions 
const createPermission = async (data) => {

    const { nom, module, description } = data;

    const check = await pool.query(
        `
        SELECT *
        FROM permission
        WHERE nom = $1
        AND module = $2
        `,
        [nom, module]
    );

    if (check.rows.length > 0) {
        throw new Error("Cette permission existe déjà.");
    }

    const { rows } = await pool.query(
        `
        INSERT INTO permission(
            nom,
            module,
            description
        )
        VALUES($1,$2,$3)
        RETURNING
            id_permission,
            nom,
            module,
            description
        `,
        [nom, module, description]
    );

    return rows[0];
};
// update a permission by id 
const updatePermission = async (id, data) => {

    const { nom, module, description } = data;

    const check = await pool.query(
        `
        SELECT *
        FROM permission
        WHERE id_permission = $1
        `,
        [id]
    );

    if (check.rows.length === 0) {
        throw new Error("Permission introuvable.");
    }

    const duplicate = await pool.query(
        `
        SELECT *
        FROM permission
        WHERE nom = $1
        AND module = $2
        AND id_permission <> $3
        `,
        [nom, module, id]
    );

    if (duplicate.rows.length > 0) {
        throw new Error("Une permission avec ce nom existe déjà.");
    }

    const { rows } = await pool.query(
        `
        UPDATE permission
        SET
            nom = $1,
            module = $2,
            description = $3
        WHERE id_permission = $4
        RETURNING
            id_permission,
            nom,
            module,
            description
        `,
        [nom, module, description, id]
    );

    return rows[0];
};
// delet une permission par le super admin 
const deletePermission = async (id) => {

    const check = await pool.query(
        `
        SELECT *
        FROM permission
        WHERE id_permission = $1
        `,
        [id]
    );

    if (check.rows.length === 0) {
        throw new Error("Permission introuvable.");
    }

    await pool.query(
        `
        DELETE FROM permission
        WHERE id_permission = $1
        `,
        [id]
    );

    return;
};
module.exports = {
    getAllPermissions,
    getPermissionById,
    createPermission,
    updatePermission,
    deletePermission
};