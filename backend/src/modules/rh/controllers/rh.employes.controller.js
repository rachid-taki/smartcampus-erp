require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcrypt');

const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.split('?')[0];
const pool = new Pool({ connectionString: cleanUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_STATUTS = ['Actif', 'Inactif', 'Conge'];

const DEFAULT_PASSWORD = 'ChangeMe123!'; // Temporary onboarding password
const SALT_ROUNDS = 10;

/**
 * GET /api/rh/employes
 *
 * Fetch all employees, joined with their utilisateur record
 * (nom, prenom, email, telephone, actif).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getEmployes = async (req, res) => {
  try {
    const employes = await prisma.employe.findMany({
      include: {
        utilisateur: {
          select: {
            id_utilisateur: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true,
            actif: true,
            date_creation: true,
          },
        },
      },
      orderBy: { date_embauche: 'desc' },
    });

    return res.status(200).json({
      success: true,
      count: employes.length,
      data: employes,
    });
  } catch (error) {
    console.error('[RH Employés] Failed to fetch employees:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération des employés.',
    });
  }
};

/**
 * GET /api/rh/employes/:id
 *
 * Fetch a single employee by id, joined with their utilisateur record.
 *
 * URL params:
 *   - id: id_employe (UUID)
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getEmployeById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: `L'identifiant fourni ("${id}") n'est pas un UUID valide.`,
      });
    }

    const employe = await prisma.employe.findUnique({
      where: { id_employe: id },
      include: {
        utilisateur: {
          select: {
            id_utilisateur: true,
            id_role: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true,
            actif: true,
            date_creation: true,
          },
        },
      },
    });

    if (!employe) {
      return res.status(404).json({
        success: false,
        message: `Aucun employé trouvé avec l'id "${id}".`,
      });
    }

    return res.status(200).json({
      success: true,
      data: employe,
    });
  } catch (error) {
    console.error('[RH Employés] Failed to fetch employee:', error);
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la récupération de l'employé.",
    });
  }
};

/**
 * POST /api/rh/employes
 *
 * Onboard a new employee. Creates both the utilisateur and employe
 * records atomically in a single transaction:
 *   1. Create utilisateur (nom, prenom, email, telephone, id_role,
 *      mot_de_passe hashed via bcrypt, actif defaults to true).
 *   2. Create employe using the newly generated id_utilisateur as
 *      id_employe (shared primary key).
 *
 * Body:
 *   - nom, prenom, email       (required — utilisateur)
 *   - telephone                (optional — utilisateur)
 *   - id_role                  (required — utilisateur)
 *   - matricule, fonction,
 *     departement, grade       (required — employe)
 *   - date_embauche            (optional — employe, defaults to now)
 *   - statut                   (optional — employe, defaults to 'Actif')
 *   - id_rh_gestionnaire       (optional — employe)
 *   - mot_de_passe             (optional — plain text, defaults to a
 *                                 standard onboarding password if omitted)
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const createEmploye = async (req, res) => {
  try {
    const {
      // utilisateur fields
      nom,
      prenom,
      email,
      telephone,
      id_role,
      mot_de_passe,
      // employe fields
      matricule,
      fonction,
      departement,
      grade,
      date_embauche,
      statut,
      id_rh_gestionnaire,
    } = req.body;

    // --- Validation: utilisateur fields ---
    if (!nom || typeof nom !== 'string' || !nom.trim()) {
      return res.status(400).json({ success: false, message: 'Le champ "nom" est requis.' });
    }
    if (!prenom || typeof prenom !== 'string' || !prenom.trim()) {
      return res.status(400).json({ success: false, message: 'Le champ "prenom" est requis.' });
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Le champ "email" est requis.' });
    }
    if (!id_role) {
      return res.status(400).json({ success: false, message: 'Le champ "id_role" est requis.' });
    }

    // --- Validation: employe fields ---
    if (!matricule || typeof matricule !== 'string' || !matricule.trim()) {
      return res.status(400).json({ success: false, message: 'Le champ "matricule" est requis.' });
    }
    if (!fonction || typeof fonction !== 'string' || !fonction.trim()) {
      return res.status(400).json({ success: false, message: 'Le champ "fonction" est requis.' });
    }
    if (!departement || typeof departement !== 'string' || !departement.trim()) {
      return res.status(400).json({ success: false, message: 'Le champ "departement" est requis.' });
    }

    if (statut && !VALID_STATUTS.includes(statut)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide: "${statut}". Valeurs autorisées: ${VALID_STATUTS.join(', ')}.`,
      });
    }

    // --- Hash the password (provided or default onboarding password) ---
    const passwordToHash = mot_de_passe || DEFAULT_PASSWORD;
    const hashedPassword = await bcrypt.hash(passwordToHash, SALT_ROUNDS);

    // --- Transaction: create utilisateur, then employe using its id ---
    const newEmploye = await prisma.$transaction(async (tx) => {
      const newUtilisateur = await tx.utilisateur.create({
        data: {
          id_role,
          nom: nom.trim(),
          prenom: prenom.trim(),
          email: email.trim().toLowerCase(),
          mot_de_passe: hashedPassword,
          telephone: telephone || null,
          actif: true,
        },
      });

      const createdEmploye = await tx.employe.create({
        data: {
          id_employe: newUtilisateur.id_utilisateur,
          matricule: matricule.trim(),
          fonction: fonction.trim(),
          departement: departement.trim(),
          date_embauche: date_embauche ? new Date(date_embauche) : new Date(),
          statut: statut || 'Actif',
          grade: grade || null,
          id_rh_gestionnaire: id_rh_gestionnaire || null,
        },
        include: {
          utilisateur: {
            select: {
              id_utilisateur: true,
              nom: true,
              prenom: true,
              email: true,
              telephone: true,
              actif: true,
              date_creation: true,
            },
          },
        },
      });

      return createdEmploye;
    });

    return res.status(201).json({
      success: true,
      message: 'Employé créé avec succès.',
      data: newEmploye,
    });
  } catch (error) {
    // Prisma P2002 = unique constraint violation (email or matricule already exists)
    if (error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(', ')
        : error.meta?.target || 'champ unique';

      return res.status(409).json({
        success: false,
        message: `Un enregistrement existe déjà avec cette valeur (${target}). Vérifiez l'email ou le matricule.`,
      });
    }

    // Prisma P2003 = foreign key constraint violation (e.g. invalid id_role)
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Référence invalide: vérifiez que "id_role" (et "id_rh_gestionnaire" le cas échéant) existent bien.',
      });
    }

    console.error('[RH Employés] Failed to create employee:', error);
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la création de l'employé.",
    });
  }
};

/**
 * PUT /api/rh/employes/:id
 *
 * Update an employee's details. Can update fields on BOTH the
 * utilisateur record (nom, prenom, telephone) and the employe record
 * (fonction, departement, grade, statut) in a single request, executed
 * atomically in a transaction.
 *
 * URL params:
 *   - id: id_employe (UUID)
 *
 * Body (all optional — only provided fields are updated):
 *   - nom, prenom, telephone           (utilisateur)
 *   - fonction, departement, grade,
 *     statut, id_rh_gestionnaire       (employe)
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const updateEmploye = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: `L'identifiant fourni ("${id}") n'est pas un UUID valide.`,
      });
    }

    const {
      // utilisateur fields
      nom,
      prenom,
      telephone,
      // employe fields
      fonction,
      departement,
      grade,
      statut,
      id_rh_gestionnaire,
    } = req.body;

    if (statut && !VALID_STATUTS.includes(statut)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide: "${statut}". Valeurs autorisées: ${VALID_STATUTS.join(', ')}.`,
      });
    }

    // --- Verify the employee exists before attempting the update ---
    const existingEmploye = await prisma.employe.findUnique({
      where: { id_employe: id },
    });

    if (!existingEmploye) {
      return res.status(404).json({
        success: false,
        message: `Aucun employé trouvé avec l'id "${id}".`,
      });
    }

    // --- Build partial update payloads (only include provided fields) ---
    const utilisateurData = {};
    if (nom !== undefined) utilisateurData.nom = nom;
    if (prenom !== undefined) utilisateurData.prenom = prenom;
    if (telephone !== undefined) utilisateurData.telephone = telephone;

    const employeData = {};
    if (fonction !== undefined) employeData.fonction = fonction;
    if (departement !== undefined) employeData.departement = departement;
    if (grade !== undefined) employeData.grade = grade;
    if (statut !== undefined) employeData.statut = statut;
    if (id_rh_gestionnaire !== undefined) employeData.id_rh_gestionnaire = id_rh_gestionnaire;

    const hasUtilisateurUpdates = Object.keys(utilisateurData).length > 0;
    const hasEmployeUpdates = Object.keys(employeData).length > 0;

    if (!hasUtilisateurUpdates && !hasEmployeUpdates) {
      return res.status(400).json({
        success: false,
        message: 'Aucun champ valide à mettre à jour n\'a été fourni.',
      });
    }

    // --- Transaction: update utilisateur (if needed) and employe (if needed) ---
    const updatedEmploye = await prisma.$transaction(async (tx) => {
      if (hasUtilisateurUpdates) {
        await tx.utilisateur.update({
          where: { id_utilisateur: id },
          data: utilisateurData,
        });
      }

      if (hasEmployeUpdates) {
        await tx.employe.update({
          where: { id_employe: id },
          data: employeData,
        });
      }

      // Return the fresh, fully joined record regardless of which parts changed
      return tx.employe.findUnique({
        where: { id_employe: id },
        include: {
          utilisateur: {
            select: {
              id_utilisateur: true,
              nom: true,
              prenom: true,
              email: true,
              telephone: true,
              actif: true,
              date_creation: true,
            },
          },
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Employé mis à jour avec succès.',
      data: updatedEmploye,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: "L'employé est introuvable ou a déjà été supprimé.",
      });
    }

    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Référence invalide: vérifiez la valeur de "id_rh_gestionnaire".',
      });
    }

    console.error('[RH Employés] Failed to update employee:', error);
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la mise à jour de l'employé.",
    });
  }
};

/**
 * DELETE /api/rh/employes/:id
 *
 * Soft-delete an employee: sets employe.statut to 'Inactif' and
 * utilisateur.actif to false, rather than physically deleting rows.
 *
 * URL params:
 *   - id: id_employe (UUID)
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const deleteEmploye = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: `L'identifiant fourni ("${id}") n'est pas un UUID valide.`,
      });
    }

    const existingEmploye = await prisma.employe.findUnique({
      where: { id_employe: id },
    });

    if (!existingEmploye) {
      return res.status(404).json({
        success: false,
        message: `Aucun employé trouvé avec l'id "${id}".`,
      });
    }

    const deactivatedEmploye = await prisma.$transaction(async (tx) => {
      await tx.utilisateur.update({
        where: { id_utilisateur: id },
        data: { actif: false },
      });

      return tx.employe.update({
        where: { id_employe: id },
        data: { statut: 'Inactif' },
        include: {
          utilisateur: {
            select: {
              id_utilisateur: true,
              nom: true,
              prenom: true,
              email: true,
              telephone: true,
              actif: true,
              date_creation: true,
            },
          },
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Employé désactivé avec succès (suppression logique).',
      data: deactivatedEmploye,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: "L'employé est introuvable ou a déjà été supprimé.",
      });
    }

    console.error('[RH Employés] Failed to soft-delete employee:', error);
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la suppression de l'employé.",
    });
  }
};

module.exports = {
  getEmployes,
  getEmployeById,
  createEmploye,
  updateEmploye,
  deleteEmploye,
};