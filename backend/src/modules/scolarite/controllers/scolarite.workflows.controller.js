require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.split('?')[0];
const pool = new Pool({ connectionString: cleanUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const VALID_WORKFLOW_STATUTS = ['Actif', 'Inactif'];

const getWorkflows = async (req, res) => {
  try {
    const workflows = await prisma.workflow.findMany({
      orderBy: { date_creation: 'desc' },
      include: {
        etapes: {
          orderBy: { ordre: 'asc' },
        },
        // Ajout : On compte le nombre de demandes et types de demandes liés
        _count: {
          select: { demandes: true, types_demande: true }
        }
      },
    });

    return res.status(200).json({ success: true, count: workflows.length, data: workflows });
  } catch (error) {
    console.error('[Scolarité Workflows] Failed to fetch:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des workflows.' });
  }
};

const createWorkflow = async (req, res) => {
  try {
    const { nom, description, etapes } = req.body;

    if (!nom || !nom.trim()) return res.status(400).json({ success: false, message: 'Le champ "nom" est requis.' });
    if (!Array.isArray(etapes) || etapes.length === 0) return res.status(400).json({ success: false, message: 'Le workflow doit contenir au moins une étape.' });

    const newWorkflow = await prisma.workflow.create({
      data: {
        nom: nom.trim(),
        description: description || null,
        etapes: {
          create: etapes.map((etape) => ({
            nom: etape.nom.trim(),
            ordre: Number(etape.ordre),
            role_responsable: etape.role_responsable || null,
          })),
        },
      },
      include: { 
        etapes: { orderBy: { ordre: 'asc' } },
        _count: { select: { demandes: true, types_demande: true } }
      },
    });

    return res.status(201).json({ success: true, message: 'Workflow créé avec succès.', data: newWorkflow });
  } catch (error) {
    console.error('[Scolarité Workflows] Failed to create:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la création du workflow.' });
  }
};

// NOUVEAU : Modifier un workflow complet
const updateWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, description, etapes } = req.body;

    if (!nom || !nom.trim()) return res.status(400).json({ success: false, message: 'Le champ "nom" est requis.' });
    if (!Array.isArray(etapes) || etapes.length === 0) return res.status(400).json({ success: false, message: 'Le workflow doit contenir au moins une étape.' });

    // On utilise une transaction pour supprimer les anciennes étapes et recréer les nouvelles proprement
    const updatedWorkflow = await prisma.$transaction(async (tx) => {
      // 1. Supprimer les anciennes étapes
      await tx.etapeWorkflow.deleteMany({ where: { id_workflow: id } });
      
      // 2. Mettre à jour le workflow et insérer les nouvelles étapes
      return tx.workflow.update({
        where: { id_workflow: id },
        data: {
          nom: nom.trim(),
          description: description || null,
          etapes: {
            create: etapes.map((etape) => ({
              nom: etape.nom.trim(),
              ordre: Number(etape.ordre),
              role_responsable: etape.role_responsable || null,
            })),
          },
        },
        include: { 
          etapes: { orderBy: { ordre: 'asc' } },
          _count: { select: { demandes: true, types_demande: true } }
        },
      });
    });

    return res.status(200).json({ success: true, message: 'Workflow mis à jour avec succès.', data: updatedWorkflow });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Workflow introuvable.' });
    console.error('[Scolarité Workflows] Failed to update:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour.' });
  }
};

// NOUVEAU : Supprimer un workflow
const deleteWorkflow = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si le workflow est utilisé
    const workflow = await prisma.workflow.findUnique({
      where: { id_workflow: id },
      include: { _count: { select: { demandes: true } } }
    });

    if (!workflow) return res.status(404).json({ success: false, message: 'Workflow introuvable.' });
    
    // Protection : On refuse la suppression si des demandes existent déjà pour éviter la corruption de l'historique
    if (workflow._count.demandes > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Impossible de supprimer ce workflow car il est actuellement utilisé par des demandes. Désactivez-le à la place.' 
      });
    }

    await prisma.workflow.delete({ where: { id_workflow: id } });
    return res.status(200).json({ success: true, message: 'Workflow supprimé avec succès.' });
  } catch (error) {
    console.error('[Scolarité Workflows] Failed to delete:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la suppression.' });
  }
};

const updateWorkflowStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    if (!statut || !VALID_WORKFLOW_STATUTS.includes(statut)) return res.status(400).json({ success: false, message: 'Statut invalide.' });

    const updatedWorkflow = await prisma.workflow.update({
      where: { id_workflow: id },
      data: { statut },
      include: { 
        etapes: { orderBy: { ordre: 'asc' } },
        _count: { select: { demandes: true, types_demande: true } } 
      },
    });

    return res.status(200).json({ success: true, message: `Workflow ${statut === 'Actif' ? 'activé' : 'désactivé'}.`, data: updatedWorkflow });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur de mise à jour.' });
  }
};

module.exports = { getWorkflows, createWorkflow, updateWorkflow, deleteWorkflow, updateWorkflowStatus };