import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  GraduationCap,
  MoonStar,
  PenLine,
  Presentation,
  Umbrella,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ACADEMIC_YEARS,
  EVENTS,
  EVENT_TYPE_CONFIG,
  academicYearOf,
  daysUntil,
  eventEnd,
  formatRange,
  formatShort,
  getCurrentPhase,
  isOngoing,
  isPast,
  nextAcademicYear,
  parseDate,
  startOfDay,
} from "../../../data/academicCalendar";
import type {
  AcademicEvent,
  AcademicYearLabel,
  EventType,
} from "../../../data/academicCalendar";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const TYPE_ICONS: Record<EventType, LucideIcon> = {
  enseignement: BookOpen,
  controle: PenLine,
  examen: FileText,
  deliberation: CheckCircle2,
  vacances: Umbrella,
  fete: MoonStar,
  soutenance: Presentation,
};

export default function AcademicCalendar() {
  const today = startOfDay(new Date());

  const [year, setYear] = useState<AcademicYearLabel>(() => {
    const ay = academicYearOf(new Date());
    return EVENTS[ay].some((e) => eventEnd(e).getTime() >= today.getTime())
      ? ay
      : nextAcademicYear(ay);
  });
  const [semester, setSemester] = useState<"all" | "S1" | "S2">("all");
  const [cursor, setCursor] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDay, setSelectedDay] = useState<Date>(today);

  const events = useMemo(
    () =>
      EVENTS[year]
        .filter((e) => semester === "all" || e.semester === semester)
        .sort((a, b) => parseDate(a.start).getTime() - parseDate(b.start).getTime()),
    [year, semester]
  );

  const next = events.find((e) => eventEnd(e).getTime() >= today.getTime());
  const phase = getCurrentPhase(EVENTS[year], today);

  const s1Count = EVENTS[year].filter((e) => e.semester === "S1").length;
  const s2Count = EVENTS[year].filter((e) => e.semester === "S2").length;
  const otherCount = EVENTS[year].length - s1Count - s2Count;
  const maxSem = Math.max(s1Count, s2Count, otherCount, 1);

  const weeks = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    const out: Date[][] = [];
    const cur = new Date(start);
    for (let w = 0; w < 6; w++) {
      const row: Date[] = [];
      for (let i = 0; i < 7; i++) {
        row.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
      out.push(row);
    }
    return out;
  }, [cursor]);

  const eventsOnDay = (day: Date) =>
    events.filter((e) => {
      const t = day.getTime();
      return parseDate(e.start).getTime() <= t && eventEnd(e).getTime() >= t;
    });

  const selectedEvents = eventsOnDay(selectedDay);
  const upcoming = events
    .filter((e) => eventEnd(e).getTime() >= today.getTime())
    .slice(0, 5);

  const changeYear = (y: AcademicYearLabel) => {
    setYear(y);
    const firstUpcoming = EVENTS[y].find(
      (e) => eventEnd(e).getTime() >= today.getTime()
    );
    const base = firstUpcoming
      ? parseDate(firstUpcoming.start)
      : parseDate(EVENTS[y][0].start);
    setCursor(new Date(base.getFullYear(), base.getMonth(), 1));
    setSelectedDay(base);
  };

  const jumpTo = (e: AcademicEvent) => {
    const s = parseDate(e.start);
    setCursor(new Date(s.getFullYear(), s.getMonth(), 1));
    setSelectedDay(s);
  };

  const statusOf = (e: AcademicEvent) => {
    if (isOngoing(e, today))
      return {
        label: "En cours",
        cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
      };
    if (isPast(e, today))
      return {
        label: "Terminé",
        cls: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
      };
    return {
      label: `J-${daysUntil(e, today)}`,
      cls: "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300",
    };
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span />
            <h1 className="text-[18px] font-semibold tracking-tight text-slate-900 dark:text-white">
              Calendrier universitaire
            </h1>
          </div>
          <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
            Dates clés de l'année académique.
          </p>
        </div>

        <div className="inline-flex items-center gap-0.5 self-start rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800/60 sm:self-auto">
          {ACADEMIC_YEARS.map((y) => (
            <button
              key={y}
              onClick={() => changeYear(y)}
              className={`relative rounded-md px-3 py-1 text-[11px] font-semibold transition ${
                year === y
                  ? "text-primary-700 dark:text-primary-300"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {year === y && (
                <motion.span
                  layoutId="academic-year-pill"
                  className="absolute inset-0 rounded-md bg-white shadow-sm dark:bg-slate-700"
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                />
              )}
              <span className="relative z-10 tabular-nums">{y}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="grid grid-cols-1 gap-px bg-slate-200 sm:grid-cols-3 dark:bg-slate-800">
          <div className="flex items-center justify-between gap-3 bg-white px-5 py-4 dark:bg-slate-900">
            <div className="min-w-0">
              <p className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Phase actuelle
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold text-slate-900 dark:text-white">
                <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-500" />
                <span className="truncate">{phase}</span>
              </p>
              <p className="mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400">
                Année {year}
              </p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
              <GraduationCap size={16} strokeWidth={1.8} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 bg-white px-5 py-4 dark:bg-slate-900">
            <div className="min-w-0">
              <p className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Prochain événement
              </p>
              {next ? (
                <>
                  <p className="mt-1 truncate text-[13px] font-semibold text-slate-900 dark:text-white">
                    {next.title}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[10.5px] tabular-nums text-slate-500 dark:text-slate-400">
                    {formatShort(next.start)}
                    <span className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[9px] font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                      {isOngoing(next, today) ? "En cours" : `J-${daysUntil(next, today)}`}
                    </span>
                  </p>
                </>
              ) : (
                <p className="mt-1 text-[13px] font-semibold text-slate-400 dark:text-slate-500">
                  Aucun à venir
                </p>
              )}
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
              <CalendarDays size={16} strokeWidth={1.8} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 bg-white px-5 py-4 dark:bg-slate-900">
            <div className="min-w-0">
              <p className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Événements
              </p>
              <p className="mt-1 text-2xl font-semibold leading-none tracking-tight tabular-nums text-slate-900 dark:text-white">
                {EVENTS[year].length}
              </p>
              <p className="mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400">
                {events.length} affichés
              </p>
            </div>
            <div className="flex h-9 items-end gap-0.5">
              <span
                className="w-1.5 rounded-sm bg-blue-400"
                style={{ height: `${Math.max(20, (s1Count / maxSem) * 100)}%` }}
              />
              <span
                className="w-1.5 rounded-sm bg-emerald-400"
                style={{ height: `${Math.max(20, (s2Count / maxSem) * 100)}%` }}
              />
              <span
                className="w-1.5 rounded-sm bg-slate-300 dark:bg-slate-600"
                style={{ height: `${Math.max(20, (otherCount / maxSem) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="card p-4 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800/60">
              {(["all", "S1", "S2"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSemester(s)}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition ${
                    semester === s
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {s === "all" ? "Tous" : s}
                </button>
              ))}
            </div>

            <p className="text-[13px] font-bold capitalize tracking-tight text-slate-800 dark:text-white">
              {cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </p>

            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
                }
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                onClick={() => {
                  setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
                  setSelectedDay(today);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-primary-600 transition hover:bg-primary-50 dark:border-slate-700 dark:bg-slate-800 dark:text-primary-400 dark:hover:bg-primary-900/20"
              >
                Aujourd'hui
              </button>
              <button
                onClick={() =>
                  setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
                }
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {WEEKDAYS.map((d) => (
              <span key={d} className="py-1.5">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {weeks.flat().map((day) => {
              const inMonth = day.getMonth() === cursor.getMonth();
              const isToday = day.getTime() === today.getTime();
              const isSelected = selectedDay.getTime() === day.getTime();
              const weekend = day.getDay() === 0 || day.getDay() === 6;
              const dots = eventsOnDay(day);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[11.5px] font-medium transition sm:h-14 ${
                    isSelected
                      ? "bg-primary-600 text-white shadow-sm"
                      : isToday
                        ? "bg-primary-50 font-bold text-primary-700 ring-1 ring-primary-200 dark:bg-primary-900/20 dark:text-primary-300 dark:ring-primary-800"
                        : `${weekend && inMonth ? "bg-slate-50/70 dark:bg-slate-800/30" : ""} text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800`
                  } ${!inMonth ? "opacity-30" : ""}`}
                >
                  <span className="tabular-nums">{day.getDate()}</span>
                  <span className="flex gap-0.5">
                    {dots.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        className={`h-1 w-1 rounded-full ${
                          isSelected ? "bg-white" : EVENT_TYPE_CONFIG[e.type].dot
                        }`}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
            {(Object.keys(EVENT_TYPE_CONFIG) as EventType[]).map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9.5px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              >
                <span className={`h-1 w-1 rounded-full ${EVENT_TYPE_CONFIG[t].dot}`} />
                {EVENT_TYPE_CONFIG[t].label}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card overflow-hidden p-0">
            <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <div>
                <h3 className="text-[12.5px] font-bold capitalize text-slate-800 dark:text-white">
                  {selectedDay.toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </h3>
                <p className="mt-0.5 text-[10.5px] tabular-nums text-slate-400 dark:text-slate-500">
                  {selectedEvents.length} événement{selectedEvents.length > 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <CalendarDays size={14} strokeWidth={1.8} />
              </div>
            </header>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {selectedEvents.map((e) => {
                const cfg = EVENT_TYPE_CONFIG[e.type];
                const Icon = TYPE_ICONS[e.type];
                const st = statusOf(e);
                return (
                  <div key={e.id} className="flex items-start gap-2.5 px-4 py-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.tile}`}>
                      <Icon size={14} strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">
                        {e.title}
                      </p>
                      <p className="mt-0.5 text-[10.5px] tabular-nums text-slate-500 dark:text-slate-400">
                        {formatRange(e)}
                        {e.note ? ` · ${e.note}` : ""}
                      </p>
                      <div className="mt-1 flex items-center gap-1">
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold tabular-nums ${st.cls}`}>
                          {st.label}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {selectedEvents.length === 0 && (
                <p className="px-4 py-6 text-center text-[12px] text-slate-400 dark:text-slate-500">
                  Aucun événement ce jour.
                </p>
              )}
            </div>
          </div>

          <div className="card p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="text-[12.5px] font-bold text-slate-800 dark:text-white">
                Prochains événements
              </h3>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-bold tabular-nums text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {upcoming.length}
              </span>
            </div>
            <div className="space-y-0.5">
              {upcoming.map((e) => {
                const Icon = TYPE_ICONS[e.type];
                return (
                  <button
                    key={e.id}
                    onClick={() => jumpTo(e)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${EVENT_TYPE_CONFIG[e.type].tile}`}>
                      <Icon size={12} strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px] font-semibold text-slate-700 dark:text-slate-200">
                        {e.title}
                      </p>
                      <p className="text-[9.5px] tabular-nums text-slate-400 dark:text-slate-500">
                        {formatShort(e.start)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary-50 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                      {isOngoing(e, today) ? "En cours" : `J-${daysUntil(e, today)}`}
                    </span>
                  </button>
                );
              })}
              {upcoming.length === 0 && (
                <p className="py-3 text-center text-[12px] text-slate-400 dark:text-slate-500">
                  Aucun événement à venir.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
        <span className="tabular-nums">
          {events.length} sur {EVENTS[year].length} événements affichés
        </span>
        <span>Année universitaire {year}</span>
      </div>
    </div>
  );
}