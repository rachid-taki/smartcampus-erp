const pool = require("../../../config/database");

const getProfile = async (id) => {
    const { rows } = await pool.query(
        `
        SELECT
            u.id_utilisateur,
            u.nom,
            u.prenom,
            u.email,
            u.telephone,
            CASE
                WHEN u.photo IS NOT NULL
                THEN 'data:' || COALESCE(u.photo_type, 'image/jpeg') || ';base64,' || encode(u.photo, 'base64')
                ELSE NULL
            END AS photo,

            e.cne,
            e.cin,
            e.code_apogee,
            e.niveau,
            e.code_massar,
            e.date_inscription,
            e.statut,

            f.code AS filiere

        FROM utilisateur u

        INNER JOIN etudiant e
            ON u.id_utilisateur = e.id_etudiant

        INNER JOIN filiere f
            ON e.id_filiere = f.id_filiere

        WHERE u.id_utilisateur = $1
        `,
        [id]
    );

    return rows[0];
};

const getRecentRequests = async (idEtudiant) => {
    const { rows } = await pool.query(
        `
        SELECT
            d.id_demande,
            d.numero,
            d.objet,
            d.description,
            td.libelle AS type,
            d.date_creation,
            d.statut
        FROM demande d

        INNER JOIN type_demande td
            ON d.id_type = td.id_type

        WHERE d.id_etudiant = $1

        ORDER BY d.date_creation DESC
        
        `,
        [idEtudiant]
    );

    return rows.map((r) => ({
    id: r.id_demande,
    reference: r.numero,
    objet: r.objet,
    description: r.description,
    type: r.type,
    createdAt: r.date_creation,
    status: r.statut,
}));
};
const getRecentDocuments = async (idEtudiant) => {
    const { rows } = await pool.query(
        `
        SELECT
            doc.id_document,
            doc.id_demande, 
            doc.nom,
            doc.date_upload,
            doc.taille
        FROM document doc

        INNER JOIN demande d
            ON doc.id_demande = d.id_demande

        WHERE d.id_etudiant = $1

        ORDER BY doc.date_upload DESC
        
        `,
        [idEtudiant]
    );

    return rows.map((r) => ({
        id: r.id_document,
        id_demande: r.id_demande,
        name: r.nom,
        uploadedAt: r.date_upload,
        sizeKb: Math.round((r.taille || 0) / 1024),
    }));
};

const downloadDocument = async (id) => {
    const { rows } = await pool.query(
        `
        SELECT
            nom,
            type,
            contenu
        FROM document
        WHERE id_document = $1
        `,
        [id]
    );

      if (rows.length === 0) return null;

    // Mark this certificate as downloaded
    await pool.query(
        `
        UPDATE document
        SET
            telecharge = TRUE,
            date_telechargement = NOW()
        WHERE id_document = $1
        `,
        [id]
    );

    return rows[0];
};
const getRecentNotifications = async (idUtilisateur) => {

    const { rows } = await pool.query(
        `
        SELECT
            id_notification,
            titre,
            message,
            type,
            date_envoi,
            lu
        FROM notification
        WHERE id_utilisateur = $1
        ORDER BY date_envoi DESC
        LIMIT 4
        `,
        [idUtilisateur]
    );

    return rows.map((n) => ({
        id: n.id_notification,
        title: n.titre,
        message: n.message,
        category: n.type.toLowerCase(),
        createdAt: n.date_envoi,
        read: n.lu
    }));
};

const getLatestAttestation = async (idEtudiant) => {

    const { rows } = await pool.query(
        `
        SELECT
            doc.id_document,
            doc.nom,
            doc.type,
            doc.date_upload
        FROM document doc

        INNER JOIN demande d
            ON d.id_demande = doc.id_demande

        INNER JOIN type_demande td
            ON td.id_type = d.id_type

        WHERE
            d.id_etudiant = $1
            AND td.libelle IN (
                'Attestation de scolarité',
                'Certificat de scolarité',
                'Attestation de scolarite',
                'Certificat de scolarite'
            )
                AND d.statut = 'Validee'
                AND doc.telecharge = false

        ORDER BY doc.date_upload DESC
        LIMIT 1
        `,
        [idEtudiant]
    );

    if (rows.length === 0) {
        return {
            exists: false
        };
    }

    const attestation = rows[0];

    const uploadDate = new Date(attestation.date_upload);

    const oneYear = 365 * 24 * 60 * 60 * 1000;

    return {
        exists: true,
        id: attestation.id_document,
        nom: attestation.nom,
        expired: (Date.now() - uploadDate.getTime()) > oneYear
    };

};

const getAllRequests = async (idEtudiant) => {

    const { rows } = await pool.query(
        `
        SELECT
            d.id_demande,
            d.numero,
            td.libelle,
            d.date_creation,
            d.statut,
            d.date_validation
        FROM demande d
        INNER JOIN type_demande td
            ON td.id_type=d.id_type
        WHERE d.id_etudiant=$1
        ORDER BY d.date_creation DESC
        `,
        [idEtudiant]
    );

    return rows;

}; 
const getRequestTypes = async () => {

    const { rows } = await pool.query(
        `
        SELECT
            id_type,
            libelle,
            description,
            pieces_requises
        FROM type_demande
        ORDER BY delai_traitement 
        `
    );

    return rows;

};
const createRequest = async (idEtudiant, body, files = []) => {

    const numero = `DEM-${Date.now()}`;

    // Get workflow linked to the selected request type
    const workflowResult = await pool.query(
        `
        SELECT id_workflow
        FROM type_demande
        WHERE id_type = $1
        `,
        [body.id_type]
    );

    const idWorkflow =
        workflowResult.rows[0]?.id_workflow || null;

    // Insert request
    const demandeResult = await pool.query(
        `
        INSERT INTO demande(

            numero,
            id_etudiant,
            id_type,
            id_workflow,
            objet,
            description,
            statut,
            date_creation

        )

        VALUES(

            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            'Soumise',
            NOW()

        )

        RETURNING *
        `,
        [

            numero,
            idEtudiant,
            body.id_type,
            idWorkflow,
            body.objet,
            body.description,

        ]
    );

    const demande = demandeResult.rows[0];

    // Save uploaded files
    for (const file of files) {

        await pool.query(
            `
            INSERT INTO document(

                id_demande,
                nom,
                type,
                taille,
                contenu,
                date_upload,
                telecharge

            )

            VALUES(

                $1,
                $2,
                $3,
                $4,
                $5,
                NOW(),
                FALSE

            )
            `,
            [

                demande.id_demande,
                file.originalname,
                file.mimetype,
                file.size,
                file.buffer,

            ]
        );

    }

    return demande;

};
const updatePhoto = async (idUtilisateur, buffer, mimetype) => {
    const { rows } = await pool.query(
        `
        UPDATE utilisateur
        SET photo = $1, photo_type = $2
        WHERE id_utilisateur = $3
        RETURNING id_utilisateur
        `,
        [buffer, mimetype, idUtilisateur]
    );
    return rows[0];
};
const getPasswordHash = async (idUtilisateur) => {
    const { rows } = await pool.query(
        `SELECT mot_de_passe FROM utilisateur WHERE id_utilisateur = $1`,
        [idUtilisateur]
    );
    return rows[0]?.mot_de_passe || null;
};

const updatePassword = async (idUtilisateur, hashedPassword) => {
    await pool.query(
        `UPDATE utilisateur SET mot_de_passe = $1 WHERE id_utilisateur = $2`,
        [hashedPassword, idUtilisateur]
    );
    return true;
};
const getNotifications = async (idUtilisateur) => {
    const { rows } = await pool.query(
        `
        SELECT
            id_notification,
            titre,
            message,
            type,
            date_envoi,
            lu
        FROM notification
        WHERE id_utilisateur = $1
        ORDER BY date_envoi DESC
        `,
        [idUtilisateur]
    );
    return rows.map((n) => ({
        id: n.id_notification,
        title: n.titre,
        message: n.message,
        category: n.type.toLowerCase(),
        createdAt: n.date_envoi,
        read: n.lu
    }));
};

const markNotificationRead = async (idNotification) => {
    const { rows } = await pool.query(
        `
        UPDATE notification
        SET lu = TRUE
        WHERE id_notification = $1
        RETURNING id_notification
        `,
        [idNotification]
    );
    return rows[0];
};

const markAllNotificationsRead = async (idUtilisateur) => {
    const { rows } = await pool.query(
        `
        UPDATE notification
        SET lu = TRUE
        WHERE id_utilisateur = $1 AND lu = FALSE
        RETURNING id_notification
        `,
        [idUtilisateur]
    );
    return rows;
};
const getReclamationTypes = async () => {
    const { rows } = await pool.query(
        `SELECT id_type, libelle, code, categorie, delai_limite
         FROM type_reclamation
         ORDER BY categorie, libelle`
    );
    return rows.map((t) => ({
        id: t.id_type,
        libelle: t.libelle,
        code: t.code,
        categorie: t.categorie,
        delaiLimite: t.delai_limite,
    }));
};

const getReclamations = async (idEtudiant) => {
    const { rows } = await pool.query(
        `SELECT r.id_reclamation, r.objet, r.description, r.statut, r.priorite, r.date_soumission,
                t.libelle AS type_libelle, t.code AS type_code, t.categorie
         FROM reclamation r
         JOIN type_reclamation t ON t.id_type = r.id_type
         WHERE r.id_etudiant = $1
         ORDER BY r.date_soumission DESC`,
        [idEtudiant]
    );
    return rows.map((r) => ({
        id: r.id_reclamation,
        objet: r.objet,
        description: r.description,
        status: r.statut,
        priorite: r.priorite,
        createdAt: r.date_soumission,
        typeLibelle: r.type_libelle,
        typeCode: r.type_code,
        categorie: r.categorie,
    }));
};

const createReclamation = async (idEtudiant, data, file) => {
    const {
        idType,
        objet,
        description,
        categorie,
        idProfesseur,
        nomProfesseurManuel,
        dateDebut,
        dateFin,
    } = data;

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        let idCertificat = null;

        if (categorie === "CertificatMedical") {
            if (!file) {
                throw new Error("Le fichier du certificat médical est obligatoire.");
            }
            if (!dateDebut || !dateFin) {
                throw new Error("Les dates de début et de fin sont obligatoires.");
            }

            const certResult = await client.query(
                `INSERT INTO certificat_medical (id_etudiant, fichier, fichier_nom, fichier_type, fichier_taille, date_debut, date_fin, motif)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING id_certificat`,
                [
                    idEtudiant,
                    file.buffer,
                    file.originalname,
                    file.mimetype,
                    file.size,
                    dateDebut,
                    dateFin,
                    description,
                ]
            );
            idCertificat = certResult.rows[0].id_certificat;
        }

        if (categorie === "Note") {
            if (!idProfesseur && !nomProfesseurManuel) {
                throw new Error("Veuillez sélectionner ou saisir le nom du professeur.");
            }
        }

        const recResult = await client.query(
            `INSERT INTO reclamation (id_etudiant, id_type, objet, description, id_professeur, nom_professeur_manuel, id_certificat)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id_reclamation, statut, date_soumission`,
            [
                idEtudiant,
                idType,
                objet,
                description,
                categorie === "Note" && idProfesseur && idProfesseur !== "autre" ? idProfesseur : null,
                categorie === "Note" && nomProfesseurManuel ? nomProfesseurManuel : null,
                idCertificat,
            ]
        );

        await client.query("COMMIT");

        return {
            id: recResult.rows[0].id_reclamation,
            statut: recResult.rows[0].statut,
            categorie,
            idCertificat,
        };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};
const getProfessors = async () => {
    const { rows } = await pool.query(
        `SELECT p.id_professeur, u.nom, u.prenom, p.specialite
         FROM professeur p
         JOIN utilisateur u ON u.id_utilisateur = p.id_professeur
         WHERE u.actif = TRUE
         ORDER BY u.nom, u.prenom`
    );
    return rows.map((p) => ({
        id: p.id_professeur,
        nom: `${p.prenom} ${p.nom}`,
        specialite: p.specialite,
    }));
};


const getDocumentsOfficiels = async (idEtudiant) => {
    const { rows } = await pool.query(
        `SELECT
            id_document_officiel,
            nom,
            type,
            categorie,
            taille,
            date_generation,
            date_expiration,
            nombre_telechargements,
            dernier_telechargement
         FROM document_officiel
         WHERE id_etudiant = $1
         ORDER BY date_generation DESC`,
        [idEtudiant]
    );

    return rows.map((r) => ({
        id: r.id_document_officiel,
        nom: r.nom,
        type: r.type,
        categorie: r.categorie,
        taille: r.taille,
        sizeKb: Math.round((r.taille || 0) / 1024),
        dateGeneration: r.date_generation,
        dateExpiration: r.date_expiration,
        nombreTelechargements: r.nombre_telechargements,
        dernierTelechargement: r.dernier_telechargement,
        expired: r.date_expiration ? new Date(r.date_expiration) < new Date() : false,
    }));
};

const downloadDocumentOfficiel = async (idDocumentOfficiel, idEtudiant) => {
    const { rows } = await pool.query(
        `SELECT contenu, nom, type
         FROM document_officiel
         WHERE id_document_officiel = $1 AND id_etudiant = $2`,
        [idDocumentOfficiel, idEtudiant]
    );

    if (rows.length === 0) return null;

    await pool.query(
        `UPDATE document_officiel
         SET nombre_telechargements = nombre_telechargements + 1,
             dernier_telechargement = NOW()
         WHERE id_document_officiel = $1`,
        [idDocumentOfficiel]
    );

    return rows[0];
};

const getLatestAttestationOfficielle = async (idEtudiant) => {
    const { rows } = await pool.query(
        `SELECT
            id_document_officiel,
            nom,
            type,
            date_generation,
            date_expiration
         FROM document_officiel
         WHERE id_etudiant = $1
           AND categorie IN ('Attestation_Scolarite', 'Attestation')
         ORDER BY date_generation DESC
         LIMIT 1`,
        [idEtudiant]
    );

    if (rows.length === 0) {
        return { exists: false };
    }

    const att = rows[0];
    const expired = att.date_expiration
        ? new Date(att.date_expiration) < new Date()
        : false;

    return {
        exists: true,
        id: att.id_document_officiel,
        nom: att.nom,
        expired,
        dateGeneration: att.date_generation,
        dateExpiration: att.date_expiration,
    };
};

module.exports = {
    getProfile,
    getRecentRequests,
    getRecentDocuments,
    downloadDocument,
    getRecentNotifications,
    getLatestAttestation,
    getAllRequests,
    getRequestTypes,
    createRequest,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    getReclamationTypes,
    getProfessors,
    getReclamations,
    createReclamation,
    updatePhoto,
    getPasswordHash,
    updatePassword,
    getDocumentsOfficiels,
    downloadDocumentOfficiel,
    getLatestAttestationOfficielle,
    
};