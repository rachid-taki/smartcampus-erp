import { useEffect, useMemo, useState, useRef } from "react";
import {
    Plus,
    Search,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    FileText,
    Route,
    Inbox,
    X,
    Eye,
    Hourglass,
    Send,
    FileCheck,
    FileX,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    getRecentRequests,
    getRecentDocuments,
} from "../../../services/student.service";
import NewRequest from "../NewRequest/NewRequest";
import { useNavigate, useSearchParams } from "react-router-dom";

const FILTERS = [
    { label: "Toutes", value: "Tous", icon: Inbox },
    { label: "Soumises", value: "Soumise", icon: Send },
    { label: "En traitement", value: "En_Traitement", icon: Loader2 },
    { label: "Validées", value: "Validee", icon: FileCheck },
    { label: "Refusées", value: "Rejetee", icon: FileX },
];

const STATUS_CONFIG: Record<string, { label: string; dot: string; tile: string; icon: any; ring: string }> = {
    Validee: {
        label: "Validée",
        dot: "bg-emerald-500",
        ring: "ring-emerald-500/20",
        tile: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
        icon: CheckCircle2,
    },
    Rejetee: {
        label: "Rejetée",
        dot: "bg-rose-500",
        ring: "ring-rose-500/20",
        tile: "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400",
        icon: XCircle,
    },
    En_Traitement: {
        label: "En traitement",
        dot: "bg-amber-500",
        ring: "ring-amber-500/20",
        tile: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
        icon: Hourglass,
    },
    Soumise: {
        label: "Soumise",
        dot: "bg-sky-500",
        ring: "ring-sky-500/20",
        tile: "bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400",
        icon: Clock,
    },
    Brouillon: {
        label: "Brouillon",
        dot: "bg-slate-400",
        ring: "ring-slate-400/20",
        tile: "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
        icon: FileText,
    },
};

const statusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.Soumise;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${cfg.tile} ${cfg.ring}`}>
            <Icon size={11} className={status === "En_Traitement" ? "animate-spin" : ""} />
            {cfg.label}
        </span>
    );
};

const PROGRESS_BY_STATUS: Record<string, number> = {
    Soumise: 25,
    En_Traitement: 60,
    Validee: 100,
    Rejetee: 100,
    Brouillon: 0,
};

export default function RequestsPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [loading, setLoading] = useState(true);
    const [openNewRequest, setOpenNewRequest] = useState(false);
    const [statusFilter, setStatusFilter] = useState("Tous");
    const [viewingRequest, setViewingRequest] = useState<any | null>(null);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowSearch(false);
            }
        };
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    useEffect(() => {
        if (searchParams.get("new") === "1") {
            setOpenNewRequest(true);
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const load = async () => {
        try {
            const [reqData, docData] = await Promise.all([
                getRecentRequests(),
                getRecentDocuments(),
            ]);
            setRequests(reqData);
            setDocuments(docData);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const getDocumentsForRequest = (requestId: string) =>
        documents.filter((d) => d.id_demande === requestId);

    const filteredRequests = useMemo(() => {
        let list = requests;
        if (statusFilter !== "Tous") {
            list = list.filter((r) => r.status === statusFilter);
        }
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(
                (r) =>
                    r.reference.toLowerCase().includes(q) ||
                    r.type.toLowerCase().includes(q) ||
                    r.objet?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [requests, statusFilter, search]);

    const total = requests.length;
    const soumises = requests.filter((r) => r.status === "Soumise").length;
    const enTraitement = requests.filter((r) => r.status === "En_Traitement").length;
    const validees = requests.filter((r) => r.status === "Validee").length;
    const rejetees = requests.filter((r) => r.status === "Rejetee").length;

    return (
        <div className="animate-fade-in space-y-6">
           
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <span />
                        <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white">
                            Mes demandes
                        </h1>
                    </div>
                    <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400">
                        Créez une nouvelle demande et suivez son traitement en temps réel.
                    </p>
                </div>

                <button
                    onClick={() => setOpenNewRequest(true)}
                    className="group inline-flex items-center justify-center gap-2 self-start rounded-xl bg-primary-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-primary-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-500/30 active:scale-[0.98] sm:self-auto"
                >
                    <Plus size={16} className="transition-transform group-hover:rotate-90" />
                    Nouvelle demande
                </button>
            </div>

           
            {!loading && total > 0 && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/60 px-5 py-3 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/60">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Vue d'ensemble
                    </span>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                    <div className="flex items-center gap-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/30">
                            <Send size={10} className="text-sky-600 dark:text-sky-400" />
                        </span>
                        <span className="text-[12px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                            {soumises}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">soumises</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                            <Hourglass size={10} className="text-amber-600 dark:text-amber-400" />
                        </span>
                        <span className="text-[12px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                            {enTraitement}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">en traitement</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                            <CheckCircle2 size={10} className="text-emerald-600 dark:text-emerald-400" />
                        </span>
                        <span className="text-[12px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                            {validees}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">validées</span>
                    </div>
                    {rejetees > 0 && (
                        <div className="flex items-center gap-1.5">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
                                <XCircle size={10} className="text-rose-600 dark:text-rose-400" />
                            </span>
                            <span className="text-[12px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                                {rejetees}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">refusées</span>
                        </div>
                    )}
                </div>
            )}

            
            <div className="card p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-md" ref={searchRef}>
                        <Search
                            size={16}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setShowSearch(true);
                            }}
                            onFocus={() => setShowSearch(true)}
                            placeholder="Rechercher par référence, type..."
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-primary-900/30"
                        />

                        <AnimatePresence>
                            {showSearch && search && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="absolute left-0 right-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                                >
                                    {filteredRequests.length ? (
                                        filteredRequests.slice(0, 8).map((r) => {
                                            return (
                                                <div
                                                    key={r.id}
                                                    className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 transition last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowSearch(false);
                                                            setSearch("");
                                                            document
                                                                .getElementById(r.id)
                                                                ?.scrollIntoView({
                                                                    behavior: "smooth",
                                                                    block: "center",
                                                                });
                                                        }}
                                                        className="min-w-0 flex-1 text-left"
                                                    >
                                                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                                                            {r.reference}
                                                        </p>
                                                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                                            {r.type} · {r.objet ?? "Sans objet"}
                                                        </p>
                                                    </button>

                                                    <div className="shrink-0">{statusBadge(r.status)}</div>

                                                    <div className="flex shrink-0 gap-1.5">
                                                        <button
                                                            type="button"
                                                            title="Voir les détails"
                                                            onClick={() => setViewingRequest(r)}
                                                            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-primary-900/50 dark:hover:bg-primary-900/20 dark:hover:text-primary-300"
                                                        >
                                                            <FileText size={15} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            title="Suivre le workflow"
                                                            onClick={() =>
                                                                navigate(
                                                                    `/student/workflow?type=${encodeURIComponent(r.type)}`
                                                                )
                                                            }
                                                            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-primary-900/50 dark:hover:bg-primary-900/20 dark:hover:text-primary-300"
                                                        >
                                                            <Route size={15} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                                            Aucun résultat pour « {search} »
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="inline-flex items-center gap-1 self-start overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800/60">
                        {FILTERS.map((f) => {
                            const Icon = f.icon;
                            const count =
                                f.value === "Tous"
                                    ? requests.length
                                    : requests.filter((r) => r.status === f.value).length;
                            return (
                                <button
                                    key={f.value}
                                    onClick={() => setStatusFilter(f.value)}
                                    className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all ${
                                        statusFilter === f.value
                                            ? "bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
                                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200"
                                    }`}
                                >
                                    <Icon size={13} />
                                    <span className="whitespace-nowrap">{f.label}</span>
                                    <span
                                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                                            statusFilter === f.value
                                                ? "bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-200"
                                                : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                                        }`}
                                    >
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

           
            {loading ? (
                <div className="card overflow-hidden">
                    <div className="space-y-0">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className="flex items-center gap-4 border-b border-slate-100 px-6 py-4 last:border-0 dark:border-slate-800"
                            >
                                <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                                    <div className="h-3 w-40 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                                </div>
                                <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="card flex flex-col items-center justify-center gap-3 p-14 text-center">
                    <div className="rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 p-5 dark:from-slate-800 dark:to-slate-700">
                        <Inbox size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-white">
                        {search || statusFilter !== "Tous"
                            ? "Aucune demande trouvée"
                            : "Vous n'avez encore aucune demande"}
                    </h3>
                    <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
                        {search || statusFilter !== "Tous"
                            ? "Essayez de modifier vos filtres ou votre recherche."
                            : "Cliquez sur « Nouvelle demande » pour lancer votre première démarche."}
                    </p>
                    {!(search || statusFilter !== "Tous") && (
                        <button
                            onClick={() => setOpenNewRequest(true)}
                            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
                        >
                            <Plus size={16} />
                            Créer ma première demande
                        </button>
                    )}
                </div>
            ) : (
                <div className="card overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px]">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30">
                                    <th className="px-6 py-4 text-left">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Demande
                                        </span>
                                    </th>
                                    <th className="px-6 py-4 text-left">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Date
                                        </span>
                                    </th>
                                    <th className="px-6 py-4 text-left">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Statut
                                        </span>
                                    </th>
                                    <th className="px-6 py-4 text-left">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Progression
                                        </span>
                                    </th>
                                    <th className="px-6 py-4 text-right">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Actions
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence initial={false}>
                                    {filteredRequests.map((r, idx) => {
                                        const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.Soumise;
                                        const progress = PROGRESS_BY_STATUS[r.status] ?? 0;
                                        const docsCount = getDocumentsForRequest(r.id).length;
                                        const Icon = cfg.icon;

                                        return (
                                            <motion.tr
                                                key={r.id}
                                                id={r.id}
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.2, delay: idx * 0.02 }}
                                                className="group border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/30"
                                            >
                                                {/* Demande */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cfg.tile}`}>
                                                            <Icon size={16} strokeWidth={1.8} />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[13px] font-bold tabular-nums text-slate-900 dark:text-white">
                                                                    {r.reference}
                                                                </p>
                                                            </div>
                                                            <p className="mt-0.5 text-[13px] font-medium text-slate-700 dark:text-slate-200">
                                                                {r.type}
                                                            </p>
                                                            {r.objet && (
                                                                <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                                                                    {r.objet}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Date */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5 text-[12px] text-slate-600 dark:text-slate-300">
                                                        <Clock size={12} className="text-slate-400" />
                                                        <span className="tabular-nums">
                                                            <p className="text-sm text-slate-600 dark:text-slate-300">{new Date(r.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</p>
                                                        </span>
                                                    </div>
                                                    {docsCount > 0 && (
                                                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                                                            <FileText size={10} />
                                                            <span>
                                                                {docsCount} doc{docsCount > 1 ? "s" : ""}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Statut */}
                                                <td className="px-6 py-4">
                                                    {statusBadge(r.status)}
                                                </td>

                                                {/* Progression */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${progress}%` }}
                                                                transition={{ duration: 0.8, ease: "easeOut", delay: idx * 0.05 }}
                                                                className={`h-full rounded-full ${
                                                                    r.status === "Rejetee"
                                                                        ? "bg-rose-500"
                                                                        : r.status === "Validee"
                                                                          ? "bg-emerald-500"
                                                                          : "bg-primary-500"
                                                                }`}
                                                            />
                                                        </div>
                                                        <span className="w-10 text-right text-[11px] font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                                                            {progress}%
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => setViewingRequest(r)}
                                                            title="Voir les détails"
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-primary-700 dark:hover:bg-primary-900/20 dark:hover:text-primary-300"
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                navigate(
                                                                    `/student/workflow?type=${encodeURIComponent(r.type)}`
                                                                )
                                                            }
                                                            title="Suivre le workflow"
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-primary-700 dark:hover:bg-primary-900/20 dark:hover:text-primary-300"
                                                        >
                                                            <Route size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 dark:border-slate-800">
                        <span className="text-[11px] font-medium tabular-nums text-slate-500 dark:text-slate-400">
                            {filteredRequests.length} demande{filteredRequests.length > 1 ? "s" : ""} affichée{filteredRequests.length > 1 ? "s" : ""}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                            {validees}/{total} validées
                        </span>
                    </div>
                </div>
            )}

            {/* ---------- Modal de détails ---------- */}
            <AnimatePresence>
                {viewingRequest && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
                        onClick={() => setViewingRequest(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.96 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                        >
                            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className={`rounded-xl p-2.5 ${STATUS_CONFIG[viewingRequest.status]?.tile ?? STATUS_CONFIG.Soumise.tile}`}>
                                        {(() => {
                                            const Icon = STATUS_CONFIG[viewingRequest.status]?.icon ?? Clock;
                                            return <Icon size={18} />;
                                        })()}
                                    </div>
                                    <div>
                                        <h2 className="text-[16px] font-bold text-slate-800 dark:text-white">
                                            {viewingRequest.type}
                                        </h2>
                                        <p className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                                            {viewingRequest.reference}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setViewingRequest(null)}
                                    className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="flex-1 space-y-5 overflow-y-auto p-6">
                                {/* Bandeau statut avec progression */}
                                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 dark:border-slate-700 dark:from-slate-800/50 dark:to-slate-900">
                                    <div className="mb-3 flex items-center justify-between">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                            Progression
                                        </span>
                                        {statusBadge(viewingRequest.status)}
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{
                                                width: `${PROGRESS_BY_STATUS[viewingRequest.status] ?? 0}%`,
                                            }}
                                            transition={{ duration: 0.8, ease: "easeOut" }}
                                            className={`h-full rounded-full ${
                                                viewingRequest.status === "Rejetee"
                                                    ? "bg-rose-500"
                                                    : viewingRequest.status === "Validee"
                                                      ? "bg-emerald-500"
                                                      : "bg-primary-500"
                                            }`}
                                        />
                                    </div>
                                    <div className="mt-2 flex justify-between text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                        <span>Soumise</span>
                                        <span>En traitement</span>
                                        <span>
                                            {viewingRequest.status === "Rejetee" ? "Rejetée" : "Validée"}
                                        </span>
                                    </div>
                                </div>

                                {/* Informations principales */}
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                            Date de création
                                        </p>
                                        <p className="mt-1 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                                            {new Date(viewingRequest.createdAt).toLocaleDateString("fr-FR", {
                                                day: "numeric",
                                                month: "long",
                                                year: "numeric",
                                            })}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                            Type de demande
                                        </p>
                                        <p className="mt-1 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                                            {viewingRequest.type}
                                        </p>
                                    </div>
                                </div>

                                {/* Objet */}
                                {viewingRequest.objet && (
                                    <div>
                                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                            Objet
                                        </p>
                                        <p className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-[14px] font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800/40 dark:text-white">
                                            {viewingRequest.objet}
                                        </p>
                                    </div>
                                )}

                                {/* Description */}
                                <div>
                                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Description
                                    </p>
                                    <div className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-[13px] leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
                                        {viewingRequest.description || "Aucune description fournie."}
                                    </div>
                                </div>

                                {/* Documents joints */}
                                <div>
                                    <div className="mb-3 flex items-center justify-between">
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                            Documents joints
                                        </p>
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                            {getDocumentsForRequest(viewingRequest.id).length}
                                        </span>
                                    </div>
                                    {getDocumentsForRequest(viewingRequest.id).length > 0 ? (
                                        <div className="space-y-2">
                                            {getDocumentsForRequest(viewingRequest.id).map((doc) => (
                                                <div
                                                    key={doc.id}
                                                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-primary-200 hover:bg-primary-50/30 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-primary-800 dark:hover:bg-primary-900/10"
                                                >
                                                    <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
                                                        <FileText size={16} className="text-red-600 dark:text-red-400" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-white">
                                                            {doc.name}
                                                        </p>
                                                        <p className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                                                            {doc.sizeKb} KB
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-700 dark:bg-slate-800/30">
                                            <FileText
                                                size={20}
                                                className="mx-auto mb-2 text-slate-400"
                                            />
                                            <p className="text-[12px] text-slate-500 dark:text-slate-400">
                                                Aucun document joint à cette demande.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-700">
                                <button
                                    onClick={() =>
                                        navigate(
                                            `/student/workflow?type=${encodeURIComponent(viewingRequest.type)}`
                                        )
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-primary-300"
                                >
                                    <Route size={14} />
                                    Voir le workflow
                                </button>
                                <button
                                    onClick={() => setViewingRequest(null)}
                                    className="rounded-lg bg-primary-600 px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-primary-700"
                                >
                                    Fermer
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <NewRequest
                open={openNewRequest}
                onClose={() => setOpenNewRequest(false)}
                onSuccess={load}
            />
        </div>
    );
}