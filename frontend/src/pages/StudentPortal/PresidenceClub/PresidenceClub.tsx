import { useEffect, useMemo, useState, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus, Search, Eye, X, Users,Building2, ArrowRight, Wallet, Clock,
    CheckCircle2, XCircle, MapPin, Package, Megaphone, Calendar,
    Handshake, Paperclip,
} from "lucide-react";
import StatCard from "../../../components/student/dashboard/StatCard";
import { formatDate } from "../../../utils/format";

const API = "http://localhost:3000/api/student";

const TYPE_CONFIG: Record<string, any> = {
    Salle: { label: "Salle", icon: MapPin, dot: "bg-blue-500", tile: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" },
    Materiel: { label: "Matériel", icon: Package, dot: "bg-purple-500", tile: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300" },
    Budget: { label: "Budget", icon: Wallet, dot: "bg-emerald-500", tile: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" },
    Communication: { label: "Communication", icon: Megaphone, dot: "bg-sky-500", tile: "bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300" },
    Sponsoring: { label: "Sponsoring", icon: Handshake, dot: "bg-rose-500", tile: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300" },
    Evenement: { label: "Événement", icon: Calendar, dot: "bg-amber-500", tile: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300" },
    Autre: { label: "Autre", icon: Paperclip, dot: "bg-slate-500", tile: "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
};

const TYPE_COLORS: Record<string, string> = {
    Salle: "#3B82F6", Materiel: "#8B5CF6", Budget: "#10B981",
    Communication: "#0EA5E9", Sponsoring: "#F43F5E", Evenement: "#F59E0B",
};

const DEMANDE_STATUS: Record<string, any> = {
    Soumise: { label: "Soumise", cls: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
    En_Revue: { label: "En revue", cls: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
    Approuvee: { label: "Approuvée", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
    Rejetee: { label: "Rejetée", cls: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
};

const STATUS_BAR: Record<string, string> = {
    Soumise: "bg-blue-500", En_Revue: "bg-amber-500",
    Approuvee: "bg-emerald-500", Rejetee: "bg-rose-500",
};

const STEPS = ["Soumise", "En revue", "Décision"];
const getStatusIndex = (s: string) =>
    s === "Soumise" ? 0 : s === "En_Revue" ? 1 : 2;

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
                            ? rejected ? "bg-rose-500" : "bg-emerald-500"
                            : "bg-primary-500";
                    return (
                        <Fragment key={step}>
                            {i > 0 && (
                                <div className={`h-0.5 flex-1 rounded-full ${i <= idx ? "bg-primary-300 dark:bg-primary-800" : "bg-slate-200 dark:bg-slate-700"}`} />
                            )}
                            <div
                                title={step}
                                className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColor} ${i === idx ? "ring-2 ring-primary-300 ring-offset-1 dark:ring-primary-700 dark:ring-offset-slate-900" : ""}`}
                            />
                        </Fragment>
                    );
                })}
            </div>
            <div className="mt-1 flex justify-between text-[8px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <span>Soumise</span><span>En revue</span>
                <span>{idx >= 2 ? (rejected ? "Rejetée" : "Approuvée") : "Décision"}</span>
            </div>
        </div>
    );
}


function TypeDonut({ demandes }: { demandes: any[] }) {
    const data = Object.keys(TYPE_CONFIG)
        .map((key) => ({ key, cfg: TYPE_CONFIG[key], count: demandes.filter((d) => d.type === key).length }))
        .filter((d) => d.count > 0);
    const total = data.reduce((a, d) => a + d.count, 0);
    const radius = 40;
    const C = 2 * Math.PI * radius;
    let acc = 0;
    return (
        <div className="flex items-center gap-4">
            <div className="relative h-[90px] w-[90px] shrink-0">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="12" className="stroke-slate-100 dark:stroke-slate-800" />
                    {data.map((d) => {
                        const len = total ? (d.count / total) * C : 0;
                        const seg = (
                            <circle key={d.key} cx="50" cy="50" r={radius} fill="none" strokeWidth="12"
                                stroke={TYPE_COLORS[d.key]} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} />
                        );
                        acc += len;
                        return seg;
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{total}</span>
                    <span className="text-[8px] font-semibold uppercase tracking-wider text-slate-400">Total</span>
                </div>
            </div>
            <div className="flex-1 space-y-1.5">
                {data.map((d) => (
                    <div key={d.key} className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${d.cfg.dot}`} />
                        <span className="flex-1 truncate text-[11px] font-medium text-slate-600 dark:text-slate-300">{d.cfg.label}</span>
                        <span className="text-[11px] font-bold tabular-nums text-slate-800 dark:text-white">{d.count}</span>
                    </div>
                ))}
                {data.length === 0 && <p className="text-[11px] text-slate-400 dark:text-slate-500">Aucune donnée pour le moment.</p>}
            </div>
        </div>
    );
}

function StatusBreakdown({ demandes }: { demandes: any[] }) {
    const total = demandes.length || 1;
    return (
        <div className="space-y-2.5">
            {Object.entries(DEMANDE_STATUS).map(([key, st]) => {
                const count = demandes.filter((d) => d.statut === key).length;
                return (
                    <div key={key}>
                        <div className="mb-0.5 flex items-center justify-between">
                            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{st.label}</span>
                            <span className="text-[10.5px] font-bold tabular-nums text-slate-700 dark:text-slate-200">{count}</span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(count / total) * 100}%` }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className={`h-full rounded-full ${STATUS_BAR[key]}`} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
// ✅ Convertit l'objet JSON PostgreSQL en texte affichable
function formatJustificatifs(j: any): string {
  if (!j) return "—";
  if (typeof j === "string") return j;
  if (typeof j === "object") {
    // Si c'est un objet {note: "..."}, on extrait le texte
    if (j.note) return j.note;
    // Sinon, on affiche toutes les valeurs
    return Object.entries(j)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  }
  return String(j);
}

export default function PresidenceClub() {
    const [club, setClub] = useState<any>(null);
    const [demandes, setDemandes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [viewing, setViewing] = useState<any | null>(null);
    const [openModal, setOpenModal] = useState(false);

    const load = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API}/presidence`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setClub(data.club);
                setDemandes(data.demandes ?? []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const enCours = demandes.filter((d) => ["Soumise", "En_Revue"].includes(d.statut)).length;
    const approuvees = demandes.filter((d) => d.statut === "Approuvee").length;
    const rejetees = demandes.filter((d) => d.statut === "Rejetee").length;
    const budgetTotal = Number(club?.budget || 0);
    const budgetUtilise = demandes.filter((d) => d.statut === "Approuvee").reduce((s, d) => s + Number(d.budget_demande || 0), 0);
    const budgetRestant = budgetTotal - budgetUtilise;
    const approvalRate = demandes.length === 0 ? 0 : Math.round((approuvees / demandes.length) * 100);

    const stats = [
        { id: "club-budget", title: "Budget disponible", value: budgetRestant, description: `Sur ${budgetTotal.toLocaleString("fr-MA")} MAD`, icon: "Wallet", accent: "blue", sparkline: [1, 2, 2, 3, 3, 4, budgetRestant] },
        { id: "club-encours", title: "En cours", value: enCours, description: "En attente de traitement", icon: "Clock", accent: "sky", sparkline: [1, 1, 2, 2, 3, 2, enCours] },
        { id: "club-approuvees", title: "Approuvées", value: approuvees, description: "Demandes validées", icon: "CheckCircle2", accent: "indigo", trend: { value: approvalRate, direction: "up" }, sparkline: [0, 1, 1, 2, 2, 3, approuvees] },
        { id: "club-rejetees", title: "Rejetées", value: rejetees, description: "Refusées par la scolarité", icon: "XCircle", accent: "cyan", sparkline: [1, 0, 1, 1, 0, 1, rejetees] },
    ];

    const filtered = useMemo(() => {
        return demandes.filter((d) => {
            const q = search.toLowerCase();
            const matchSearch = !q || d.objet?.toLowerCase().includes(q) || (d.description ?? "").toLowerCase().includes(q);
            const matchType = typeFilter === "all" || d.type === typeFilter;
            const matchStatus = statusFilter === "all" || d.statut === statusFilter;
            return matchSearch && matchType && matchStatus;
        });
    }, [demandes, search, typeFilter, statusFilter]);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => <div key={i} className="card h-24 animate-pulse" />)}
                </div>
                <div className="card h-80 animate-pulse" />
            </div>
        );
    }

    if (!club) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                    <Building2 size={16} className="text-slate-400" />
                </div>
                <p className="max-w-sm text-[12px] text-slate-500 dark:text-slate-400">Vous n'êtes pas président d'un club.</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-4">
            {/* ═══ BANNIÈRE CLUB (même couleur que réclamations) ═══ */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 p-4 shadow-lg shadow-primary-500/20">
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-14 right-32 h-32 w-32 rounded-full bg-white/10 blur-xl" />
                <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm">
                            <Building2 size={19} strokeWidth={1.8} />
                        </div>
                        <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl md:text-3xl font-bold">{club.nom}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 backdrop-blur-sm px-2.5 py-0.5 text-xs font-semibold text-emerald-100 ring-1 ring-emerald-300/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                  Actif
                </span>
              </div>
              <p className="text-sm text-indigo-100">{club.description}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-indigo-100">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Président
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Mandat actif
                </span>
              </div>
            </div>
                    </div>
                    <button 
  onClick={() => setOpenModal(true)}
  className="group inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-white px-4 py-2 text-[12px] font-bold text-primary-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] sm:self-auto"
>
  <Plus 
    size={13} 
    className="transition-transform duration-300 group-hover:rotate-90" 
  />
  Nouvelle demande
</button>

                </div>
            </motion.div>

            {/* ═══ STATS (même StatCard que réclamations) ═══ */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat, i) => (
                    <StatCard key={stat.id} data={stat as any} accent={stat.accent as any} index={i} />
                ))}
            </div>

            {/* ═══ TABLE + PANNEAUX ═══ */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                <div className="card self-start xl:col-span-2">
                    <div className="flex flex-col gap-2.5 border-b border-slate-200/70 px-5 py-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
                        <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Demandes du club</h3>
                        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                            <div className="relative">
                                <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..."
                                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-[11px] text-slate-700 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none sm:w-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500" />
                            </div>
                            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                <option value="all">Tous types</option>
                                {Object.entries(TYPE_CONFIG).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
                            </select>
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                <option value="all">Tous statuts</option>
                                {Object.entries(DEMANDE_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                                <Search size={16} className="text-slate-400" />
                            </div>
                            <p className="max-w-sm text-[12px] text-slate-500 dark:text-slate-400">
                                {demandes.length === 0 ? "Aucune demande soumise pour le moment." : "Aucune demande ne correspond à vos filtres."}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px] text-left">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30">
                                        <th className="px-5 py-2.5 text-[9.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Type</th>
                                        <th className="px-5 py-2.5 text-[9.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Objet</th>
                                        <th className="px-5 py-2.5 text-[9.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
                                        <th className="px-5 py-2.5 text-[9.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Budget</th>
                                        <th className="px-5 py-2.5 text-[9.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Statut</th>
                                        <th className="px-5 py-2.5 text-right text-[9.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filtered.map((d) => {
                                        const cfg = TYPE_CONFIG[d.type] ?? TYPE_CONFIG.Autre;
                                        const st = DEMANDE_STATUS[d.statut] ?? DEMANDE_STATUS.Soumise;
                                        const Icon = cfg.icon;
                                        return (
                                            <tr key={d.id_demande_club} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                                                <td className="whitespace-nowrap px-5 py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${cfg.tile}`}>
                                                            <Icon size={13} strokeWidth={1.8} />
                                                        </div>
                                                        <span className="text-[11.5px] font-semibold text-slate-700 dark:text-slate-200">{cfg.label}</span>
                                                    </div>
                                                </td>
                                                <td className="max-w-[240px] px-5 py-2.5">
                                                    <p className="truncate text-[12px] font-semibold text-slate-800 dark:text-slate-100">{d.objet}</p>
                                                    <p className="truncate text-[10.5px] text-slate-400 dark:text-slate-500">{d.description}</p>
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-2.5 text-[11.5px] tabular-nums text-slate-500 dark:text-slate-400">
                                                    {formatDate(d.date_demande)}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-2.5 text-[11.5px] tabular-nums text-slate-700 dark:text-slate-200">
                                                    {Number(d.budget_demande || 0).toLocaleString("fr-MA")} MAD
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-2.5">
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.cls}`}>{st.label}</span>
                                                </td>
                                                <td className="px-5 py-2.5 text-right">
                                                    <button onClick={() => setViewing(d)} title="Voir les détails"
                                                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-primary-700 dark:hover:bg-primary-900/20 dark:hover:text-primary-300">
                                                        <Eye size={13} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-2 text-[10px] font-medium text-slate-400 dark:border-slate-800 dark:text-slate-500">
                        <span className="tabular-nums">{filtered.length} sur {demandes.length} demande(s)</span>
                        <span>Taux d'approbation : {approvalRate}%</span>
                    </div>
                </div>

                <div className="space-y-5">
                    <div className="card p-4">
                        <h3 className="mb-3 text-[13px] font-bold text-slate-800 dark:text-slate-100">Répartition par type</h3>
                        <TypeDonut demandes={demandes} />
                    </div>
                    <div className="card p-4">
                        <h3 className="mb-3 text-[13px] font-bold text-slate-800 dark:text-slate-100">Avancement des statuts</h3>
                        <StatusBreakdown demandes={demandes} />
                    </div>
                </div>
            </div>

            {/* ═══ MODAL DÉTAILS (même style que réclamations) ═══ */}
            <AnimatePresence>
                {viewing && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm" onClick={() => setViewing(null)}>
                        <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                            <div className="flex items-start justify-between gap-2.5 border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                                <div className="flex min-w-0 items-start gap-2.5">
                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${(TYPE_CONFIG[viewing.type] ?? TYPE_CONFIG.Autre).tile}`}>
                                        {(() => { const Icon = (TYPE_CONFIG[viewing.type] ?? TYPE_CONFIG.Autre).icon; return <Icon size={15} strokeWidth={1.8} />; })()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                            {(TYPE_CONFIG[viewing.type] ?? TYPE_CONFIG.Autre).label} · {club.nom}
                                        </p>
                                        <h2 className="mt-0.5 truncate text-[14px] font-bold text-slate-800 dark:text-white">{viewing.objet}</h2>
                                    </div>
                                </div>
                                <button onClick={() => setViewing(null)} className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800">
                                    <X size={15} />
                                </button>
                            </div>

                            <div className="space-y-4 overflow-y-auto p-5">
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 dark:border-slate-700 dark:bg-slate-800/40">
                                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Date de soumission</p>
                                        <p className="mt-0.5 text-[11.5px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">{formatDate(viewing.date_demande)}</p>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 dark:border-slate-700 dark:bg-slate-800/40">
                                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Statut actuel</p>
                                        <span className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${(DEMANDE_STATUS[viewing.statut] ?? DEMANDE_STATUS.Soumise).cls}`}>
                                            {(DEMANDE_STATUS[viewing.statut] ?? DEMANDE_STATUS.Soumise).label}
                                        </span>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 dark:border-slate-700 dark:bg-slate-800/40">
                                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Date événement</p>
                                        <p className="mt-0.5 text-[11.5px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                                            {viewing.date_evenement ? formatDate(viewing.date_evenement) : "—"}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 dark:border-slate-700 dark:bg-slate-800/40">
                                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Horaires</p>
                                        <p className="mt-0.5 text-[11.5px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                                            {viewing.heure_debut ? `${viewing.heure_debut} – ${viewing.heure_fin}` : "—"}
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 dark:border-slate-700 dark:bg-slate-800/40">
                                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Budget demandé</p>
                                    <p className="mt-0.5 text-[13px] font-bold tabular-nums text-slate-800 dark:text-slate-100">
                                        {Number(viewing.budget_demande || 0).toLocaleString("fr-MA")} MAD
                                    </p>
                                </div>

                                <div>
                                    <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Description</p>
                                    <p className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-[12px] leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
                                        {viewing.description || "Aucune description fournie."}
                                    </p>
                                </div>

                               {viewing.justificatifs && (
  <div>
    <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Justificatifs</p>
    <p className="flex items-start gap-1.5 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 text-[11.5px] text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
      <Paperclip size={12} className="shrink-0 mt-0.5" />
      <span className="whitespace-pre-wrap break-words">
        {formatJustificatifs(viewing.justificatifs)}
      </span>
    </p>
  </div>
)}

                                <div>
                                    <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Avancement</p>
                                    <StatusStepper status={viewing.statut} />
                                </div>
                            </div>

                            <div className="flex justify-end border-t border-slate-200 px-5 py-3 dark:border-slate-700">
                                <button onClick={() => setViewing(null)} className="rounded-lg bg-primary-600 px-4 py-1.5 text-[12px] font-semibold text-white transition hover:bg-primary-700">
                                    Fermer
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <NewDemandeModal open={openModal} onClose={() => setOpenModal(false)}
                onSuccess={() => { setOpenModal(false); load(); }} budgetRestant={budgetRestant} />
        </div>
    );
}

/* ═══ MODAL NOUVELLE DEMANDE (tous les champs de demande_club) ═══ */
function NewDemandeModal({ open, onClose, onSuccess, budgetRestant }: any) {
    const [form, setForm] = useState({
        type: "Salle", objet: "", description: "", budgetDemande: 0,
        dateDebut: "", heureDebut: "", heureFin: "", justificatif: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API}/presidence/demandes`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) {
                setForm({ type: "Salle", objet: "", description: "", budgetDemande: 0, dateDebut: "", heureDebut: "", heureFin: "", justificatif: "" });
                onSuccess();
            } else setError(data.message || "Erreur lors de la création.");
        } catch {
            setError("Erreur de connexion au serveur.");
        }
        setSubmitting(false);
    };

    const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
    const label = "mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-300";

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm" onClick={() => !submitting && onClose()}>
                    <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-start justify-between gap-2.5 border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                            <div>
                                <h2 className="text-[14px] font-bold text-slate-800 dark:text-white">Nouvelle demande</h2>
                                <p className="text-[10.5px] text-slate-400 dark:text-slate-500">Salle, matériel, budget, événement…</p>
                            </div>
                            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"><X size={15} /></button>
                        </div>

                        <form onSubmit={submit} className="space-y-3 overflow-y-auto p-5">
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className={label}>Type de demande</label>
                                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={input}>
                                        {Object.entries(TYPE_CONFIG).filter(([k]) => k !== "Autre").map(([k, c]) => (
                                            <option key={k} value={k}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={label}>Budget demandé (MAD)</label>
                                    <input type="number" min={0} step={100} value={form.budgetDemande}
                                        onChange={(e) => setForm({ ...form, budgetDemande: parseFloat(e.target.value) || 0 })} className={input} />
                                </div>
                            </div>

                            <div>
                                <label className={label}>Objet <span className="text-rose-500">*</span></label>
                                <input required value={form.objet} onChange={(e) => setForm({ ...form, objet: e.target.value })}
                                    placeholder="Ex : Salle pour hackathon du 20 mars" className={input} />
                            </div>

                            <div>
                                <label className={label}>Description <span className="text-rose-500">*</span></label>
                                <textarea required rows={3} value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Décrivez votre demande en détail…" className={`${input} resize-none`} />
                            </div>

                            <div className="grid grid-cols-3 gap-2.5">
                                <div>
                                    <label className={label}>Date événement</label>
                                    <input type="date" value={form.dateDebut} onChange={(e) => setForm({ ...form, dateDebut: e.target.value })} className={input} />
                                </div>
                                <div>
                                    <label className={label}>Heure début</label>
                                    <input type="time" value={form.heureDebut} onChange={(e) => setForm({ ...form, heureDebut: e.target.value })} className={input} />
                                </div>
                                <div>
                                    <label className={label}>Heure fin</label>
                                    <input type="time" value={form.heureFin} onChange={(e) => setForm({ ...form, heureFin: e.target.value })} className={input} />
                                </div>
                            </div>

                            <div>
                                <label className={label}>Justificatifs</label>
                                <input value={form.justificatif} onChange={(e) => setForm({ ...form, justificatif: e.target.value })}
                                    placeholder="Lien ou référence du document joint" className={input} />
                            </div>

                            <p className="text-[10.5px] text-slate-400 dark:text-slate-500">
                                Budget disponible du club : {budgetRestant.toLocaleString("fr-MA")} MAD
                            </p>

                            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-600 dark:bg-rose-900/20 dark:text-rose-300">{error}</p>}

                            <div className="flex justify-end gap-2 pt-1">
                                <button type="button" onClick={onClose}
                                    className="rounded-lg border border-slate-200 px-4 py-1.5 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                                    Annuler
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-primary-500/25 transition hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50">
                                    <Plus size={14} /> {submitting ? "Envoi…" : "Soumettre"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}