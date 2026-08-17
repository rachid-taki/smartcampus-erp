require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const XLSX = require('xlsx');
const multer = require('multer');
const pdfParse = require('pdf-parse');

const pool = new Pool({ connectionString: (process.env.DATABASE_URL || '').split('?')[0] });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const uploadArray = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }).array('files', 10);

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

// ─── Nettoyer un nom de salle ───
function cleanSalleName(s) {
  if (!s) return null;
  return String(s)
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/Gr\s*\d+/gi, '')   // retirer "Gr1", "Gr 2"
    .replace(/[P]$/, '')          // retirer "P" final (Salle 9P → Salle 9)
    .trim();
}

// ─── Trouver ou CRÉER un professeur automatiquement ───
async function findOrCreateProfesseur(nomProf) {
  if (!nomProf) return null;
  const nom = String(nomProf).trim();
  if (!nom) return null;

  const parts = nom.split(/\s+/);
  const nomSearch = parts[parts.length - 1] || parts[0];

  // 1. Chercher d'abord un professeur existant
  const existingUser = await prisma.utilisateur.findFirst({
    where: {
      OR: [
        { nom: { mode: 'insensitive', equals: nomSearch } },
        { nom: { mode: 'insensitive', contains: nomSearch } },
        { prenom: { mode: 'insensitive', contains: nomSearch } },
      ],
    },
  });

  if (existingUser) {
    const prof = await prisma.professeur.findUnique({ where: { id_professeur: existingUser.id_utilisateur } });
    if (prof) return prof;
    // Si utilisateur existe mais pas prof, on le crée comme prof
    return prisma.professeur.create({
      data: {
        id_professeur: existingUser.id_utilisateur,
        specialite: 'Importé EDT',
        grade_academique: 'Enseignant',
      },
    });
  }

  // 2. Sinon, créer un utilisateur + professeur + employe
  const roleProf = await prisma.role.findFirst({
    where: { nom_role: { in: ['PROFESSOR', 'PROFESSEUR', 'ENSEIGNANT'] } },
  }).catch(() => null);

  if (!roleProf) {
    console.log('[Import] ⚠️ Aucun rôle PROFESSOR trouvé en DB. Création des profs impossible.');
    return null;
  }

  const prenom = parts.length > 1 ? parts.slice(0, -1).join(' ') : 'Enseignant';
  const nomFinal = parts.length > 1 ? parts[parts.length - 1] : nom;
  const email = `${prenom.toLowerCase().replace(/\s+/g, '')}.${nomFinal.toLowerCase()}@smartcampus.ma`;

  // Créer l'utilisateur
  const newUser = await prisma.utilisateur.create({
    data: {
      id_role: roleProf.id_role,
      nom: nomFinal,
      prenom: prenom,
      email: email,
      mot_de_passe: '$2b$10$defaultpasswordhash', // mot de passe par défaut
      actif: true,
    },
  });

  // Créer l'employé
  await prisma.employe.create({
    data: {
      id_employe: newUser.id_utilisateur,
      matricule: `ENS-${newUser.id_utilisateur.slice(0, 8).toUpperCase()}`,
      fonction: 'Enseignant',
      departement: 'Scolarité',
      date_embauche: new Date(),
      statut: 'Actif',
      grade: 'Enseignant',
    },
  });

  // Créer le professeur
  return prisma.professeur.create({
    data: {
      id_professeur: newUser.id_utilisateur,
      specialite: 'Importé EDT',
      grade_academique: 'Enseignant',
    },
  });
}

// ─── Parseur Excel / CSV ───
function parseExcelEDT(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const rowsRaw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  const rows = [];
  for (const raw of rowsRaw) {
    const row = {};
    Object.keys(raw).forEach((k) => { row[norm(k)] = raw[k]; });
    const get = (...keys) => {
      for (const k of keys) {
        const hit = Object.keys(row).find((rk) => rk.includes(k));
        if (hit && row[hit] !== '') return row[hit];
      }
      return null;
    };
    rows.push({
      coursCode: get('codecours', 'code'),
      coursNom: get('nomcours', 'module', 'matiere', 'cours'),
      prof: get('emailprof', 'professeur', 'enseignant', 'prof'),
      salle: get('salle', 'numero'),
      dateISO: toDateISO(get('date', 'jour')),
      debutMin: toMin(get('heuredebut', 'debut', 'start')),
      finMin: toMin(get('heurefin', 'fin', 'end')),
      filiere: get('filiere', 'departement'),
      effectif: parseInt(get('effectif', 'nombreetudiants')) || null,
    });
  }
  return rows;
}

// ─── Parseur PDF (sans produit cartésien) ───
function parsePdfEDT(text) {
  const rows = [];

  // 1. Extraire la filière
  const filiereMatch = text.match(/Management[^|]*Gouvernance[^|]*Syst[eè]mes?[^|]*d'?information/i);
  const filiere = filiereMatch ? filiereMatch[0].trim().slice(0, 50) : 'Filière inconnue';
  console.log('[PDF Parser] Filière:', filiere);

  // 2. Définir les créneaux horaires standards
  const creneaux = [
    { debut: 8 * 60 + 30, fin: 10 * 60 + 15, label: '8H30-10H15' },
    { debut: 10 * 60 + 30, fin: 12 * 60 + 15, label: '10H30-12H15' },
    { debut: 14 * 60 + 30, fin: 16 * 60 + 15, label: '14H30-16H15' },
    { debut: 16 * 60 + 30, fin: 18 * 60 + 15, label: '16H30-18H15' },
  ];

  // 3. Extraire UNIQUEMENT les cours uniques
  const coursPattern = /(M\d{2,3})\s+([^|(]+?)(?:\(([^)]+)\))?/g;
  const coursUniques = new Map();

  let match;
  while ((match = coursPattern.exec(text)) !== null) {
    const code = match[1];
    const nom = match[2].trim();
    const type = match[3] || 'CM';
    if (!coursUniques.has(code)) {
      coursUniques.set(code, { code, nom, type });
    }
  }

  // 4. Extraire les professeurs uniques
  const profPattern = /Pr\.\s*([A-ZÀ-Ý][A-ZÀ-Ý\s\-]+?)(?:\||\n|$)/g;
  const profsUniques = new Set();
  while ((match = profPattern.exec(text)) !== null) {
    profsUniques.add(match[1].trim());
  }

  // 5. Extraire les salles uniques (nettoyées)
  const sallePattern = /(Salle\s*\d+[A-Z]?|Amphi\s*\d+|Espace\s*robotique)/gi;
  const sallesUniques = new Set();
  while ((match = sallePattern.exec(text)) !== null) {
    sallesUniques.add(cleanSalleName(match[1]));
  }

  const coursArr = Array.from(coursUniques.values());
  const profsArr = Array.from(profsUniques);
  const sallesArr = Array.from(sallesUniques);

  console.log('[PDF Parser] Cours uniques:', coursArr.length);
  console.log('[PDF Parser] Profs uniques:', profsArr.length);
  console.log('[PDF Parser] Salles uniques:', sallesArr.length);

  // 6. Générer 1 session PAR COURS par semaine, sur 8 semaines (pas de produit cartésien)
  const today = new Date();
  const todayDay = today.getDay(); // 0=dim, 1=lun, ..., 6=sam

  // Jours de la semaine cibles (lundi, mardi, mercredi, jeudi, vendredi)
  const joursSemaine = [1, 2, 3, 4, 5];

  coursArr.forEach((cours, coursIdx) => {
    // Attribuer UN prof et UNE salle par cours (round-robin)
    const prof = profsArr[coursIdx % profsArr.length];
    const salle = sallesArr[coursIdx % sallesArr.length];
    const creneau = creneaux[coursIdx % creneaux.length];
    const jourSemaine = joursSemaine[coursIdx % joursSemaine.length];

    // Générer pour 8 semaines
    for (let week = 0; week < 8; week++) {
      const date = new Date(today);
      const daysUntilNext = (jourSemaine - todayDay + 7) % 7; // 0 = aujourd'hui
      date.setDate(today.getDate() + daysUntilNext + (week * 7));

      rows.push({
        coursCode: cours.code,
        coursNom: `${cours.nom} (${cours.type})`,
        prof: prof,
        salle: salle,
        dateISO: date.toISOString().split('T')[0],
        debutMin: creneau.debut,
        finMin: creneau.fin,
        filiere: filiere,
        effectif: 30,
      });
    }
  });

  console.log('[PDF Parser] Sessions générées:', rows.length);
  return rows;
}

// ─── Créer les sessions en DB ───
async function createSessions(rows, stats) {
  for (const r of rows) {
    if (!r.coursNom || !r.salle || !r.dateISO || r.debutMin == null || r.finMin == null || r.finMin <= r.debutMin) {
      stats.champs_manquants = (stats.champs_manquants || 0) + 1;
      stats.ignorees++;
      continue;
    }

    // ✅ Trouver ou CRÉER le prof automatiquement
    const professeur = await findOrCreateProfesseur(r.prof);
    if (!professeur) {
      stats.prof_non_trouves = (stats.prof_non_trouves || 0) + 1;
      stats.ignorees++;
      continue;
    }

    const code = r.coursCode || String(r.coursNom).slice(0, 30);
    let cours = await prisma.cours.findUnique({ where: { code } });
    if (!cours) {
      cours = await prisma.cours.create({ data: { code, nom: r.coursNom, credits: 3, coefficient: 2 } });
      stats.cours_crees++;
    }

    const salleClean = cleanSalleName(r.salle);
    let salle = await prisma.salle.findFirst({
      where: { numero: { contains: salleClean, mode: 'insensitive' } },
    });
    if (!salle) {
      salle = await prisma.salle.create({
        data: {
          numero: salleClean,
          nom: salleClean,
          capacite: r.effectif || 30,
          type: salleClean.includes('Amphi') ? 'Amphitheatre' : 'Salle_Cours',
          statut: 'Disponible',
        },
      });
      stats.salles_creees++;
    }

    const exists = await prisma.sessionSalle.findFirst({
      where: {
        id_salle: salle.id_salle,
        date: new Date(r.dateISO),
        heure_debut: new Date(`1970-01-01T${toTime(r.debutMin)}`),
      },
    });
    if (exists) {
      stats.doublons = (stats.doublons || 0) + 1;
      stats.ignorees++;
      continue;
    }

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
      },
    });
    stats.sessions_creees++;
  }
}

async function analyserConflitsInternal() {
  let created = 0;

  await prisma.alerteIa.deleteMany({
    where: { type: 'Conflit_Planning', statut: 'Nouvelle' },
  }).catch(() => {});

  const sessions = await prisma.sessionSalle.findMany({
    include: {
      salle: true,
      cours: true,
      professeur: {
        include: {
          employe: {
            include: {
              utilisateur: { select: { nom: true, prenom: true } },
            },
          },
        },
      },
    },
  });

  const mk = (salleId, desc, priorite) =>
    prisma.alerteIa.create({
      data: { id_salle: salleId, type: 'Conflit_Planning', description: desc, priorite },
    }).then(() => created++).catch(() => {});

  const bySalleDate = {};
  const byProfDate = {};
  sessions.forEach((s) => {
    const dk = `${s.id_salle}|${new Date(s.date).toISOString().split('T')[0]}`;
    const pk = `${s.id_professeur}|${new Date(s.date).toISOString().split('T')[0]}`;
    (bySalleDate[dk] = bySalleDate[dk] || []).push(s);
    (byProfDate[pk] = byProfDate[pk] || []).push(s);
  });

  for (const list of Object.values(bySalleDate)) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (overlaps(toMin(a.heure_debut), toMin(a.heure_fin), toMin(b.heure_debut), toMin(b.heure_fin))) {
          await mk(a.id_salle, `Conflit salle ${a.salle?.numero} : "${a.cours?.nom}" chevauche "${b.cours?.nom}".`, 'Haute');
        }
      }
    }
  }

  for (const list of Object.values(byProfDate)) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.id_salle !== b.id_salle && overlaps(toMin(a.heure_debut), toMin(a.heure_fin), toMin(b.heure_debut), toMin(b.heure_fin))) {
          const nom = `${a.professeur?.employe?.utilisateur?.prenom || ''} ${a.professeur?.employe?.utilisateur?.nom || ''}`.trim();
          await mk(a.id_salle, `Prof ${nom} double-booké (${a.salle?.numero} / ${b.salle?.numero}).`, 'Haute');
        }
      }
    }
  }

  const reservations = await prisma.reservationSalle.findMany({
    where: { statut: { in: ['Demandee', 'Approuvee'] } },
    include: { salle: true, demandeur: { select: { nom: true, prenom: true } } },
  });

  for (const r of reservations) {
    const rd = new Date(r.date).toISOString().split('T')[0];
    for (const s of sessions.filter((s) => s.id_salle === r.id_salle && new Date(s.date).toISOString().split('T')[0] === rd)) {
      if (overlaps(toMin(r.heure_debut), toMin(r.heure_fin), toMin(s.heure_debut), toMin(s.heure_fin))) {
        await mk(r.id_salle, `Réservation "${r.motif}" en conflit avec "${s.cours?.nom}" en salle ${r.salle?.numero}.`, 'Urgente');
      }
    }
  }

  for (const s of sessions) {
    if (s.nombre_etudiants && s.salle && s.nombre_etudiants > s.salle.capacite) {
      await prisma.alerteIa.create({
        data: {
          id_salle: s.id_salle,
          type: 'Surcharge',
          priorite: 'Haute',
          description: `Salle ${s.salle.numero} surchargée (${s.nombre_etudiants}/${s.salle.capacite}).`,
        },
      }).then(() => created++).catch(() => {});
    }
  }

  return created;
}

// ─── Import EDT ───
const importEDT = async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ success: false, message: 'Aucun fichier.' });

    const stats = {
      fichiers: files.length,
      sessions_creees: 0,
      ignorees: 0,
      cours_crees: 0,
      salles_creees: 0,
      profs_crees: 0,
      champs_manquants: 0,
      prof_non_trouves: 0,
      doublons: 0,
      pdf_traites: 0,
      excel_traites: 0,
    };

    for (const f of files) {
      const isPdf = f.mimetype === 'application/pdf' || f.originalname.toLowerCase().endsWith('.pdf');
      let rows = [];

      if (isPdf) {
        try {
          console.log('[Import] Parsing PDF:', f.originalname);
          const pdf = await pdfParse(f.buffer);
          console.log('[Import] PDF text length:', pdf.text.length);
          rows = parsePdfEDT(pdf.text);
          stats.pdf_traites++;
        } catch (err) {
          console.error('[Import] PDF parse error:', err.message);
          stats.ignorees++;
          continue;
        }
      } else {
        rows = parseExcelEDT(f.buffer);
        stats.excel_traites++;
      }

      console.log(`[Import] File ${f.originalname}: ${rows.length} rows extracted`);
      await createSessions(rows, stats);
    }

    stats.conflits = await analyserConflitsInternal();

    // Compter les profs créés (approximation)
    stats.profs_crees = await prisma.professeur.count({
      where: { specialite: 'Importé EDT' },
    }).catch(() => 0);

    return res.status(200).json({
      success: true,
      ...stats,
      details: `✅ ${stats.sessions_creees} sessions créées | 📚 ${stats.cours_crees} cours | 🏫 ${stats.salles_creees} salles | 👨‍🏫 ${stats.profs_crees} profs créés | ⚠️ ${stats.ignorees} ignorées (${stats.prof_non_trouves} profs introuvables, ${stats.doublons} doublons, ${stats.champs_manquants} champs manquants) | 🚨 ${stats.conflits} conflits`,
    });
  } catch (error) {
    console.error('[Salles] import EDT error:', error);
    return res.status(500).json({ success: false, message: `Erreur import: ${error.message}`, stack: error.stack });
  }
};

const analyserConflits = async (req, res) => {
  try {
    return res.status(200).json({ success: true, created: await analyserConflitsInternal() });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const getPlanning = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const [salles, sessions, reservations] = await Promise.all([
      prisma.salle.findMany({ orderBy: { numero: 'asc' } }),
      prisma.sessionSalle.findMany({
        where: { date: new Date(date) },
        orderBy: { heure_debut: 'asc' },
        include: {
          cours: true,
          professeur: {
            include: {
              employe: {
                include: {
                  utilisateur: { select: { nom: true, prenom: true, email: true } },
                },
              },
            },
          },
        },
      }),
      prisma.reservationSalle.findMany({
        where: { date: new Date(date), statut: { in: ['Demandee', 'Approuvee'] } },
        orderBy: { heure_debut: 'asc' },
        include: {
          demandeur: { select: { nom: true, prenom: true } },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: { salles, sessions, reservations },
    });
  } catch (error) {
    console.error('[Salles] getPlanning error:', error);
    return res.status(500).json({
      success: false,
      message: `Erreur: ${error.message}`,
    });
  }
};

const getFilieres = async (req, res) => {
  const data = await prisma.filiere.findMany({ orderBy: { nom: 'asc' } }).catch(() => []);
  return res.status(200).json({ success: true, data });
};

module.exports = {
  uploadArray,
  importEDT,
  getPlanning,
  analyserConflits,
  getFilieres,
};