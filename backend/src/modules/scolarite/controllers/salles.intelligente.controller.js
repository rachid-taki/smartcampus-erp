require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const XLSX = require('xlsx');
const multer = require('multer');
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

const pool = new Pool({ connectionString: (process.env.DATABASE_URL || '').split('?')[0] });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const uploadArray = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }).array('files', 10);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const scheduleSchema = {
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

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
const toMin = (t) => {
  if (t == null || t === '') return null;
  if (t instanceof Date) return t.getUTCHours() * 60 + t.getUTCMinutes();
  if (typeof t === 'number') return Math.round(t * 24 * 60) % 1440;
  const m = String(t).match(/(\d{1,2})[hH:](\d{2})/);
  return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : null;
};
const toTime = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}:00`;
const toDateISO = (d) => {
  if (d instanceof Date && !isNaN(d)) return d.toISOString().split('T')[0];
  const s = String(d);
  let m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const fr = s.match(/(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/);
  if (fr) return `${fr[3]}-${fr[2].padStart(2, '0')}-${fr[1].padStart(2, '0')}`;
  return null;
};
const overlaps = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;

function cleanSalleName(s) {
  if (!s) return null;
  return String(s).replace(/\n/g, ' ').replace(/\s+/g, ' ').replace(/Gr\s*\d+/gi, '').replace(/[P]$/, '').trim();
}

function generateDatesForDay(jourStr, weeks = 8) {
  const daysMap = { 'dimanche': 0, 'lundi': 1, 'mardi': 2, 'mercredi': 3, 'jeudi': 4, 'vendredi': 5, 'samedi': 6 };
  const targetDay = daysMap[String(jourStr).toLowerCase().trim()] ?? 1;
  const today = new Date();
  const daysUntilNext = (targetDay - today.getDay() + 7) % 7;
  const dates = [];
  for (let w = 0; w < weeks; w++) {
    const d = new Date(today);
    d.setDate(today.getDate() + daysUntilNext + (w * 7));
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
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
    return flashModels.length > 0 ? flashModels : ['gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-2.5-flash'];
  } catch (error) {
    return ['gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-2.5-flash'];
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

async function findOrCreateProfesseur(nomProf) {
  if (!nomProf) return null;
  const nom = String(nomProf).trim();
  const parts = nom.split(/\s+/);
  const nomSearch = parts[parts.length - 1] || parts[0];

  const existingUser = await prisma.utilisateur.findFirst({
    where: { OR: [{ nom: { mode: 'insensitive', contains: nomSearch } }, { prenom: { mode: 'insensitive', contains: nomSearch } }] },
  });

  if (existingUser) {
    const prof = await prisma.professeur.findUnique({ where: { id_professeur: existingUser.id_utilisateur } });
    if (prof) return prof;
    return prisma.professeur.create({ data: { id_professeur: existingUser.id_utilisateur, specialite: 'Importé EDT' } });
  }

  const roleProf = await prisma.role.findFirst({ where: { nom_role: { in: ['Professeur', 'PROFESSOR'] } } });
  if (!roleProf) return null;

  const prenom = parts.length > 1 ? parts.slice(0, -1).join(' ') : 'Enseignant';
  const nomFinal = parts.length > 1 ? parts[parts.length - 1] : nom;
  const newUser = await prisma.utilisateur.create({
    data: { id_role: roleProf.id_role, nom: nomFinal, prenom, email: `${prenom.toLowerCase()}.${nomFinal.toLowerCase()}@smartcampus.ma`, actif: true },
  });
  await prisma.employe.create({
    data: { id_employe: newUser.id_utilisateur, matricule: `ENS-${Date.now()}`, fonction: 'Enseignant', date_embauche: new Date(), statut: 'Actif' },
  });
  return prisma.professeur.create({ data: { id_professeur: newUser.id_utilisateur, specialite: 'Importé EDT' } });
}

async function parsePdfWithAI(fileBuffer) {
  const fallbackModels = await getAvailableGeminiModels();
  const prompt = "Extrais précisément chaque session de cours de cet emploi du temps PDF.";
  
  let result = null;
  let lastError = null;

  for (const modelName of fallbackModels) {
    try {
      console.log(`[IA] Tentative d'extraction avec : ${modelName}`);
      const model = genAI.getGenerativeModel({ 
        model: modelName, 
        generationConfig: { responseMimeType: "application/json", responseSchema: scheduleSchema, temperature: 0 }
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

  const extractedData = JSON.parse(result.response.text());
  const rows = [];

  for (const item of extractedData) {
    const dates = generateDatesForDay(item.jour, 8);
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

function parseExcelEDT(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const rowsRaw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  const rows = [];
  for (const raw of rowsRaw) {
    const row = {}; Object.keys(raw).forEach((k) => { row[norm(k)] = raw[k]; });
    const get = (...keys) => { for (const k of keys) { const hit = Object.keys(row).find((rk) => rk.includes(k)); if (hit && row[hit] !== '') return row[hit]; } return null; };
    rows.push({
      coursNom: get('nomcours', 'module', 'matiere'),
      prof: get('emailprof', 'professeur'),
      salle: get('salle', 'numero'),
      dateISO: toDateISO(get('date', 'jour')),
      debutMin: toMin(get('heuredebut', 'debut')),
      finMin: toMin(get('heurefin', 'fin')),
      effectif: parseInt(get('effectif')) || null,
    });
  }
  return rows;
}

async function createSessions(rows, stats, anneeUniversitaire, semestre) {
  for (const r of rows) {
    if (!r.coursNom || !r.salle || !r.dateISO || r.debutMin == null || r.finMin == null) {
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

    const salleClean = cleanSalleName(r.salle);
    let salle = await prisma.salle.findFirst({ where: { numero: { contains: salleClean, mode: 'insensitive' } } });
    if (!salle) {
      salle = await prisma.salle.create({ data: { numero: salleClean, nom: salleClean, capacite: r.effectif || 30, type: 'Salle_Cours', statut: 'Disponible' } });
      stats.salles_creees++;
    }

    const exists = await prisma.sessionSalle.findFirst({ where: { id_salle: salle.id_salle, date: new Date(r.dateISO), heure_debut: new Date(`1970-01-01T${toTime(r.debutMin)}Z`) } });
    if (exists) { stats.doublons++; stats.ignorees++; continue; }

    await prisma.sessionSalle.create({
      data: {
        id_salle: salle.id_salle, 
        id_cours: cours.id_cours, 
        id_professeur: professeur.id_professeur,
        date: new Date(r.dateISO), 
        heure_debut: new Date(`1970-01-01T${toTime(r.debutMin)}Z`), 
        heure_fin: new Date(`1970-01-01T${toTime(r.finMin)}Z`),
        nombre_etudiants: r.effectif, 
        statut: 'Planifiee',
        
        // DÉCOMMENTEZ CES DEUX LIGNES :
        id_calendrier: anneeUniversitaire,
        semestre: semestre
      },
    });
    stats.sessions_creees++;
  }
}

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

// --- FUSION DE SALLES (MERGE) ---
const mergeSalles = async (req, res) => {
  try {
    const { targetId, sourceIds, newName, newCapacite, newType } = req.body;

    if (!targetId || !sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Paramètres manquants pour la fusion.' });
    }

    // 1. Mettre à jour la salle principale (cible) avec les nouvelles informations
    await prisma.salle.update({
      where: { id_salle: targetId },
      data: {
        numero: newName,
        nom: newName,
        capacite: parseInt(newCapacite) || 30,
        type: newType || 'Salle_Cours'
      }
    });

    // 2. Transférer toutes les dépendances (Sessions, Réservations, Alertes) vers la salle principale
    await prisma.sessionSalle.updateMany({
      where: { id_salle: { in: sourceIds } },
      data: { id_salle: targetId }
    });

    await prisma.reservationSalle.updateMany({
      where: { id_salle: { in: sourceIds } },
      data: { id_salle: targetId }
    });

    await prisma.alerteIa.updateMany({
      where: { id_salle: { in: sourceIds } },
      data: { id_salle: targetId }
    });

    // 3. Supprimer définitivement les salles doublons
    await prisma.salle.deleteMany({
      where: { id_salle: { in: sourceIds } }
    });

    // 4. Relancer l'analyse IA au cas où la fusion a créé des superpositions horaires
    const conflits = await analyserConflitsInternal();

    return res.status(200).json({ 
      success: true, 
      message: `Salles fusionnées avec succès ! ${conflits} nouveau(x) conflit(s) détecté(s).` 
    });
  } catch (error) {
    console.error('[Salles] Erreur de fusion:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// --- LES 2 ÉTAPES POUR L'UI ---
const extractEDT = async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ success: false, message: 'Aucun fichier.' });

    let allRows = [];
    for (const f of files) {
      const isPdf = f.mimetype === 'application/pdf' || f.originalname.toLowerCase().endsWith('.pdf');
      let rows = [];
      if (isPdf) {
        console.log(`[Import] Extraction IA du PDF: ${f.originalname}`);
        rows = await parsePdfWithAI(f.buffer); 
      } else {
        console.log(`[Import] Extraction Excel: ${f.originalname}`);
        rows = parseExcelEDT(f.buffer);
      }
      allRows = [...allRows, ...rows];
    }
    return res.status(200).json({ success: true, data: allRows });
  } catch (error) {
    console.error('[Salles] extract error:', error);
    return res.status(500).json({ success: false, message: `Erreur extraction: ${error.message}` });
  }
};

const confirmEDT = async (req, res) => {
  try {
    // On extrait l'année universitaire et le semestre envoyés par le frontend
    const { sessions, anneeUniversitaire, semestre } = req.body;
    
    if (!sessions || !Array.isArray(sessions) || !anneeUniversitaire || !semestre) {
      return res.status(400).json({ success: false, message: 'Données, année ou semestre manquants.' });
    }
    const stats = { sessions_creees: 0, ignorees: 0, cours_crees: 0, salles_creees: 0, prof_non_trouves: 0, doublons: 0 };
    
    // On les transmet à la fonction de création
    await createSessions(sessions, stats, anneeUniversitaire, semestre);
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
  const data = await prisma.filiere.findMany({ orderBy: { nom: 'asc' } }).catch(() => []);
  return res.status(200).json({ success: true, data });
};

// --- RÉCUPÉRATION DES ANNÉES ET SEMESTRES ---
const getPeriodesAcademiques = async (req, res) => {
  try {
    const calendriers = await prisma.calendrierAcademique.findMany({
      orderBy: { date_debut: 'desc' }
    });
    
    const periodesFormattees = calendriers.map(cal => {
      let semestres = [];
      
      // On vérifie si periodes existe, si c'est un tableau, ET s'il n'est pas vide
      if (cal.periodes && Array.isArray(cal.periodes) && cal.periodes.length > 0) {
        
        semestres = cal.periodes.map((p, index) => {
          // Cas 1 : Le JSON est un simple tableau de texte ex: ["S1", "S2"]
          if (typeof p === 'string') {
            return { id_semestre: p, nom_semestre: p };
          }
          
          // Cas 2 : C'est un objet, on cherche intelligemment les clés peu importe leur nom
          return {
            id_semestre: p.id_semestre || p.code || p.id || `S${index + 1}`,
            nom_semestre: p.nom_semestre || p.nom || p.libelle || p.name || `Semestre ${index + 1}`
          };
        });

      } else {
        // Fallback sécurisé : Si le JSON est vide [], null ou invalide, on met les standards
        semestres = [
          { id_semestre: 'S1', nom_semestre: 'Semestre 1 (Automne)' },
          { id_semestre: 'S2', nom_semestre: 'Semestre 2 (Printemps)' }
        ];
      }

      return {
        id_annee: cal.id_calendrier,
        annee: cal.annee_scolaire,
        semestres: semestres
      };
    });
    
    return res.status(200).json({ success: true, data: periodesFormattees });
  } catch (error) {
    console.error('[Salles] Erreur récupération périodes:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// VÉRIFIEZ BIEN CETTE LIGNE, extractEDT ET confirmEDT SONT EXPORTÉS
module.exports = { uploadArray, mergeSalles, extractEDT, confirmEDT, getPlanning, analyserConflits, getFilieres, getPeriodesAcademiques };