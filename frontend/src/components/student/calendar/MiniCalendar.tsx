import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileText,
  MoonStar,
  PenLine,
  Presentation,
  Umbrella,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  EVENTS,
  EVENT_TYPE_CONFIG,
  academicYearOf,
  nextAcademicYear,
  daysUntil,
  eventEnd,
  formatShort,
  isOngoing,
  parseDate,
  startOfDay,
} from "../../../data/academicCalendar";
import type { EventType } from "../../../data/academicCalendar";

const TYPE_ICONS: Record<EventType, LucideIcon> = {
  enseignement: BookOpen,
  controle: PenLine,
  examen: FileText,
  deliberation: CheckCircle2,
  vacances: Umbrella,
  fete: MoonStar,
  soutenance: Presentation,
};

export default function MiniCalendar() {
  const navigate = useNavigate();
  const today = startOfDay(new Date());

  const year = useMemo(() => {
    const ay = academicYearOf(new Date());
    return EVENTS[ay].some((e) => eventEnd(e).getTime() >= today.getTime())
      ? ay
      : nextAcademicYear(ay);
  }, [today]);

  const yearEvents = EVENTS[year] ?? [];

  const ongoing = useMemo(
    () => yearEvents.filter((e) => isOngoing(e, today)),
    [yearEvents, today]
  );

  const nextThree = useMemo(
    () =>
      yearEvents
        .filter((e) => eventEnd(e).getTime() >= today.getTime())
        .sort((a, b) => parseDate(a.start).getTime() - parseDate(b.start).getTime())
        .slice(0, 3),
    [yearEvents, today]
  );

  return (
    <div className="card flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
            <CalendarDays size={15} strokeWidth={1.8} />
          </span>
          <div>
            <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
              Calendrier académique
            </h3>
            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
              Année {year}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/student/calendrier")}
          className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary-600 transition hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          Voir tout
          <ArrowRight size={12} />
        </button>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          En cours
        </p>
        {ongoing.length > 0 ? (
          <div className="space-y-1.5">
            {ongoing.map((e) => {
              const Icon = TYPE_ICONS[e.type];
              const cfg = EVENT_TYPE_CONFIG[e.type];
              return (
                <div
                  key={e.id}
                  className="flex items-center gap-2.5 rounded-lg border border-slate-200/70 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.tile}`}>
                    <Icon size={14} strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-slate-800 dark:text-slate-100">
                      {e.title}
                    </p>
                    <p className="text-[10.5px] tabular-nums text-slate-500 dark:text-slate-400">
                      {formatShort(e.start)}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-500" />
                    En cours
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 px-2.5 py-3 text-center text-[11px] text-slate-400 dark:border-slate-700 dark:text-slate-500">
            Aucun événement en cours actuellement
          </p>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Prochains événements
        </p>
        <div className="space-y-0.5">
          {nextThree.map((e) => {
            const Icon = TYPE_ICONS[e.type];
            const cfg = EVENT_TYPE_CONFIG[e.type];
            return (
              <button
                key={e.id}
                onClick={() => navigate("/student/calendrier")}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${cfg.tile}`}>
                  <Icon size={13} strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] font-semibold text-slate-700 dark:text-slate-200">
                    {e.title}
                  </p>
                  <p className="text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                    {formatShort(e.start)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-primary-50 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  {isOngoing(e, today) ? "En cours" : `J-${daysUntil(e, today)}`}
                </span>
              </button>
            );
          })}
          {nextThree.length === 0 && (
            <p className="px-2.5 py-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
              Aucun événement à venir
            </p>
          )}
        </div>
      </div>
    </div>
  );
}