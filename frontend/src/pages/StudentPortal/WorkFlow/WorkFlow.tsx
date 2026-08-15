import { useEffect, useRef, useState } from "react";
import WorkflowCard from "./WorkflowCard";
import { motion } from "framer-motion";
import { getRecentRequests } from "../../../services/student.service";
import {
  Workflow,
  TrendingUp,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

export default function WorkflowPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const typeFromUrl = searchParams.get("type");
  const [typeFilter, setTypeFilter] = useState<string>(typeFromUrl || "Toutes");
  const scrollRef = useRef<HTMLDivElement>(null);

  const TYPES = ["Toutes", ...new Set(requests.map((r) => r.type))];

  const displayedRequests =
    typeFilter === "Toutes"
      ? requests
      : requests.filter((r) => r.type === typeFilter);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setTypeFilter(typeFromUrl || "Toutes");
  }, [typeFromUrl]);

  const load = async () => {
    try {
      const data = await getRecentRequests();
      setRequests(data);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: requests.length,
    inProgress: requests.filter((r) =>
      ["Soumise", "En_Traitement"].includes(r.status)
    ).length,
    completed: requests.filter((r) => r.status === "Validee").length,
    completionRate:
      requests.length > 0
        ? Math.round(
            (requests.filter((r) => r.status === "Validee").length /
              requests.length) *
              100
          )
        : 0,
  };

  const inProgressPct = stats.total
    ? Math.round((stats.inProgress / stats.total) * 100)
    : 0;

  const typeCounts = TYPES.filter((t) => t !== "Toutes").map(
    (t) => requests.filter((r) => r.type === t).length
  );
  const maxCount = Math.max(...typeCounts, 1);

  const changeTypeFilter = (type: string) => {
    setTypeFilter(type);
    if (type === "Toutes") {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ type }, { replace: true });
    }
  };

  const scrollByAmount = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 380, behavior: "smooth" });
  };

  return (
    <div className="w-full max-w-full min-w-0 space-y-5 overflow-x-hidden">
      <style>{`
        .workflow-scroll { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
        .workflow-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .workflow-scroll::-webkit-scrollbar-track { background: transparent; }
        .workflow-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .workflow-scroll::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
          background-clip: content-box;
        }
        .dark .workflow-scroll { scrollbar-color: #475569 transparent; }
        .dark .workflow-scroll::-webkit-scrollbar-thumb {
          background: #475569;
          border: 2px solid transparent;
          background-clip: content-box;
        }
      `}</style>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span />
            <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white">
              Suivi de mes demandes
            </h1>
          </div>
          <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400">
            Consultez l'avancement de toutes vos demandes administratives.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11.5px] font-medium text-slate-600 tabular-nums dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:self-auto">
          <Workflow size={12} className="text-slate-400" />
          {displayedRequests.length} demande{displayedRequests.length > 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <div className="space-y-5">
          <div className="card h-28 animate-pulse" />
          <div className="card h-16 animate-pulse" />
          <div className="flex gap-5 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-64 w-full max-w-[340px] shrink-0 animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="card w-full max-w-full min-w-0 overflow-hidden p-0">
            <div className="grid w-full grid-cols-1 gap-px bg-slate-200 sm:grid-cols-2 xl:grid-cols-4 dark:bg-slate-800">
              <KpiBlock
                label="Total demandes"
                value={stats.total}
                hint="toutes périodes"
                right={
                  <div className="flex h-10 items-end gap-1">
                    {(typeCounts.length ? typeCounts : [0, 0, 0]).map((c, i) => (
                      <span
                        key={i}
                        className="w-1.5 rounded-sm bg-slate-300 dark:bg-slate-600"
                        style={{ height: `${Math.max(15, (c / maxCount) * 100)}%` }}
                      />
                    ))}
                  </div>
                }
              />
              <KpiBlock
                label="En cours"
                value={stats.inProgress}
                hint={`${inProgressPct}% du total`}
                accent="amber"
                right={
                  <div className="flex w-24 flex-col gap-1.5">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${inProgressPct}%` }}
                      />
                    </div>
                    <span className="text-right text-[10px] font-medium tabular-nums text-slate-400 dark:text-slate-500">
                      {stats.inProgress}/{stats.total}
                    </span>
                  </div>
                }
              />
              <KpiBlock
                label="Validées"
                value={stats.completed}
                hint="traitées avec succès"
                accent="emerald"
                right={
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                    <CheckCircle2 size={18} strokeWidth={1.8} />
                  </div>
                }
              />
              <KpiBlock
                label="Taux de réussite"
                value={`${stats.completionRate}%`}
                hint="des demandes validées"
                right={
                  <div className="relative h-10 w-10">
                    <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                      <circle
                        cx="18" cy="18" r="14" fill="none" strokeWidth="3"
                        stroke="currentColor"
                        className="text-slate-200 dark:text-slate-700"
                      />
                      <circle
                        cx="18" cy="18" r="14" fill="none" strokeWidth="3"
                        strokeLinecap="round" stroke="currentColor"
                        className="text-sky-500"
                        strokeDasharray={87.96}
                        strokeDashoffset={87.96 - (stats.completionRate / 100) * 87.96}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                      {stats.completionRate}
                    </span>
                  </div>
                }
              />
            </div>
          </div>

          <div className="card flex w-full max-w-full min-w-0 flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Filtrer par type
              </span>
              <span className="text-[11px] font-medium tabular-nums text-slate-400 dark:text-slate-500">
                {displayedRequests.length} résultat{displayedRequests.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1 overflow-x-auto">
              {TYPES.map((type) => {
                const isActive = typeFilter === type;
                const count =
                  type === "Toutes"
                    ? requests.length
                    : requests.filter((r) => r.type === type).length;
                return (
                  <button
                    key={type}
                    onClick={() => changeTypeFilter(type)}
                    className={`relative rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                      isActive
                        ? "text-primary-700 dark:text-primary-300"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="workflow-type-pill"
                        className="absolute inset-0 rounded-lg bg-primary-50 shadow-sm dark:bg-primary-900/20"
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      {type}
                      <span
                        className={`text-[10px] tabular-nums ${
                          isActive ? "opacity-70" : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        {count}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {displayedRequests.length === 0 ? (
            <div className="card flex flex-col items-center justify-center gap-3 p-20 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                <Workflow size={20} className="text-slate-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                {typeFilter === "Toutes"
                  ? "Aucune demande trouvée"
                  : `Aucune demande de type "${typeFilter}"`}
              </h3>
              <p className="max-w-sm text-[13px] text-slate-500 dark:text-slate-400">
                {typeFilter === "Toutes"
                  ? "Vous n'avez encore soumis aucune demande."
                  : "Essayez de sélectionner un autre type de demande."}
              </p>
            </div>
          ) : (
            <div className="w-full max-w-full min-w-0">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Vos demandes
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => scrollByAmount(-1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    onClick={() => scrollByAmount(1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>

              <div
                ref={scrollRef}
                className="workflow-scroll flex w-full max-w-full snap-x snap-mandatory gap-5 overflow-x-auto pb-4 scroll-smooth"
              >
                {displayedRequests.map((request, index) => (
                  <motion.div
                    key={request.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.04 }}
                    className="w-[min(86vw,340px)] shrink-0 snap-start sm:w-[360px]"
                  >
                    <WorkflowCard request={request} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between px-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
            <span className="tabular-nums">
              {displayedRequests.length} sur {requests.length} demande
              {requests.length > 1 ? "s" : ""} affichée
              {displayedRequests.length > 1 ? "s" : ""}
            </span>
            <span>Taux de validation : {stats.completionRate}%</span>
          </div>
        </>
      )}
    </div>
  );
}

function KpiBlock({
  label,
  value,
  hint,
  accent,
  right,
}: {
  label: string;
  value: number | string;
  hint: string;
  accent?: "amber" | "emerald";
  right?: React.ReactNode;
}) {
  const valueColor =
    accent === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : accent === "emerald"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-slate-900 dark:text-white";

  return (
    <div className="flex min-w-0 items-center justify-between gap-4 bg-white px-6 py-5 dark:bg-slate-900">
      <div className="min-w-0">
        <p className="truncate text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {label}
        </p>
        <p className={`mt-1 text-2xl font-semibold leading-none tracking-tight tabular-nums sm:text-[28px] ${valueColor}`}>
          {value}
        </p>
        <p className="mt-1 truncate text-[11.5px] text-slate-500 dark:text-slate-400">{hint}</p>
      </div>
      <div className="hidden shrink-0 sm:block">{right}</div>
    </div>
  );
}