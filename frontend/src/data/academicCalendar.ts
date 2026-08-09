export type EventType =
  | "enseignement"
  | "controle"
  | "examen"
  | "deliberation"
  | "vacances"
  | "fete"
  | "soutenance";

export type Semester = "S1" | "S2" | "Annuel";

export interface AcademicEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  type: EventType;
  semester: Semester;
  note?: string;
}

export const EVENT_TYPE_CONFIG: Record<
  EventType,
  { label: string; border: string; tile: string; dot: string }
> = {
  enseignement: {
    label: "Enseignements",
    border: "border-l-blue-500",
    tile: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  controle: {
    label: "Contrôles continus",
    border: "border-l-amber-500",
    tile: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  examen: {
    label: "Examens",
    border: "border-l-rose-500",
    tile: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  deliberation: {
    label: "Délibérations",
    border: "border-l-emerald-500",
    tile: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  vacances: {
    label: "Vacances",
    border: "border-l-sky-500",
    tile: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  fete: {
    label: "Fêtes",
    border: "border-l-violet-500",
    tile: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  soutenance: {
    label: "Soutenances",
    border: "border-l-indigo-500",
    tile: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
    dot: "bg-indigo-500",
  },
};

const d = (y: number, m: number, day: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export const parseDate = (s: string) => {
  const [y, m, day] = s.split("-").map(Number);
  return new Date(y, m - 1, day);
};

export const addDays = (s: string, n: number) => {
  const dt = parseDate(s);
  dt.setDate(dt.getDate() + n);
  return d(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
};

export const startOfDay = (dt: Date) =>
  new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());

export const eventEnd = (e: AcademicEvent) => parseDate(e.end ?? e.start);

export const isPast = (e: AcademicEvent, today: Date) =>
  eventEnd(e).getTime() < startOfDay(today).getTime();

export const isOngoing = (e: AcademicEvent, today: Date) => {
  const t = startOfDay(today).getTime();
  return parseDate(e.start).getTime() <= t && eventEnd(e).getTime() >= t;
};

export const daysUntil = (e: AcademicEvent, today: Date) =>
  Math.round((parseDate(e.start).getTime() - startOfDay(today).getTime()) / 86400000);

export const formatShort = (s: string) =>
  parseDate(s).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export const formatRange = (e: AcademicEvent) =>
  e.end ? `${formatShort(e.start)} → ${formatShort(e.end)}` : formatShort(e.start);

function buildYear(
  sy: number,
  opts?: { aidAlFitr?: string; aidAlAdha?: string; lunar?: boolean }
): AcademicEvent[] {
  const ey = sy + 1;
  const lunarNote = opts?.lunar ? "Date estimée (calendrier lunaire)" : undefined;
  const aidFitr = opts?.aidAlFitr ?? d(ey, 3, 20);
  const aidAdha = opts?.aidAlAdha ?? d(ey, 5, 27);

  return [
    { id: `${sy}-01`, title: "Démarrage des enseignements — session Automne", start: d(sy, 9, 15), type: "enseignement", semester: "S1" },
    { id: `${sy}-02`, title: "Contrôles continus", start: d(sy, 11, 17), type: "controle", semester: "S1", note: "À partir du 17 novembre" },
    { id: `${sy}-03`, title: "Examens — session normale", start: d(ey, 1, 5), type: "examen", semester: "S1", note: "À partir du 5 janvier" },
    { id: `${sy}-04`, title: "Délibération et affichage des résultats", start: d(ey, 1, 16), type: "deliberation", semester: "S1" },
    { id: `${sy}-05`, title: "Examens — session de rattrapage", start: d(ey, 1, 19), type: "examen", semester: "S1", note: "À partir du 19 janvier" },
    { id: `${sy}-06`, title: "Démarrage des enseignements — session Printemps", start: d(ey, 2, sy === 2025 ? 2 : 1), type: "enseignement", semester: "S2" },
    { id: `${sy}-07`, title: "Fête Aïd Al Fitr", start: aidFitr, end: addDays(aidFitr, 3), type: "fete", semester: "S2", note: lunarNote ?? "3 à 4 jours" },
    { id: `${sy}-08`, title: "Arrêt des enseignements — session Printemps", start: d(ey, 4, sy === 2025 ? 18 : 17), type: "enseignement", semester: "S2" },
    { id: `${sy}-09`, title: "Contrôles continus", start: d(ey, 4, 23), end: d(ey, 4, 27), type: "controle", semester: "S2" },
    { id: `${sy}-10`, title: "Vacances de Printemps", start: d(ey, 5, 1), end: d(ey, 5, 10), type: "vacances", semester: "S2" },
    { id: `${sy}-11`, title: "Examens — session normale", start: d(ey, 5, 12), end: d(ey, 5, 15), type: "examen", semester: "S2" },
    { id: `${sy}-12`, title: "Délibération et affichage des résultats", start: d(ey, 5, 18), type: "deliberation", semester: "S2" },
    { id: `${sy}-13`, title: "Examens — session de rattrapage", start: d(ey, 5, 21), end: d(ey, 5, 23), type: "examen", semester: "S2" },
    { id: `${sy}-14`, title: "Fête Aïd Al Adha", start: aidAdha, end: addDays(aidAdha, 3), type: "fete", semester: "S2", note: lunarNote ?? "4 jours" },
    { id: `${sy}-15`, title: "Délibération annuelle — 1ère et 2ème année cycle ingénieur", start: d(ey, 6, 8), type: "deliberation", semester: "Annuel" },
    { id: `${sy}-16`, title: "Soutenances des PFE", start: d(ey, 6, 22), end: d(ey, 6, 23), type: "soutenance", semester: "Annuel" },
    { id: `${sy}-17`, title: "Délibération de la session de printemps S10", start: d(ey, 6, 24), type: "deliberation", semester: "Annuel" },
  ];
}

export const ACADEMIC_YEARS = ["2025-2026", "2026-2027"] as const;
export type AcademicYearLabel = (typeof ACADEMIC_YEARS)[number];

export const EVENTS: Record<AcademicYearLabel, AcademicEvent[]> = {
  "2025-2026": buildYear(2025),
  "2026-2027": buildYear(2026, {
    aidAlFitr: d(2027, 3, 10),
    aidAlAdha: d(2027, 5, 16),
    lunar: true,
  }),
};

export const nextAcademicYear = (label: AcademicYearLabel) => {
  const idx = ACADEMIC_YEARS.indexOf(label);
  return ACADEMIC_YEARS[Math.min(idx + 1, ACADEMIC_YEARS.length - 1)];
};

export const academicYearOf = (today: Date): AcademicYearLabel => {
  const y = today.getFullYear();
  const label = today.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  return (ACADEMIC_YEARS as readonly string[]).includes(label)
    ? (label as AcademicYearLabel)
    : ACADEMIC_YEARS[ACADEMIC_YEARS.length - 1];
};

export const getCurrentPhase = (events: AcademicEvent[], today: Date) => {
  const t = startOfDay(today).getTime();
  const ongoing = events.find((e) => isOngoing(e, today));
  if (ongoing) return ongoing.title;
  const s1 = events.filter((e) => e.semester === "S1");
  const s2 = events.filter((e) => e.semester === "S2");
  if (s1.length && t < parseDate(s1[0].start).getTime()) return "Avant la rentrée";
  const s1End = s1.length ? Math.max(...s1.map((e) => eventEnd(e).getTime())) : 0;
  const s2Start = s2.length ? parseDate(s2[0].start).getTime() : 0;
  const s2End = s2.length ? Math.max(...s2.map((e) => eventEnd(e).getTime())) : 0;
  if (s1.length && t <= s1End) return "Session Automne (S1)";
  if (s2.length && t < s2Start) return "Intersession";
  if (s2.length && t <= s2End) return "Session Printemps (S2)";
  return "Année universitaire terminée";
};