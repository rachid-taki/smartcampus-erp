import { useEffect, useMemo, useState, Fragment } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Eye, X } from "lucide-react";
import { getReclamations } from "../../../services/student.service";
import { formatDate } from "../../../utils/format";
import { RECLAMATION_CATEGORIES, RECLAMATION_STATUS } from "../../../utils/reclamation";
import StatCard from "../../../components/student/dashboard/StatCard";
import NewReclamationModal from "./NewReclamationModal";

const CATEGORY_COLORS: Record<string, string> = {
    Note: "#3B82F6",
    AMO: "#F43F5E",
    Bourse: "#F59E0B",
    Email: "#0EA5E9",
    CertificatMedical: "#10B981",  
    Autre: "#64748B",
};

const STATUS_BAR: Record<string, string> = {
    Soumise: "bg-blue-500",
    Recue: "bg-sky-500",
    Transmise: "bg-amber-500",
    Acceptee: "bg-emerald-500",
    Rejetee: "bg-rose-500",
    Cloturee: "bg-slate-400",
};

const STEPS = ["Soumise", "Recue", "Transmise", "Décision"];

const getStatusIndex = (status: string) => {
    switch (status) {
        case "Soumise": return 0;
        case "Recue": return 1;
        case "Transmise": return 2;
        case "Acceptee":
        case "Rejetee":
        case "Cloturee": return 3;
        default: return 0;
    }
};

function StatusStepper({ status }: { status: string }) {
    const idx = getStatusIndex(status);
    const rejected = status === "Rejetee";
    return (
        <div>
            <div className="flex items-center">
                {STEPS.map((step, i) => {
                    const reached = i <= idx;
                    const isDecision = i === STEPS.length - 1;
                    const dotColor = !reached
                        ? "bg-slate-200 dark:bg-slate-700"
                        : isDecision
                            ? rejected
                                ? "bg-rose-500"
                                : "bg-emerald-500"
                            : "bg-primary-500";
                    return (
                        <Fragment key={step}>
                            {i > 0 && (
                                <div
                                    className={`h-0.5 flex-1 rounded-full ${
                                        i <= idx
                                            ? "bg-primary-300 dark:bg-primary-800"
                                            : "bg-slate-200 dark:bg-slate-700"
                                    }`}
                                />
                            )}
                            <div
                                title={step}
                                className={`h-3 w-3 shrink-0 rounded-full ${dotColor} ${
                                    i === idx
                                        ? "ring-2 ring-primary-300 ring-offset-1 dark:ring-primary-700 dark:ring-offset-slate-900"
                                        : ""
                                }`}
                            />
                        </Fragment>
                    );
                })}
            </div>
            <div className="mt-1.5 flex justify-between text-[9px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <span>Soumise</span>
                <span>Reçue</span>
                <span>Transmise</span>
                <span>{idx >= 3 ? (rejected ? "Rejetée" : "Acceptée") : "Décision"}</span>
            </div>
        </div>
    );
}

function CategoryDonut({ reclamations }: { reclamations: any[] }) {
    const data = (Object.keys(RECLAMATION_CATEGORIES) as string[])
        .map((key) => ({
            key,
            cfg: RECLAMATION_CATEGORIES[key],
            count: reclamations.filter((r) => r.categorie === key).length,
        }))
        .filter((d) => d.count > 0);

    const total = data.reduce((acc, d) => acc + d.count, 0);
    const radius = 40;
    const C = 2 * Math.PI * radius;
    let acc = 0;

    return (
        <div className="flex items-center gap-5">
            <div className="relative h-[110px] w-[110px] shrink-0">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle
                        cx="50" cy="50" r={radius} fill="none" strokeWidth="12"
                        className="stroke-slate-100 dark:stroke-slate-800"
                    />
                    {data.map((d) => {
                        const len = total ? (d.count / total) * C : 0;
                        const seg = (
                            <circle
                                key={d.key}
                                cx="50" cy="50" r={radius} fill="none" strokeWidth="12"
                                stroke={CATEGORY_COLORS[d.key]}
                                strokeDasharray={`${len} ${C - len}`}
                                strokeDashoffset={-acc}
                            />
                        );
                        acc += len;
                        return seg;
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                        {total}
                    </span>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                        Total
                    </span>
                </div>
            </div>
            <div className="flex-1 space-y-2">
                {data.map((d) => (
                    <div key={d.key} className="flex items-center gap-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${d.cfg.dot}`} />
                        <span className="flex-1 truncate text-[12px] font-medium text-slate-600 dark:text-slate-300">
                            {d.cfg.label}
                        </span>
                        <span className="text-[12px] font-bold tabular-nums text-slate-800 dark:text-white">
                            {d.count}
                        </span>
                    </div>
                ))}
                {data.length === 0 && (
                    <p className="text-[12px] text-slate-400 dark:text-slate-500">
                        Aucune donnée pour le moment.
                    </p>
                )}
            </div>
        </div>
    );
}

function StatusBreakdown({ reclamations }: { reclamations: any[] }) {
    const total = reclamations.length || 1;
    return (
        <div className="space-y-3">
            {Object.entries(RECLAMATION_STATUS).map(([key, st]) => {
                const count = reclamations.filter((r) => r.status === key).length;
                return (
                    <div key={key}>
                        <div className="mb-1 flex items-center justify-between">
                            <span className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
                                {st.label}
                            </span>
                            <span className="text-[11.5px] font-bold tabular-nums text-slate-700 dark:text-slate-200">
                                {count}
                            </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(count / total) * 100}%` }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className={`h-full rounded-full ${STATUS_BAR[key]}`}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function Reclamations() {
    const [reclamations, setReclamations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [viewing, setViewing] = useState<any | null>(null);
    const [openModal, setOpenModal] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();

useEffect(() => {
  if (searchParams.get("new") === "1") {
    setOpenModal(true);
    setSearchParams({}, { replace: true }); // Nettoie l'URL
  }
}, [searchParams, setSearchParams]);

    const load = async () => {
        try {
            const data = await getReclamations();
            setReclamations(data ?? []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const inProgress = reclamations.filter((r) =>
        ["Soumise", "Recue", "Transmise"].includes(r.status)
    ).length;
    const accepted = reclamations.filter((r) => ["Acceptee", "Cloturee"].includes(r.status)).length;
    const rejected = reclamations.filter((r) => r.status === "Rejetee").length;
    const acceptanceRate =
        reclamations.length === 0
            ? 0
            : Math.round((accepted / reclamations.length) * 100);

    const stats = [
        {
            id: "rec-total",
            title: "Total réclamations",
            value: reclamations.length,
            description: "Toutes catégories confondues",
            icon: "MessageSquareWarning",
            accent: "blue",
            sparkline: [1, 2, 2, 3, 3, 4, reclamations.length],
        },
        {
            id: "rec-encours",
            title: "En cours",
            value: inProgress,
            description: "En attente de traitement",
            icon: "Clock",
            accent: "sky",
            sparkline: [1, 1, 2, 2, 3, 2, inProgress],
        },
        {
            id: "rec-acceptees",
            title: "Acceptées",
            value: accepted,
            description: "Résolues avec succès",
            icon: "CheckCircle2",
            accent: "indigo",
            trend: { value: acceptanceRate, direction: "up" },
            sparkline: [0, 1, 1, 2, 2, 3, accepted],
        },
        {
            id: "rec-rejetees",
            title: "Rejetées",
            value: rejected,
            description: "Refusées par le service",
            icon: "XCircle",
            accent: "cyan",
            sparkline: [1, 0, 1, 1, 0, 1, rejected],
        },
    ];

    const filtered = useMemo(() => {
        return reclamations.filter((r) => {
            const q = search.toLowerCase();
            const matchSearch =
                !q ||
                r.objet.toLowerCase().includes(q) ||
                (r.description ?? "").toLowerCase().includes(q);
            const matchCategory = categoryFilter === "all" || r.categorie === categoryFilter;
            const matchStatus = statusFilter === "all" || r.status === statusFilter;
            return matchSearch && matchCategory && matchStatus;
        });
    }, [reclamations, search, categoryFilter, statusFilter]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-9 w-56 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="card h-32 animate-pulse" />
                    ))}
                </div>
                <div className="card h-96 animate-pulse" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <span/>
                        <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white">
                            Réclamations
                        </h1>
                    </div>
                    <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400">
                        Vue d'ensemble de vos réclamations : notes, AMO, bourse, email académique.
                    </p>
                </div>
                <button
                    onClick={() => setOpenModal(true)}
                    className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-primary-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm shadow-primary-500/25 transition hover:bg-primary-700 active:scale-[0.98] sm:self-auto"
                >
                    <Plus size={15} />
                    Nouvelle réclamation
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat, i) => (
                    <StatCard key={stat.id} data={stat as any} accent={stat.accent as any} index={i} />
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="card self-start xl:col-span-2">
                    <div className="flex flex-col gap-3 border-b border-slate-200/70 px-6 py-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
                        <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">
                            Réclamations récentes
                        </h3>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <div className="relative">
                                <Search
                                    size={14}
                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Rechercher..."
                                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-[12px] text-slate-700 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none sm:w-44 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
                                />
                            </div>
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-700 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                                <option value="all">Toutes catégories</option>
                                {Object.entries(RECLAMATION_CATEGORIES).map(([key, cfg]) => (
                                    <option key={key} value={key}>
                                        {cfg.label}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-700 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                                <option value="all">Tous statuts</option>
                                {Object.entries(RECLAMATION_STATUS).map(([key, st]) => (
                                    <option key={key} value={key}>
                                        {st.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                                <Search size={18} className="text-slate-400" />
                            </div>
                            <p className="max-w-sm text-[13px] text-slate-500 dark:text-slate-400">
                                {reclamations.length === 0
                                    ? "Vous n'avez soumis aucune réclamation pour le moment."
                                    : "Aucune réclamation ne correspond à vos filtres."}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px] text-left">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30">
                                        <th className="px-6 py-3 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Catégorie
                                        </th>
                                        <th className="px-6 py-3 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Objet
                                        </th>
                                        <th className="px-6 py-3 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Date
                                        </th>
                                        <th className="px-6 py-3 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Statut
                                        </th>
                                        <th className="px-6 py-3 text-right text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filtered.map((rec) => {
                                        const cfg = RECLAMATION_CATEGORIES[rec.categorie] ?? RECLAMATION_CATEGORIES.Autre;
                                        const st = RECLAMATION_STATUS[rec.status] ?? RECLAMATION_STATUS.Soumise;
                                        const Icon = cfg.icon;
                                        return (
                                            <tr
                                                key={rec.id}
                                                className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                                            >
                                                <td className="whitespace-nowrap px-6 py-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.tile}`}>
                                                            <Icon size={14} strokeWidth={1.8} />
                                                        </div>
                                                        <span className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">
                                                            {cfg.label}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="max-w-[260px] px-6 py-4">
                                                    <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                                                        {rec.objet}
                                                    </p>
                                                    <p className="truncate text-[11.5px] text-slate-400 dark:text-slate-500">
                                                        {rec.description}
                                                    </p>
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-[12.5px] tabular-nums text-slate-500 dark:text-slate-400">
                                                    {formatDate(rec.createdAt)}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4">
                                                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.cls}`}>
                                                        {st.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => setViewing(rec)}
                                                        title="Voir les détails"
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-primary-700 dark:hover:bg-primary-900/20 dark:hover:text-primary-300"
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 text-[11px] font-medium text-slate-400 dark:border-slate-800 dark:text-slate-500">
                        <span className="tabular-nums">
                            {filtered.length} sur {reclamations.length} réclamation{reclamations.length > 1 ? "s" : ""}
                        </span>
                        <span>Taux d'acceptation : {acceptanceRate}%</span>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="card p-5">
                        <h3 className="mb-4 text-[15px] font-bold text-slate-800 dark:text-slate-100">
                            Répartition par catégorie
                        </h3>
                        <CategoryDonut reclamations={reclamations} />
                    </div>

                    <div className="card p-5">
                        <h3 className="mb-4 text-[15px] font-bold text-slate-800 dark:text-slate-100">
                            Avancement des statuts
                        </h3>
                        <StatusBreakdown reclamations={reclamations} />
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {viewing && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
                        onClick={() => setViewing(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 16, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 16, scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                        >
                            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-700">
                                <div className="flex min-w-0 items-start gap-3">
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${(RECLAMATION_CATEGORIES[viewing.categorie] ?? RECLAMATION_CATEGORIES.Autre).tile}`}>
                                        {(() => {
                                            const Icon = (RECLAMATION_CATEGORIES[viewing.categorie] ?? RECLAMATION_CATEGORIES.Autre).icon;
                                            return <Icon size={17} strokeWidth={1.8} />;
                                        })()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                            {(RECLAMATION_CATEGORIES[viewing.categorie] ?? RECLAMATION_CATEGORIES.Autre).label} · {viewing.typeCode}
                                        </p>
                                        <h2 className="mt-0.5 truncate text-[15px] font-bold text-slate-800 dark:text-white">
                                            {viewing.objet}
                                        </h2>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setViewing(null)}
                                    className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    <X size={17} />
                                </button>
                            </div>

                            <div className="space-y-5 overflow-y-auto p-6">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                            Date de soumission
                                        </p>
                                        <p className="mt-1 text-[12.5px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                                            {formatDate(viewing.createdAt)}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                            Statut actuel
                                        </p>
                                        <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${(RECLAMATION_STATUS[viewing.status] ?? RECLAMATION_STATUS.Soumise).cls}`}>
                                            {(RECLAMATION_STATUS[viewing.status] ?? RECLAMATION_STATUS.Soumise).label}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Description
                                    </p>
                                    <p className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-[13px] leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
                                        {viewing.description || "Aucune description fournie."}
                                    </p>
                                </div>

                                <div>
                                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Avancement
                                    </p>
                                    <StatusStepper status={viewing.status} />
                                </div>
                            </div>

                            <div className="flex justify-end border-t border-slate-200 px-6 py-4 dark:border-slate-700">
                                <button
                                    onClick={() => setViewing(null)}
                                    className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
                                >
                                    Fermer
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <NewReclamationModal
                open={openModal}
                onClose={() => setOpenModal(false)}
                onSuccess={() => {
                    setOpenModal(false);
                    load();
                }}
            />
        </div>
    );
}