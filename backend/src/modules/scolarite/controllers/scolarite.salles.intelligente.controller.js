require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const XLSX = require('xlsx');
const multer = require('multer');
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

// --- INITIALISATIONS ---
const pool = new Pool({ connectionString: (process.env.DATABASE_URL || '').split('?')[0] });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const uploadArray = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }).array('files', 1);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- SCHÉMA IA ---
const extractionSchema = {
  type: SchemaType.ARRAY,
  description: "Liste des sessions de cours extraites.",
  items: {
    type: SchemaType.OBJECT,
    properties: {
      jour: { type: SchemaType.STRING, description: "Lundi, Mardi, Mercredi..." },
      heure_debut: { type: SchemaType.STRING, description: "Format HH:mm" },
      heure_fin: { type: SchemaType.STRING, description: "Format HH:mm" },
      matiere: { type: SchemaType.STRING, description: "Nom du cours" },
      professeur: { type: SchemaType.STRING, description: "Nom du prof" },
      salle: { type: SchemaType.STRING, description: "Nom de la salle" },
    },
    required: ["jour", "heure_debut", "heure_fin", "matiere", "professeur", "salle"]
  }
};

// --- UTILITAIRES ---
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

const toMin = (t) => {
  if (t == null || t === '') return null;
  if (t instanceof Date) return t.getUTCHours() * 60 + t.getUTCMinutes();
  if (typeof t === 'number') return Math.round(t * 24 * 60) % 1440;
  
  const m = String(t).match(/(\d{1,2})[hH:](\d{1,2})/);
  if (m) return parseInt(m[1]) * 60 + parseInt(m[2]);
  
  const mHour = String(t).match(/^(\d{1,2})$/);
  if (mHour) return parseInt(mHour[1]) * 60;

  return null;
};

const toTime = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}:00`;
const overlaps = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;

function cleanSalleName(s) {
  if (!s) return null;
  return String(s).replace(/\n/g, ' ').replace(/\s+/g, ' ').replace(/Gr\s*\d+/gi, '').replace(/[P]$/, '').trim();
}

function generateCourseCode(nom) {
  if (!nom) return 'C';
  const stopWords = new Set(['le', 'la', 'les', 'de', 'du', 'des', 'et', 'en', 'a', 'au', 'aux', 'pour', 'par', 'sur', 'd', 'l']);
  const words = String(nom).replace(/['’]/g, ' ').split(/[^a-zA-ZÀ-ÿ0-9]+/);
  let acronym = '';
  for (const w of words) {
    if (w.length > 0 && !stopWords.has(w.toLowerCase())) {
      acronym += w[0].toUpperCase();
    }
  }
  return acronym.length > 0 ? acronym.substring(0, 10) : 'COURS'; 
}

// ✅ Génère STRICTEMENT les dates entre startDate et endDate
function generateDatesForDay(jourStr, startDateStr, endDateStr) {
  const cleanedJour = String(jourStr).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let targetDay = 1; 
  
  if (cleanedJour.includes('dimanche')) targetDay = 0;
  else if (cleanedJour.includes('lundi')) targetDay = 1;
  else if (cleanedJour.includes('mardi')) targetDay = 2;
  else if (cleanedJour.includes('mercredi')) targetDay = 3;
  else if (cleanedJour.includes('jeudi')) targetDay = 4;
  else if (cleanedJour.includes('vendredi')) targetDay = 5;
  else if (cleanedJour.includes('samedi')) targetDay = 6;
  
  const [sY, sM, sD] = startDateStr.split('-').map(Number);
  const [eY, eM, eD] = endDateStr.split('-').map(Number);

  let current = new Date(sY, sM - 1, sD, 0, 0, 0, 0); 
  let end = new Date(eY, eM - 1, eD, 23, 59, 59, 999);

  const dates = [];
  const daysUntilNext = (targetDay - current.getDay() + 7) % 7;
  current.setDate(current.getDate() + daysUntilNext);

  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    const dateISO = `${yyyy}-${mm}-${dd}`;
    
    if (dateISO >= startDateStr && dateISO <= endDateStr) {
      dates.push(dateISO);
    }
    current.setDate(current.getDate() + 7);
  }
  return dates;
}

// --- GESTION IA ---
async function getAvailableGeminiModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    let flashModels = data.models
      .map(m => m.name.replace('models/', ''))
      .filter(name => name.includes('flash') && !name.includes('preview') && !name.includes('lite'));
    flashModels.sort((a, b) => b.localeCompare(a));
    if (flashModels.includes('gemini-flash-latest')) {
      flashModels = ['gemini-flash-latest', ...flashModels.filter(m => m !== 'gemini-flash-latest')];
    }
    return flashModels.length > 0 ? flashModels : ['gemini-flash-latest', 'gemini-1.5-flash'];
  } catch (error) {
    return ['gemini-1.5-flash'];
  }
}

async function retryWithBackoff(apiCall, maxRetries = 3, initialDelay = 2000) {
  let delay = initialDelay;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (error.status !== 503 || i === maxRetries - 1) throw error;
      console.log(`[IA] Serveur surchargé (503). Nouvelle tentative ${i + 1}/${maxRetries} dans ${delay/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

// --- CRÉATION AUTO (Prof, Salle, Cours) ---
async function findOrCreateProfesseur(nomProf) {
  const nom = String(nomProf || 'Non Assigné').trim();
  const parts = nom.split(/\s+/);
  const nomSearch = parts[parts.length - 1] || parts[0];

  const existingUser = await prisma.utilisateur.findFirst({
    where: { OR: [{ nom: { mode: 'insensitive', contains: nomSearch } }, { prenom: { mode: 'insensitive', contains: nomSearch } }] },
  });

  if (existingUser) {
    let prof = await prisma.professeur.findUnique({ where: { id_professeur: existingUser.id_utilisateur } });
    if (prof) return prof;
    return prisma.professeur.create({ data: { id_professeur: existingUser.id_utilisateur, specialite: 'Importé EDT' } });
  }

  let roleProf = await prisma.role.findFirst({ where: { nom_role: { in: ['Professeur', 'PROFESSOR', 'Enseignant'] } } });
  if (!roleProf) {
    roleProf = await prisma.role.create({
      data: { nom_role: 'Professeur', description: 'Généré automatiquement pour EDT' }
    });
  }

  const prenom = parts.length > 1 ? parts.slice(0, -1).join(' ') : 'Pr.';
  const nomFinal = parts.length > 1 ? parts[parts.length - 1] : nom;
  const timestampStr = Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
  
  const newUser = await prisma.utilisateur.create({
    data: { 
      id_role: roleProf.id_role, 
      nom: nomFinal, 
      prenom: prenom, 
      email: `prof.${timestampStr}@smartcampus.ma`, 
      actif: true 
    },
  });
  
  await prisma.employe.create({
    data: { 
      id_employe: newUser.id_utilisateur, 
      matricule: `ENS-${timestampStr}`, 
      fonction: 'Enseignant', 
      date_embauche: new Date(), 
      statut: 'Actif' 
    },
  });
  
  return prisma.professeur.create({ data: { id_professeur: newUser.id_utilisateur, specialite: 'Importé EDT' } });
}

async function parsePdfWithAI(fileBuffer, startDateStr, endDateStr) {
  const fallbackModels = await getAvailableGeminiModels();
  const prompt = "Extrais précisément chaque session de cours de cet emploi du temps PDF.";
  
  let result = null;
  let lastError = null;

  for (const modelName of fallbackModels) {
    try {
      console.log(`[IA] Tentative d'extraction avec : ${modelName} | Période: ${startDateStr} au ${endDateStr}`);
      const model = genAI.getGenerativeModel({ 
        model: modelName, 
        generationConfig: { responseMimeType: "application/json", responseSchema: extractionSchema, temperature: 0 }
      });

      result = await retryWithBackoff(() => model.generateContent([
        prompt,
        { inlineData: { data: fileBuffer.toString("base64"), mimeType: "application/pdf" } }
      ]));

      console.log(`[IA] ✅ Succès avec le modèle : ${modelName}`);
      break; 
    } catch (error) {
      console.warn(`[IA] ⚠️ Échec avec ${modelName}. Passage à la version précédente...`);
      lastError = error;
    }
  }

  if (!result) throw new Error("Tous les modèles d'IA ont échoué. " + (lastError?.message || "Erreur inconnue"));

  let rawText = result.response.text();
  rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

  let extractedData;
  try {
    extractedData = JSON.parse(rawText);
  } catch (parseError) {
    throw new Error("L'Intelligence Artificielle a renvoyé un format illisible. Veuillez réessayer.");
  }

  const rows = [];
  const sessionsArray = Array.isArray(extractedData) ? extractedData : extractedData.sessions || [];

  for (const item of sessionsArray) {
    const dates = generateDatesForDay(item.jour, startDateStr, endDateStr);
    for (const dateISO of dates) {
      rows.push({
        coursNom: item.matiere,
        prof: item.professeur,
        salle: item.salle,
        dateISO: dateISO,
        debutMin: toMin(item.heure_debut),
        finMin: toMin(item.heure_fin),
        effectif: 30
      });
    }
  }
  return rows;
}

// --- INSERTION DES SESSIONS EN BASE ---
async function createSessions(rows, stats, anneeUniversitaire, semestre) {
  for (const r of rows) {
    if (!r.coursNom || !r.dateISO || r.debutMin == null || r.finMin == null) {
      stats.ignorees++; continue;
    }

    const professeur = await findOrCreateProfesseur(r.prof);
    if (!professeur) { stats.prof_non_trouves++; stats.ignorees++; continue; }

    let cours = await prisma.cours.findFirst({ where: { nom: { contains: r.coursNom, mode: 'insensitive' } } });
    if (!cours) {
      let baseCode = generateCourseCode(r.coursNom);
      let finalCode = baseCode;
      let counter = 1;
      while (await prisma.cours.findUnique({ where: { code: finalCode } })) {
        finalCode = `${baseCode}${counter}`;
        counter++;
      }
      cours = await prisma.cours.create({ data: { code: finalCode, nom: r.coursNom, credits: 3, coefficient: 2 } });
      stats.cours_crees++;
    }

    const salleNom = r.salle || 'À déterminer';
    const salleClean = cleanSalleName(salleNom);
    let salle = await prisma.salle.findFirst({ where: { numero: { contains: salleClean, mode: 'insensitive' } } });
    if (!salle) {
      salle = await prisma.salle.create({ data: { numero: salleClean, nom: salleClean, capacite: r.effectif || 30, type: 'Salle_Cours', statut: 'Disponible' } });
      stats.salles_creees++;
    }

    const exists = await prisma.sessionSalle.findFirst({ 
      where: { 
        id_salle: salle.id_salle, 
        date: new Date(r.dateISO), 
        heure_debut: new Date(`1970-01-01T${toTime(r.debutMin)}Z`) 
      } 
    });
    if (exists) { stats.doublons++; stats.ignorees++; continue; }

    await prisma.sessionSalle.create({
      data: {
        id_salle: salle.id_salle, 
        id_cours: cours.id_cours, 
        id_professeur: professeur.id_professeur,
        id_filiere: r.id_filiere || null, // ✅ ENREGISTREMENT STRICT DE LA FILIÈRE
        id_calendrier: anneeUniversitaire || null, 
        semestre: semestre || null,               
        date: new Date(r.dateISO), 
        heure_debut: new Date(`1970-01-01T${toTime(r.debutMin)}Z`), 
        heure_fin: new Date(`1970-01-01T${toTime(r.finMin)}Z`),
        nombre_etudiants: r.effectif, 
        statut: 'Planifiee',
      },
    });
    stats.sessions_creees++;
  }
}

// --- ANALYSE DES CONFLITS ---
async function analyserConflitsInternal() {
  let created = 0;
  await prisma.alerteIa.deleteMany({ where: { type: 'Conflit_Planning', statut: 'Nouvelle' } }).catch(() => {});

  const sessions = await prisma.sessionSalle.findMany({ include: { salle: true, cours: true, professeur: { include: { employe: { include: { utilisateur: true } } } } } });
  const mk = (salleId, desc, priorite) => prisma.alerteIa.create({ data: { id_salle: salleId, type: 'Conflit_Planning', description: desc, priorite } }).then(() => created++).catch(() => {});

  const bySalleDate = {}, byProfDate = {};
  sessions.forEach((s) => {
    const dk = `${s.id_salle}|${new Date(s.date).toISOString().split('T')[0]}`;
    const pk = `${s.id_professeur}|${new Date(s.date).toISOString().split('T')[0]}`;
    (bySalleDate[dk] = bySalleDate[dk] || []).push(s);
    (byProfDate[pk] = byProfDate[pk] || []).push(s);
  });

  for (const list of Object.values(bySalleDate)) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (overlaps(toMin(list[i].heure_debut), toMin(list[i].heure_fin), toMin(list[j].heure_debut), toMin(list[j].heure_fin))) {
          await mk(list[i].id_salle, `Conflit salle ${list[i].salle?.numero} : "${list[i].cours?.nom}" chevauche "${list[j].cours?.nom}".`, 'Haute');
        }
      }
    }
  }

  for (const list of Object.values(byProfDate)) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (list[i].id_salle !== list[j].id_salle && overlaps(toMin(list[i].heure_debut), toMin(list[i].heure_fin), toMin(list[j].heure_debut), toMin(list[j].heure_fin))) {
          const nom = `${list[i].professeur?.employe?.utilisateur?.nom || ''}`.trim();
          await mk(list[i].id_salle, `Prof ${nom} double-booké (${list[i].salle?.numero} / ${list[j].salle?.numero}).`, 'Haute');
        }
      }
    }
  }
  return created;
}

// --- FUSION DE SALLES ---
const mergeSalles = async (req, res) => {
  try {
    const { targetId, sourceIds, newName, newCapacite, newType } = req.body;
    if (!targetId || !sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Paramètres manquants pour la fusion.' });
    }
    await prisma.salle.update({
      where: { id_salle: targetId },
      data: { numero: newName, nom: newName, capacite: parseInt(newCapacite) || 30, type: newType || 'Salle_Cours' }
    });
    await prisma.sessionSalle.updateMany({ where: { id_salle: { in: sourceIds } }, data: { id_salle: targetId } });
    await prisma.reservationSalle.updateMany({ where: { id_salle: { in: sourceIds } }, data: { id_salle: targetId } });
    await prisma.alerteIa.updateMany({ where: { id_salle: { in: sourceIds } }, data: { id_salle: targetId } });
    await prisma.salle.deleteMany({ where: { id_salle: { in: sourceIds } } });
    const conflits = await analyserConflitsInternal();
    return res.status(200).json({ success: true, message: `Salles fusionnées avec succès ! ${conflits} nouveau(x) conflit(s) détecté(s).` });
  } catch (error) {
    console.error('[Salles] Erreur de fusion:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// --- CONTROLEURS ---

const extractEDT = async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ success: false, message: 'Aucun fichier.' });

    const f = files[0];
    const idFiliereUtilisateur = req.body.filiereId;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;

    if (!idFiliereUtilisateur) throw new Error(`Filière manquante pour le fichier.`);
    if (!startDate || !endDate) throw new Error("Dates de début et de fin manquantes.");

    const isPdf = f.mimetype === 'application/pdf' || f.originalname.toLowerCase().endsWith('.pdf');
    let rows = [];

    if (req.aborted) return;

    if (isPdf) {
      console.log(`[Import] Extraction IA du PDF: ${f.originalname}`);
      rows = await parsePdfWithAI(f.buffer, startDate, endDate); 
    } 

    // ✅ FILTRAGE DE SÉCURITÉ POST-EXTRACTION
    rows = rows.filter(r => {
      if (!r.dateISO) return false;
      return r.dateISO >= startDate && r.dateISO <= endDate;
    });

    // ✅ ASSOCIATION DE LA FILIÈRE POUR CHAQUE SESSION
    rows = rows.map(r => ({
      ...r,
      id_filiere: idFiliereUtilisateur,
      sourceFile: f.originalname
    }));

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('[Salles] extract error:', error);
    return res.status(500).json({ success: false, message: `Erreur extraction: ${error.message}` });
  }
};

const confirmEDT = async (req, res) => {
  try {
    const { sessions, anneeUniversitaire, semestre, startDate, endDate } = req.body;
    
    if (!sessions || !Array.isArray(sessions) || !anneeUniversitaire || !semestre) {
      return res.status(400).json({ success: false, message: 'Données, année ou semestre manquants.' });
    }

    // ✅ FILTRAGE DE SÉCURITÉ ULTIME
    let validSessions = sessions;
    if (startDate && endDate) {
      validSessions = sessions.filter(s => {
        if (!s.dateISO) return false;
        return s.dateISO >= startDate && s.dateISO <= endDate;
      });
    }

    const stats = { sessions_creees: 0, ignorees: 0, cours_crees: 0, salles_creees: 0, prof_non_trouves: 0, doublons: 0 };
    
    await createSessions(validSessions, stats, anneeUniversitaire, semestre);
    stats.conflits = await analyserConflitsInternal();

    return res.status(200).json({
      success: true, ...stats,
      details: `✅ ${stats.sessions_creees} sessions créées | 🏫 ${stats.salles_creees} nvl salles | ⚠️ ${stats.ignorees} ignorées | 🚨 ${stats.conflits} conflits détectés`,
    });
  } catch (error) {
    console.error('[Salles] confirm error:', error);
    return res.status(500).json({ success: false, message: `Erreur sauvegarde: ${error.message}` });
  }
};

const getPlanning = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const [salles, sessions, reservations] = await Promise.all([
      prisma.salle.findMany({ orderBy: { numero: 'asc' } }),
      prisma.sessionSalle.findMany({ where: { date: new Date(date) }, orderBy: { heure_debut: 'asc' }, include: { cours: true, professeur: { include: { employe: { include: { utilisateur: { select: { nom: true, prenom: true } } } } } } } }),
      prisma.reservationSalle.findMany({ where: { date: new Date(date), statut: { in: ['Demandee', 'Approuvee'] } }, orderBy: { heure_debut: 'asc' } }),
    ]);
    return res.status(200).json({ success: true, data: { salles, sessions, reservations } });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};

const analyserConflits = async (req, res) => {
  try { return res.status(200).json({ success: true, created: await analyserConflitsInternal() }); }
  catch (e) { return res.status(500).json({ success: false, message: e.message }); }
};

const getFilieres = async (req, res) => {
  try {
    const data = await prisma.filiere.findMany({ 
      orderBy: { nom: 'asc' },
      include: {
        _count: {
          select: { sessions: true }
        }
      }
    });
    return res.status(200).json({ success: true, data });
  } catch(e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des filières.' });
  }
};

const getPeriodesAcademiques = async (req, res) => {
  try {
    const calendriers = await prisma.calendrierAcademique.findMany({
      orderBy: { date_debut: 'desc' }
    });
    
    const periodesFormattees = calendriers.map(cal => {
      let semestres = [];
      
      if (cal.periodes && Array.isArray(cal.periodes) && cal.periodes.length > 0) {
        semestres = cal.periodes.map((p, index) => {
          if (typeof p === 'string') return { id_semestre: p, nom_semestre: p };
          return {
            id_semestre: p.id_semestre || p.code || p.id || `S${index + 1}`,
            nom_semestre: p.nom_semestre || p.nom || p.libelle || p.name || `Semestre ${index + 1}`
          };
        });
      } else {
        semestres = [
          { id_semestre: 'S1', nom_semestre: 'Semestre 1 (Automne)' },
          { id_semestre: 'S2', nom_semestre: 'Semestre 2 (Printemps)' }
        ];
      }
      return { id_annee: cal.id_calendrier, annee: cal.annee_scolaire, semestres: semestres };
    });
    
    return res.status(200).json({ success: true, data: periodesFormattees });
  } catch (error) {
    console.error('[Salles] Erreur récupération périodes:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { uploadArray, mergeSalles, extractEDT, confirmEDT, getPlanning, analyserConflits, getFilieres, getPeriodesAcademiques };