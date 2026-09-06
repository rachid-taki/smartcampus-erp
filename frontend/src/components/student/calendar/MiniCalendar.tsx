import { useMemo, useState, useEffect } from "react";
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
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getCalendrier, type CalendrierEvent } from "../../../services/calendrier.service";

type EventType = "enseignement" | "controle" | "examen" | "deliberation" | "vacances" | "fete" | "soutenance";

const TYPE_ICONS: Record<EventType, LucideIcon> = {
  enseignement: BookOpen,
  controle: PenLine,
  examen: FileText,
  deliberation: CheckCircle2,
  vacances: Umbrella,
  fete: MoonStar,
  soutenance: Presentation,
};

const EVENT_TYPE_CONFIG: Record<EventType, { label: string; dot: string; tile: string }> = {
  enseignement: { label: "Enseignement", dot: "bg-blue-500", tile: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" },
  controle: { label: "Contrôle", dot: "bg-amber-500", tile: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300" },
  examen: { label: "Examen", dot: "bg-rose-500", tile: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300" },
  deliberation: { label: "Délibération", dot: "bg-emerald-500", tile: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" },
  vacances: { label: "Vacances", dot: "bg-slate-400", tile: "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  fete: { label: "Fête", dot: "bg-purple-500", tile: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300" },
  soutenance: { label: "Soutenance", dot: "bg-indigo-500", tile: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300" },
};

function parseDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function eventEnd(e: CalendrierEvent) {
  return startOfDay(parseDate(e.end || e.start));
}

function isOngoing(e: CalendrierEvent, today: Date) {
  const t = today.getTime();
  return parseDate(e.start).getTime() <= t && eventEnd(e).getTime() >= t;
}

function daysUntil(e: CalendrierEvent, today: Date) {
  return Math.ceil((parseDate(e.start).getTime() - today.getTime()) / 86400000);
}

function formatShort(s: string) {
  return parseDate(s).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function MiniCalendar() {
  const navigate = useNavigate();
  const today = startOfDay(new Date());
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendrierEvent[]>([]);
  const [currentYear, setCurrentYear] = useState<string>("");

  useEffect(() => {
    loadCalendrier();
  }, []);

  const loadCalendrier = async () => {
    try {
      setLoading(true);
      const data = await getCalendrier();
      setEvents(data.events);
      if (data.annees.length > 0) {
        setCurrentYear(data.annees[0]);
      }
    } catch (error) {
      console.error("Erreur chargement mini calendrier:", error);
    } finally {
      setLoading(false);
    }
  };

  const yearEvents = useMemo(() => {
    return events.filter((e) => !currentYear || e.annee === currentYear || !e.annee);
  }, [events, currentYear]);

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

  if (loading) {
    return (
      <div className="card flex flex-col items-center justify-center gap-3 p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
        <p className="text-[11px] text-slate-500 dark:text-slate-400">Chargement...</p>
      </div>
    );
  }

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
              Année {currentYear}
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