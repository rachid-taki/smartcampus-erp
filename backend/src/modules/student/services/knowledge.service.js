const pool = require("../../../config/database");

const searchKnowledge = async (query) => {
    const { rows } = await pool.query(
        `SELECT 
            id_base,
            titre,
            contenu,
            categorie,
            ts_rank(search_vector, plainto_tsquery('french', $1)) AS relevance
         FROM base_connaissance
         WHERE search_vector @@ plainto_tsquery('french', $1)
         ORDER BY relevance DESC
         LIMIT 3`,
        [query]
    );

    return rows.map((r) => ({
        id: r.id_base,
        titre: r.titre,
        contenu: r.contenu,
        categorie: r.categorie,
        relevance: Math.round(r.relevance * 100) / 100,
    }));
};

const getKnowledgeByCategory = async (categorie) => {
    const { rows } = await pool.query(
        `SELECT id_base, titre, contenu, categorie
         FROM base_connaissance
         WHERE categorie = $1
         ORDER BY titre`,
        [categorie]
    );
    return rows;
};

const getAllCategories = async () => {
    const { rows } = await pool.query(
        `SELECT DISTINCT categorie, COUNT(*) as count
         FROM base_connaissance
         GROUP BY categorie
         ORDER BY categorie`
    );
    return rows;
};

module.exports = {
    searchKnowledge,
    getKnowledgeByCategory,
    getAllCategories,
};