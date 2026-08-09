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
    <div className="card flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
            <CalendarDays size={17} strokeWidth={1.8} />
          </span>
          <div>
            <h3 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">
              Calendrier académique
            </h3>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              Année {year}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/student/calendrier")}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary-600 transition hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          Voir tout
          <ArrowRight size={13} />
        </button>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          En cours
        </p>
        {ongoing.length > 0 ? (
          <div className="space-y-2">
            {ongoing.map((e) => {
              const Icon = TYPE_ICONS[e.type];
              const cfg = EVENT_TYPE_CONFIG[e.type];
              return (
                <div
                  key={e.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cfg.tile}`}>
                    <Icon size={16} strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                      {e.title}
                    </p>
                    <p className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                      {formatShort(e.start)}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    En cours
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-[12px] text-slate-400 dark:border-slate-700 dark:text-slate-500">
            Aucun événement en cours actuellement
          </p>
        )}
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Prochains événements
        </p>
        <div className="space-y-1">
          {nextThree.map((e) => {
            const Icon = TYPE_ICONS[e.type];
            const cfg = EVENT_TYPE_CONFIG[e.type];
            return (
              <button
                key={e.id}
                onClick={() => navigate("/student/calendrier")}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.tile}`}>
                  <Icon size={15} strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">
                    {e.title}
                  </p>
                  <p className="text-[10.5px] tabular-nums text-slate-400 dark:text-slate-500">
                    {formatShort(e.start)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold tabular-nums text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  {isOngoing(e, today) ? "En cours" : `J-${daysUntil(e, today)}`}
                </span>
              </button>
            );
          })}
          {nextThree.length === 0 && (
            <p className="px-3 py-4 text-center text-[12px] text-slate-400 dark:text-slate-500">
              Aucun événement à venir
            </p>
          )}
        </div>
      </div>
    </div>
  );
}