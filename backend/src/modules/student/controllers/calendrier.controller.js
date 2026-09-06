const pool = require("../../../config/database");


exports.getCalendrier = async (req, res) => {
  try {
    const etudiantId = req.user.id;

    const etudiantResult = await pool.query(
      `SELECT e.id_filiere, f.nom as filiere_nom, f.code as filiere_code
       FROM etudiant e
       JOIN filiere f ON f.id_filiere = e.id_filiere
       WHERE e.id_etudiant = $1`,
      [etudiantId]
    );

    if (etudiantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Étudiant non trouvé",
      });
    }

    const { id_filiere, filiere_nom } = etudiantResult.rows[0];

    const calendriersResult = await pool.query(
      `SELECT id_calendrier, nom, annee_scolaire, date_debut, date_fin, periodes
       FROM calendrier_academique
       ORDER BY date_debut DESC`
    );

    
    const sessionsResult = await pool.query(
      `SELECT 
         ss.id_session,
         ss.date,
         ss.heure_debut,
         ss.heure_fin,
         ss.statut,
         ss.semestre,
         ss.id_calendrier,
         c.code as cours_code,
         c.nom as cours_nom,
         u.nom as prof_nom,
         u.prenom as prof_prenom,
         s.numero as salle_numero,
         s.nom as salle_nom,
         s.type as salle_type
       FROM session_salle ss
       JOIN cours c ON c.id_cours = ss.id_cours
       JOIN professeur pr ON pr.id_professeur = ss.id_professeur
       JOIN employe emp ON emp.id_employe = pr.id_professeur  -- ✅ CORRECTION ICI
       JOIN utilisateur u ON u.id_utilisateur = emp.id_employe
       JOIN salle s ON s.id_salle = ss.id_salle
       WHERE ss.id_filiere = $1 OR ss.id_filiere IS NULL
       ORDER BY ss.date, ss.heure_debut`,
      [id_filiere]
    );

    const events = [];

    sessionsResult.rows.forEach((s, idx) => {
      events.push({
        id: `session-${s.id_session}`,
        title: `${s.cours_nom}`,
        type: "enseignement",
        start: formatDate(s.date),
        end: formatDate(s.date),
        semester: s.semestre || "S1",
        note: `${s.salle_numero} · ${s.heure_debut.substring(0, 5)}-${s.heure_fin.substring(0, 5)} · Pr. ${s.prof_nom}`,
        metadata: {
          cours_code: s.cours_code,
          professeur: `${s.prof_prenom} ${s.prof_nom}`,
          salle: s.salle_numero,
          horaire: `${s.heure_debut.substring(0, 5)} - ${s.heure_fin.substring(0, 5)}`,
        },
      });
    });

    calendriersResult.rows.forEach((cal) => {
      events.push({
        id: `cal-${cal.id_calendrier}-s1`,
        title: `Enseignement S1 — ${cal.annee_scolaire}`,
        type: "enseignement",
        start: formatDate(cal.date_debut),
        end: formatDate(cal.date_fin),
        semester: "S1",
        note: "Semestre 1",
        annee: cal.annee_scolaire,
      });

      if (cal.periodes) {
        const periodes = typeof cal.periodes === "string" ? JSON.parse(cal.periodes) : cal.periodes;
        if (Array.isArray(periodes)) {
          periodes.forEach((p, idx) => {
            events.push({
              id: `periode-${cal.id_calendrier}-${idx}`,
              title: p.nom || p.title || "Période académique",
              type: mapPeriodType(p.type),
              start: formatDate(p.start || p.date_debut),
              end: formatDate(p.end || p.date_fin),
              semester: p.semester || "all",
              note: p.description || p.note || "",
              annee: cal.annee_scolaire,
            });
          });
        }
      }
    });

    res.json({
      success: true,
      filiere: {
        id: id_filiere,
        nom: filiere_nom,
      },
      events: events.sort((a, b) => new Date(a.start) - new Date(b.start)),
      annees: [...new Set(calendriersResult.rows.map((c) => c.annee_scolaire))].sort().reverse(),
    });
  } catch (error) {
    console.error("Erreur getCalendrier:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mapPeriodType(type) {
  const mapping = {
    vacances: "vacances",
    holiday: "vacances",
    examen: "examen",
    exam: "examen",
    controle: "controle",
    test: "controle",
    deliberation: "deliberation",
    soutenance: "soutenance",
    fete: "fete",
    holiday_off: "fete",
  };
  return mapping[type?.toLowerCase()] || "enseignement";
}