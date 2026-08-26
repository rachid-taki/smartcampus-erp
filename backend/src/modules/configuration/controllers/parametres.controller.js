require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

BigInt.prototype.toJSON = function () { return this.toString(); };

const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.split('?')[0];
const pool = new Pool({ connectionString: cleanUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 🟢 LE CACHE EN MÉMOIRE RAM
let parametresCache = null;

const validateValeur = (valeur, typeExpected) => {
  if (valeur === null || valeur === undefined || valeur === '') return { valid: true, parsed: null };
  const strValeur = String(valeur).trim();
  switch (typeExpected) {
    case 'Integer':
      const parsedInt = parseInt(strValeur, 10);
      if (isNaN(parsedInt)) return { valid: false, message: "La valeur doit être un entier." };
      return { valid: true, parsed: String(parsedInt) };
    case 'Boolean':
      const lowerVal = strValeur.toLowerCase();
      if (!['true', 'false', '1', '0'].includes(lowerVal)) return { valid: false, message: "Doit être 'true' ou 'false'." };
      return { valid: true, parsed: (lowerVal === 'true' || lowerVal === '1') ? 'true' : 'false' };
    case 'JSON':
      try { return { valid: true, parsed: JSON.stringify(typeof valeur === 'string' ? JSON.parse(valeur) : valeur) }; } 
      catch (e) { return { valid: false, message: "Doit être un JSON valide." }; }
    case 'String':
    default:
      return { valid: true, parsed: strValeur };
  }
};

exports.getParametres = async (req, res) => {
  try {
    const { module } = req.query;
    
    // 🟢 Si on demande tout (sans filtre module) et que le cache existe -> RENVOI INSTANTANÉ
    if (!module && parametresCache) {
      return res.status(200).json({ success: true, count: parametresCache.length, data: parametresCache, source: 'cache' });
    }

    const where = module ? { module } : {};
    const parametres = await prisma.parametreSysteme.findMany({
      where, orderBy: [{ module: 'asc' }, { cle: 'asc' }]
    });

    // 🟢 On sauvegarde dans le cache si on a tout récupéré
    if (!module) parametresCache = parametres;

    return res.status(200).json({ success: true, count: parametres.length, data: parametres, source: 'database' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { module: 'Configuration', entite: 'ParametreSysteme' },
      orderBy: { date_action: 'desc' },
      take: 15,
    });
    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur d\'audit.' });
  }
};

exports.getParametreByCle = async (req, res) => {
  try {
    const { cle } = req.params;
    const parametre = await prisma.parametreSysteme.findUnique({ where: { cle } });
    if (!parametre) return res.status(404).json({ success: false, message: `Introuvable.` });
    return res.status(200).json({ success: true, data: parametre });
  } catch (error) { return res.status(500).json({ success: false, message: 'Erreur.' }); }
};

exports.updateParametre = async (req, res) => {
  try {
    const { cle } = req.params;
    const { valeur } = req.body;

    const existing = await prisma.parametreSysteme.findUnique({ where: { cle } });
    if (!existing) return res.status(404).json({ success: false, message: `N'existe pas.` });

    const validation = validateValeur(valeur, existing.type);
    if (!validation.valid) return res.status(400).json({ success: false, message: validation.message });

    const [updated, audit] = await prisma.$transaction([
      prisma.parametreSysteme.update({
        where: { cle },
        data: { valeur: validation.parsed }
      }),
      prisma.auditLog.create({
        data: {
          action: 'UPDATE', module: 'Configuration', entite: 'ParametreSysteme',
          entite_id: existing.id_parametre,
          donnees_avant: { cle: existing.cle, valeur: existing.valeur },
          donnees_apres: { cle: existing.cle, valeur: validation.parsed }
        }
      })
    ]);

    // 🟢 ON VIDE LE CACHE CAR UNE DONNÉE A CHANGÉ !
    parametresCache = null;

    return res.status(200).json({ success: true, message: `Mis à jour avec succès.`, data: updated });
  } catch (error) { return res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
};