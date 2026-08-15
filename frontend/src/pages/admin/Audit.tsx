import { useEffect, useState, useMemo, useCallback } from "react";
import {
    Activity, Search, Filter, Download, RefreshCw, Globe, Monitor, Clock,
    Database, Shield, AlertTriangle, CheckCircle2, Info, XCircle, Calendar,
    Hash, User, Server, X, ArrowUpDown, FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getAuditLogs, getAuditStats } from "../../services/superadmin.service";

const SEVERITY_MAP: Record<string, string> = {
    CREATE: "SUCCESS", LOGIN: "INFO", LOGOUT: "INFO", READ: "INFO",
    UPDATE: "WARNING", DELETE: "ERROR", VALIDATE: "SUCCESS", REJECT: "WARNING",
    RESET_PASSWORD: "CRITICAL", TOGGLE_STATUS: "WARNING", UPDATE_PERMISSIONS: "CRITICAL",
};

const SEVERITY_STYLES: Record<string, { bg: string; text: string; icon: any; dot: string; border: string }> = {
    INFO:     { bg: "bg-sky-50 dark:bg-sky-950/30",       text: "text-sky-700 dark:text-sky-400",         icon: Info,         dot: "bg-sky-500",     border: "border-sky-200 dark:border-sky-900" },
    SUCCESS:  { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", icon: CheckCircle2, dot: "bg-emerald-500", border: "border-emerald-200 dark:border-emerald-900" },
    WARNING:  { bg: "bg-amber-50 dark:bg-amber-950/30",   text: "text-amber-700 dark:text-amber-400",     icon: AlertTriangle,dot: "bg-amber-500",   border: "border-amber-200 dark:border-amber-900" },
    ERROR:    { bg: "bg-rose-50 dark:bg-rose-950/30",     text: "text-rose-700 dark:text-rose-400",       icon: XCircle,      dot: "bg-rose-500",    border: "border-rose-200 dark:border-rose-900" },
    CRITICAL: { bg: "bg-red-50 dark:bg-red-950/40",       text: "text-red-700 dark:text-red-400",         icon: Shield,       dot: "bg-red-600",     border: "border-red-300 dark:border-red-900" },
};

const getSeverity = (action: string) => SEVERITY_MAP[(action || "").toUpperCase()] || "INFO";

const formatTimestamp = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
};

const formatRelative = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `il y a ${hours}h`;
    return `il y a ${Math.floor(hours / 24)}j`;
};

export default function AdminAudit() {
    const [logs, setLogs] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [search, setSearch] = useState("");
    const [moduleFilter, setModuleFilter] = useState("");
    const [entiteFilter, setEntiteFilter] = useState("");
    const [actionFilter, setActionFilter] = useState("");
    const [severityFilter, setSeverityFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<any | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [sortBy, setSortBy] = useState<"date" | "severity">("date");
    const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [logsData, statsData] = await Promise.all([
                getAuditLogs({ search, module: moduleFilter, entite: entiteFilter, action: actionFilter }),
                getAuditStats(),
            ]);
            setLogs(logsData);
            setStats(statsData);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [search, moduleFilter, entiteFilter, actionFilter]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(load, 10000);
        return () => clearInterval(interval);
    }, [autoRefresh, load]);

    const availableModules = useMemo(() => [...new Set(logs.map((l) => l.module).filter(Boolean))].sort(), [logs]);
    const availableEntites = useMemo(() => [...new Set(logs.map((l) => l.entite).filter(Boolean))].sort(), [logs]);
    const availableActions = useMemo(() => [...new Set(logs.map((l) => l.action).filter(Boolean))].sort(), [logs]);

    const sortedLogs = useMemo(() => {
        const copy = [...logs];
        if (sortBy === "severity") {
            const order: Record<string, number> = { CRITICAL: 5, ERROR: 4, WARNING: 3, SUCCESS: 2, INFO: 1 };
            copy.sort((a, b) => sortOrder === "desc"
                ? (order[getSeverity(b.action)] || 0) - (order[getSeverity(a.action)] || 0)
                : (order[getSeverity(a.action)] || 0) - (order[getSeverity(b.action)] || 0));
        } else {
            copy.sort((a, b) => sortOrder === "desc"
                ? new Date(b.date_action).getTime() - new Date(a.date_action).getTime()
                : new Date(a.date_action).getTime() - new Date(b.date_action).getTime());
        }
        return copy;
    }, [logs, sortBy, sortOrder]);

    const filteredLogs = useMemo(() => {
        if (!severityFilter) return sortedLogs;
        return sortedLogs.filter((l) => getSeverity(l.action) === severityFilter);
    }, [sortedLogs, severityFilter]);

    const severityCounts = useMemo(() => {
        const counts: Record<string, number> = { INFO: 0, SUCCESS: 0, WARNING: 0, ERROR: 0, CRITICAL: 0 };
        logs.forEach((l) => counts[getSeverity(l.action)]++);
        return counts;
    }, [logs]);

    const toggleSort = (field: "date" | "severity") => {
        if (sortBy === field) setSortOrder(sortOrder === "desc" ? "asc" : "desc");
        else { setSortBy(field); setSortOrder("desc"); }
    };

    const exportCSV = () => {
        const escape = (val: any) => `"${String(val == null ? "" : val).replace(/"/g, '""')}"`;
        const headers = ["Date", "Heure", "Utilisateur", "Email", "Rôle", "Action", "Module", "Entité", "IP"];
        const rows = filteredLogs.map((l) => {
            const d = new Date(l.date_action);
            return [
                d.toLocaleDateString("fr-FR"),
                d.toLocaleTimeString("fr-FR", { hour12: false }),
                `${l.prenom ?? ""} ${l.nom ?? ""}`.trim(),
                l.email ?? "", l.nom_role ?? "", l.action ?? "",
                l.module ?? "", l.entite ?? "", l.adresse_ip ?? "",
            ].map(escape).join(",");
        });
        const csv = "\uFEFF" + [headers.map(escape).join(","), ...rows].join("\r\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `journal-audit-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const resetFilters = () => { setSearch(""); setModuleFilter(""); setEntiteFilter(""); setActionFilter(""); setSeverityFilter(""); };
    const hasActiveFilters = search || moduleFilter || entiteFilter || actionFilter || severityFilter;

    return (
        <div className="flex h-[calc(100vh-120px)] gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                <header className="flex shrink-0 items-end justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                            <Activity size={14} className="text-slate-700 dark:text-slate-300" />
                        </div>
                        <div>
                            <h1 className="text-[16px] font-semibold tracking-tight text-slate-900 dark:text-white">Journal d'audit</h1>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Traçabilité complète des actions système</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button onClick={() => setAutoRefresh(!autoRefresh)} className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium transition ${autoRefresh ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
                            <RefreshCw size={10} className={autoRefresh ? "animate-spin" : ""} />
                            Auto
                        </button>
                        <button onClick={load} disabled={loading} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                            <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
                            Actualiser
                        </button>
                        <button onClick={exportCSV} disabled={filteredLogs.length === 0} className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-slate-800 disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                            <Download size={10} />
                            Exporter CSV
                        </button>
                    </div>
                </header>

                <div className="grid shrink-0 grid-cols-5 gap-1.5">
                    {(["INFO", "SUCCESS", "WARNING", "ERROR", "CRITICAL"] as const).map((sev) => {
                        const style = SEVERITY_STYLES[sev];
                        const Icon = style.icon;
                        const count = severityCounts[sev] || 0;
                        const isActive = severityFilter === sev;
                        return (
                            <button key={sev} onClick={() => setSeverityFilter(isActive ? "" : sev)} className={`rounded-lg border p-1.5 text-left transition ${isActive ? `${style.bg} ${style.border}` : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"}`}>
                                <div className="flex items-center justify-between">
                                    <Icon size={10} className={isActive ? style.text : "text-slate-400"} />
                                    <span className={`text-[14px] font-semibold tabular-nums ${isActive ? style.text : "text-slate-900 dark:text-white"}`}>{count}</span>
                                </div>
                                <p className={`mt-0.5 truncate text-[8px] font-medium uppercase tracking-wider ${isActive ? style.text : "text-slate-500 dark:text-slate-400"}`}>{sev}</p>
                            </button>
                        );
                    })}
                </div>

                <div className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center">
                        <div className="relative flex-1">
                            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par acteur, email, action, IP..." className="w-full rounded-md border border-slate-200 bg-white py-1 pl-7 pr-2.5 text-[11.5px] text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                            <Filter size={10} className="text-slate-400" />
                            <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[11px] font-medium text-slate-700 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                <option value="">Module</option>
                                {availableModules.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <select value={entiteFilter} onChange={(e) => setEntiteFilter(e.target.value)} className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[11px] font-medium text-slate-700 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                <option value="">Entité</option>
                                {availableEntites.map((e) => <option key={e} value={e}>{e}</option>)}
                            </select>
                            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[11px] font-medium text-slate-700 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                <option value="">Action</option>
                                {availableActions.map((a) => <option key={a} value={a}>{a}</option>)}
                            </select>
                            {hasActiveFilters && (
                                <button onClick={resetFilters} className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700">
                                    <X size={9} />
                                    Effacer
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex shrink-0 items-center justify-between">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-900 dark:text-white">{filteredLogs.length}</span> événement{filteredLogs.length !== 1 ? "s" : ""} · {stats?.total || logs.length} au total
                    </p>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">Trier :</span>
                        <button onClick={() => toggleSort("date")} className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium transition ${sortBy === "date" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
                            <Calendar size={9} />
                            Date
                            {sortBy === "date" && <ArrowUpDown size={8} />}
                        </button>
                        <button onClick={() => toggleSort("severity")} className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium transition ${sortBy === "severity" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
                            <Shield size={9} />
                            Sévérité
                            {sortBy === "severity" && <ArrowUpDown size={8} />}
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    {loading && logs.length === 0 ? (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-14 animate-pulse bg-slate-50 dark:bg-slate-800/50" />
                            ))}
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                                <Activity size={18} className="text-slate-400" />
                            </div>
                            <div>
                                <p className="text-[12px] font-medium text-slate-900 dark:text-white">Aucun événement trouvé</p>
                                <p className="mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400">
                                    {hasActiveFilters ? "Essayez d'ajuster vos filtres." : "Les actions système apparaîtront ici."}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800
                            [&::-webkit-scrollbar]:w-2
                            [&::-webkit-scrollbar-track]:bg-slate-100
                            dark:[&::-webkit-scrollbar-track]:bg-slate-800
                            [&::-webkit-scrollbar-thumb]:rounded-full
                            [&::-webkit-scrollbar-thumb]:bg-slate-300
                            dark:[&::-webkit-scrollbar-thumb]:bg-slate-600
                            [scrollbar-width:thin]
                            [scrollbar-color:#cbd5e1_#f1f5f9]
                            dark:[scrollbar-color:#475569_#1e293b]">
                            {filteredLogs.map((log) => {
                                const severity = getSeverity(log.action);
                                const style = SEVERITY_STYLES[severity];
                                const Icon = style.icon;
                                const isSelected = selectedLog?.id_log === log.id_log;

                                return (
                                    <button key={log.id_log} onClick={() => setSelectedLog(isSelected ? null : log)} className={`relative flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition ${isSelected ? "bg-slate-50 dark:bg-slate-800/60" : "hover:bg-slate-50/60 dark:hover:bg-slate-800/30"}`}>
                                        {isSelected && <span className="absolute inset-y-0 left-0 w-0.5 bg-slate-900 dark:bg-white" />}

                                        <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded ${style.bg}`}>
                                            <Icon size={11} className={style.text} />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${style.bg} ${style.text}`}>
                                                    <span className={`h-0.5 w-0.5 rounded-full ${style.dot}`} />
                                                    {log.action}
                                                </span>
                                                {log.module && <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{log.module}</span>}
                                                {log.entite && <span className="hidden text-[10px] text-slate-400 sm:inline">· {log.entite}</span>}
                                            </div>
                                            <p className="mt-0.5 truncate text-[11.5px] text-slate-800 dark:text-slate-200">
                                                <span className="font-medium">{log.prenom} {log.nom}</span>
                                                {log.email && <span className="ml-1 text-slate-400">{log.email}</span>}
                                            </p>
                                            <div className="mt-0.5 flex items-center gap-2 text-[9.5px] text-slate-400">
                                                {log.adresse_ip && (
                                                    <span className="inline-flex items-center gap-0.5 font-mono">
                                                        <Globe size={8} />
                                                        {log.adresse_ip}
                                                    </span>
                                                )}
                                                {log.entite_id && (
                                                    <span className="inline-flex items-center gap-0.5 font-mono">
                                                        <Hash size={8} />
                                                        {String(log.entite_id).substring(0, 8)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="shrink-0 text-right">
                                            <p className="font-mono text-[9.5px] font-medium tabular-nums text-slate-600 dark:text-slate-300">
                                                {formatTimestamp(log.date_action)}
                                            </p>
                                            <p className="mt-0.5 text-[9px] text-slate-400">{formatRelative(log.date_action)}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <aside className="hidden w-[320px] shrink-0 xl:block">
                <DetailsPanel log={selectedLog} onClose={() => setSelectedLog(null)} />
            </aside>

            <AnimatePresence>
                {selectedLog && (
                    <div className="fixed inset-0 z-50 xl:hidden">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedLog(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "tween", duration: 0.25, ease: "easeOut" }} className="absolute inset-y-0 right-0 w-full max-w-[400px] bg-white shadow-2xl dark:bg-slate-900">
                            <DetailsPanel log={selectedLog} onClose={() => setSelectedLog(null)} fullHeight />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function DetailsPanel({ log, onClose, fullHeight = false }: { log: any; onClose: () => void; fullHeight?: boolean }) {
    if (!log) {
        return (
            <div className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-white/50 text-center dark:border-slate-800 dark:bg-slate-900/50 ${fullHeight ? "h-full" : "h-full"}`}>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <FileText size={15} className="text-slate-400" />
                </div>
                <div>
                    <p className="text-[12px] font-medium text-slate-900 dark:text-white">Aucun événement sélectionné</p>
                    <p className="mt-0.5 max-w-[200px] text-[10.5px] text-slate-500 dark:text-slate-400">
                        Cliquez sur un événement dans la liste pour inspecter ses détails.
                    </p>
                </div>
            </div>
        );
    }

    const severity = getSeverity(log.action);
    const style = SEVERITY_STYLES[severity];
    const SIcon = style.icon;

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                    <FileText size={11} className="text-slate-400" />
                    <span className="text-[11px] font-semibold text-slate-900 dark:text-white">Détails de l'événement</span>
                </div>
                <button onClick={onClose} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <X size={11} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto
                [&::-webkit-scrollbar]:w-2
                [&::-webkit-scrollbar-track]:bg-slate-100
                dark:[&::-webkit-scrollbar-track]:bg-slate-800
                [&::-webkit-scrollbar-thumb]:rounded-full
                [&::-webkit-scrollbar-thumb]:bg-slate-300
                dark:[&::-webkit-scrollbar-thumb]:bg-slate-600
                [scrollbar-width:thin]
                dark:[scrollbar-color:#475569_#1e293b]">
                <div className={`border-b px-3 py-2.5 ${style.bg} ${style.border}`}>
                    <div className="flex items-center gap-2">
                        <SIcon size={14} className={style.text} />
                        <div>
                            <p className={`font-mono text-[12px] font-semibold ${style.text}`}>{log.action}</p>
                            <p className={`text-[9px] font-medium uppercase tracking-wider ${style.text}`}>
                                {severity} · {log.module || "—"}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    <Section title="Acteur" icon={User}>
                        <Row label="Nom" value={`${log.prenom} ${log.nom}`} />
                        <Row label="Email" value={log.email} mono />
                        <Row label="Rôle" value={log.nom_role} />
                    </Section>

                    <Section title="Ressource" icon={Database}>
                        <Row label="Module" value={log.module || "—"} />
                        <Row label="Entité" value={log.entite || "—"} />
                        <Row label="ID" value={log.entite_id ? String(log.entite_id) : "—"} mono truncate />
                    </Section>

                    <Section title="Technique" icon={Server}>
                        <Row label="Adresse IP" value={log.adresse_ip || "—"} mono />
                        {log.user_agent ? (
                            <div className="px-3 py-1.5">
                                <div className="flex items-center gap-1">
                                    <Monitor size={9} className="text-slate-400" />
                                    <span className="text-[9px] font-medium uppercase tracking-wider text-slate-500">User Agent</span>
                                </div>
                                <p className="mt-0.5 line-clamp-3 break-all font-mono text-[9.5px] text-slate-600 dark:text-slate-300">{log.user_agent}</p>
                            </div>
                        ) : (
                            <Row label="User Agent" value="—" muted />
                        )}
                    </Section>

                    <Section title="Horodatage" icon={Clock}>
                        <Row label="Date" value={formatTimestamp(log.date_action)} mono />
                        <Row label="ISO 8601" value={new Date(log.date_action).toISOString()} mono truncate />
                        <Row label="Relatif" value={formatRelative(log.date_action)} />
                    </Section>

                    {log.donnees_avant && <JsonSection title="Données avant" data={log.donnees_avant} variant="rose" />}
                    {log.donnees_apres && <JsonSection title="Données après" data={log.donnees_apres} variant="emerald" />}
                </div>
            </div>

            <div className="shrink-0 border-t border-slate-200 px-3 py-1.5 dark:border-slate-800">
                <p className="font-mono text-[9px] text-slate-400">ID événement : {log.id_log}</p>
            </div>
        </div>
    );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
    return (
        <div>
            <div className="flex items-center gap-1 border-b border-slate-100 px-3 py-1.5 dark:border-slate-800">
                <Icon size={10} className="text-slate-400" />
                <h4 className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h4>
            </div>
            <div>{children}</div>
        </div>
    );
}

function Row({ label, value, mono = false, truncate = false, muted = false }: { label: string; value: string; mono?: boolean; truncate?: boolean; muted?: boolean }) {
    return (
        <div className="flex items-start justify-between gap-2 px-3 py-1.5">
            <span className="shrink-0 text-[10px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
            <span className={`max-w-[60%] text-right text-[10.5px] ${mono ? "font-mono" : ""} ${truncate ? "truncate" : ""} ${muted ? "text-slate-300 dark:text-slate-600" : "font-medium text-slate-800 dark:text-slate-100"}`} title={value}>{value}</span>
        </div>
    );
}

function JsonSection({ title, data, variant }: { title: string; data: any; variant: "rose" | "emerald" }) {
    const colors = variant === "rose"
        ? { header: "bg-rose-50 dark:bg-rose-950/20", text: "text-rose-700 dark:text-rose-400" }
        : { header: "bg-emerald-50 dark:bg-emerald-950/20", text: "text-emerald-700 dark:text-emerald-400" };

    return (
        <div>
            <div className={`flex items-center gap-1 border-b border-slate-100 px-3 py-1.5 dark:border-slate-800 ${colors.header}`}>
                <Database size={10} className={colors.text} />
                <h4 className={`text-[9px] font-semibold uppercase tracking-wider ${colors.text}`}>{title}</h4>
            </div>
            <div className="p-2.5">
                <pre className="max-h-40 overflow-auto rounded border border-slate-200 bg-slate-50 p-2.5 font-mono text-[9px] leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                    {JSON.stringify(data, null, 2)}
                </pre>
            </div>
        </div>
    );
}