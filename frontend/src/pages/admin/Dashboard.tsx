import { useEffect, useState, useMemo } from "react";
import {
    Users, Shield, UserCheck, FileText, MessageSquare, TrendingUp, TrendingDown,
    Activity, ArrowUpRight, ArrowDownRight, Minus, Calendar, Clock, AlertCircle,
    Zap, CheckCircle2, XCircle, RefreshCw,
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getSuperAdminStats, getRecentActivity } from "../../services/superadmin.service";

const REQUEST_STATUS_COLORS: Record<string, string> = {
    Soumise: "#3b82f6", En_Traitement: "#f59e0b", Validee: "#10b981", Rejetee: "#ef4444", En_Attente: "#8b5cf6",
};

const ACTION_COLORS: Record<string, string> = {
    CREATE: "#10b981", LOGIN: "#3b82f6", LOGOUT: "#64748b", UPDATE: "#f59e0b",
    DELETE: "#ef4444", VALIDATE: "#10b981", REJECT: "#ef4444",
};

const HEATMAP_COLORS = ["#f1f5f9", "#e0f2fe", "#bae6fd", "#7dd3fc", "#38bdf8", "#0284c7", "#075985"];
const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const formatNumber = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

const formatRelative = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `il y a ${hours}h`;
    return `il y a ${Math.floor(hours / 24)}j`;
};

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [activity, setActivity] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true); else setLoading(true);
        try {
            const [statsData, activityData] = await Promise.all([getSuperAdminStats(), getRecentActivity()]);
            setStats(statsData);
            setActivity(activityData);
        } catch (err) { console.error(err); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { loadData(); }, []);

    const heatmapData = useMemo(() => {
        const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
        let max = 0;
        (stats?.activityHeatmap || []).forEach((cell: any) => {
            grid[cell.day][cell.hour] = cell.count;
            if (cell.count > max) max = cell.count;
        });
        return { grid, max };
    }, [stats]);

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-120px)] items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <RefreshCw size={20} className="animate-spin text-slate-400" />
                    <p className="text-[12px] text-slate-500">Chargement des données...</p>
                </div>
            </div>
        );
    }

    const kpis = stats?.kpis || {};
    const kpiCards = [
        { label: "Total utilisateurs", value: kpis.totalUsers || 0, delta: kpis.userGrowth || 0, icon: Users, color: "blue" },
        { label: "Utilisateurs actifs", value: kpis.activeUsers || 0, delta: null, sublabel: `${kpis.totalUsers > 0 ? Math.round((kpis.activeUsers / kpis.totalUsers) * 100) : 0}% du total`, icon: UserCheck, color: "emerald" },
        { label: "Demandes", value: kpis.totalRequests || 0, delta: null, icon: FileText, color: "violet" },
        { label: "Réclamations", value: kpis.totalReclamations || 0, delta: null, icon: MessageSquare, color: "rose" },
    ];

    const colorStyles: Record<string, { bg: string; text: string; ring: string; gradient: string }> = {
        blue:    { bg: "bg-blue-50 dark:bg-blue-950/30",       text: "text-blue-700 dark:text-blue-400",     ring: "ring-blue-200 dark:ring-blue-900",     gradient: "from-blue-500 to-indigo-600" },
        emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", ring: "ring-emerald-200 dark:ring-emerald-900", gradient: "from-emerald-500 to-teal-600" },
        violet:  { bg: "bg-violet-50 dark:bg-violet-950/30",   text: "text-violet-700 dark:text-violet-400",   ring: "ring-violet-200 dark:ring-violet-900",   gradient: "from-violet-500 to-purple-600" },
        rose:    { bg: "bg-rose-50 dark:bg-rose-950/30",       text: "text-rose-700 dark:text-rose-400",       ring: "ring-rose-200 dark:ring-rose-900",       gradient: "from-rose-500 to-red-600" },
    };

    return (
        <div className="flex flex-col gap-3">
            <header className="flex shrink-0 items-end justify-between gap-2">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        <Activity size={14} className="text-slate-700 dark:text-slate-300" />
                    </div>
                    <div>
                        <h1 className="text-[16px] font-semibold tracking-tight text-slate-900 dark:text-white">Tableau de bord</h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Vue d'ensemble de l'activité de la plateforme</p>
                    </div>
                </div>
                <button onClick={() => loadData(true)} disabled={refreshing} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                    <RefreshCw size={10} className={refreshing ? "animate-spin" : ""} />
                    Actualiser
                </button>
            </header>

            <div className="grid shrink-0 grid-cols-2 gap-2.5 lg:grid-cols-4">
                {kpiCards.map((kpi) => {
                    const Icon = kpi.icon;
                    const style = colorStyles[kpi.color];
                    return (
                        <div key={kpi.label} className="flex items-start justify-between rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                            <div className="min-w-0 flex-1">
                                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{kpi.label}</p>
                                <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{formatNumber(kpi.value)}</p>
                                {kpi.delta !== null && kpi.delta !== undefined ? (
                                    <div className={`mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-semibold ${kpi.delta > 0 ? "text-emerald-600 dark:text-emerald-400" : kpi.delta < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-500"}`}>
                                        {kpi.delta > 0 ? <ArrowUpRight size={10} /> : kpi.delta < 0 ? <ArrowDownRight size={10} /> : <Minus size={10} />}
                                        {kpi.delta > 0 ? "+" : ""}{kpi.delta}%
                                        <span className="font-normal text-slate-400">ce mois</span>
                                    </div>
                                ) : kpi.sublabel ? (
                                    <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{kpi.sublabel}</p>
                                ) : null}
                            </div>
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${style.gradient} text-white shadow-sm`}>
                                <Icon size={14} />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid shrink-0 grid-cols-1 gap-2.5 lg:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
                    <div className="mb-3 flex items-center justify-between">
                        <div>
                            <h3 className="text-[12px] font-semibold text-slate-900 dark:text-white">Inscriptions mensuelles</h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">12 derniers mois</p>
                        </div>
                        <div className="flex h-6 items-center gap-1 rounded-md border border-slate-200 px-1.5 text-[10px] font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                            <Calendar size={9} />
                            12 mois
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={stats?.monthlyRegistrations || []}>
                            <defs>
                                <linearGradient id="colorRegistrations" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} width={28} />
                            <Tooltip contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.95)", border: "none", borderRadius: "6px", fontSize: "11px", color: "white" }} labelStyle={{ color: "#94a3b8", fontSize: "9px" }} formatter={(value: any) => [`${value} utilisateurs`, "Inscriptions"]} />
                            <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#colorRegistrations)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-3">
                        <h3 className="text-[12px] font-semibold text-slate-900 dark:text-white">Répartition par rôle</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{kpis.totalRoles || 0} rôles configurés</p>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={stats?.rolesDistribution || []} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                            <YAxis dataKey="nom_role" type="category" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} width={75} />
                            <Tooltip contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.95)", border: "none", borderRadius: "6px", fontSize: "11px", color: "white" }} formatter={(value: any) => [`${value} utilisateurs`]} />
                            <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid shrink-0 grid-cols-1 gap-2.5 lg:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-3">
                        <h3 className="text-[12px] font-semibold text-slate-900 dark:text-white">État des demandes</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{kpis.totalRequests || 0} demandes au total</p>
                    </div>
                    {stats?.requestsByStatus?.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={140}>
                                <PieChart>
                                    <Pie data={stats.requestsByStatus} dataKey="count" nameKey="statut" innerRadius={40} outerRadius={60} paddingAngle={2} stroke="none">
                                        {stats.requestsByStatus.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={REQUEST_STATUS_COLORS[entry.statut] || "#64748b"} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.95)", border: "none", borderRadius: "6px", fontSize: "11px", color: "white" }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="mt-2 space-y-1">
                                {stats.requestsByStatus.map((s: any) => (
                                    <div key={s.statut} className="flex items-center justify-between text-[10px]">
                                        <div className="flex items-center gap-1.5">
                                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: REQUEST_STATUS_COLORS[s.statut] || "#64748b" }} />
                                            <span className="text-slate-600 dark:text-slate-300">{s.statut}</span>
                                        </div>
                                        <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{s.count}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex h-[180px] items-center justify-center text-[11px] text-slate-400">Aucune demande</div>
                    )}
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
                    <div className="mb-3 flex items-center justify-between">
                        <div>
                            <h3 className="text-[12px] font-semibold text-slate-900 dark:text-white">Carte d'activité horaire</h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Actions audit · 30 derniers jours</p>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-slate-500 dark:text-slate-400">
                            <span>Peu</span>
                            <div className="flex gap-0.5">
                                {HEATMAP_COLORS.map((c, i) => <span key={i} className="h-2 w-2 rounded-sm" style={{ backgroundColor: c }} />)}
                            </div>
                            <span>Beaucoup</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <div className="min-w-[550px]">
                            <div className="mb-0.5 flex gap-0.5 pl-8">
                                {HOURS.filter((h) => h % 3 === 0).map((h) => (
                                    <div key={h} className="flex-1 text-center text-[8px] text-slate-400" style={{ minWidth: "20px" }}>
                                        {String(h).padStart(2, "0")}h
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-0.5">
                                {DAYS_FR.map((day, dayIdx) => (
                                    <div key={day} className="flex items-center gap-0.5">
                                        <span className="w-7 text-right text-[8px] font-medium text-slate-500 dark:text-slate-400">{day}</span>
                                        <div className="flex flex-1 gap-0.5">
                                            {HOURS.map((hour) => {
                                                const count = heatmapData.grid[dayIdx]?.[hour] || 0;
                                                const intensity = heatmapData.max > 0 ? Math.min(Math.ceil((count / heatmapData.max) * 6), 6) : 0;
                                                return (
                                                    <div key={hour} title={`${day} ${hour}h : ${count} action${count > 1 ? "s" : ""}`} className="h-3.5 flex-1 rounded-sm transition hover:scale-110" style={{ backgroundColor: count === 0 ? "#f1f5f9" : HEATMAP_COLORS[intensity], minWidth: "14px", opacity: count === 0 ? 0.3 : 1 }} />
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid min-h-0 shrink-0 grid-cols-1 gap-2.5 lg:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
                    <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-800">
                        <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-slate-400" />
                            <h3 className="text-[12px] font-semibold text-slate-900 dark:text-white">Activité récente</h3>
                        </div>
                        <span className="text-[9px] font-medium text-slate-400">{activity.length} événements</span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {activity.length === 0 ? (
                            <div className="flex h-28 items-center justify-center text-[11px] text-slate-400">Aucune activité récente</div>
                        ) : (
                            activity.slice(0, 8).map((log) => {
                                const color = ACTION_COLORS[log.action] || "#64748b";
                                return (
                                    <div key={log.id_log} className="flex items-start gap-2.5 px-3 py-2">
                                        <div className="relative mt-0.5">
                                            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                                            <div className="absolute left-0.5 top-2.5 h-3.5 w-px bg-slate-200 dark:bg-slate-800" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] text-slate-800 dark:text-slate-200">
                                                <span className="font-semibold">{log.prenom} {log.nom}</span>
                                                <span className="ml-1 text-slate-500 dark:text-slate-400">{log.action.toLowerCase()}</span>
                                                {log.entite && <span className="ml-1 text-slate-400">· {log.entite}</span>}
                                            </p>
                                            <div className="mt-0.5 flex items-center gap-1.5 text-[9px] text-slate-400">
                                                <span>{log.module}</span>
                                                <span>·</span>
                                                <span>{formatRelative(log.date_action)}</span>
                                            </div>
                                        </div>
                                        <span className="shrink-0 rounded px-1 py-0.5 font-mono text-[8px] font-bold uppercase" style={{ backgroundColor: `${color}20`, color: color }}>{log.action}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-800">
                        <div className="flex items-center gap-1.5">
                            <AlertCircle size={12} className="text-amber-500" />
                            <h3 className="text-[12px] font-semibold text-slate-900 dark:text-white">Alertes système</h3>
                        </div>
                        <span className="text-[9px] font-medium text-slate-400">24h</span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {stats?.systemAlerts?.length > 0 ? (
                            stats.systemAlerts.slice(0, 5).map((alert: any, i: number) => (
                                <div key={i} className="flex items-start gap-2 px-3 py-2">
                                    <Zap size={11} className="mt-0.5 shrink-0 text-amber-500" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[11px] font-medium text-slate-800 dark:text-slate-200">{alert.action}</p>
                                        <p className="mt-0.5 text-[9px] text-slate-500 dark:text-slate-400">{alert.module} · {alert.count} fois · {formatRelative(alert.date_action)}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-1.5 px-3 py-8 text-center">
                                <CheckCircle2 size={18} className="text-emerald-500" />
                                <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200">Tout fonctionne</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">Aucune alerte dans les 24h</p>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-200 p-3 dark:border-slate-800">
                        <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Activité 7 derniers jours</p>
                        <div className="flex items-end gap-0.5" style={{ height: "50px" }}>
                            {(stats?.auditLast7Days || []).length === 0 ? (
                                <div className="flex h-full w-full items-center justify-center text-[9px] text-slate-400">Pas de données</div>
                            ) : (
                                (() => {
                                    const maxCount = Math.max(...(stats.auditLast7Days.map((d: any) => d.count) || [1]));
                                    return stats.auditLast7Days.map((day: any, i: number) => {
                                        const h = Math.max((day.count / maxCount) * 100, 8);
                                        return (
                                            <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
                                                <div className="w-full rounded-t bg-gradient-to-t from-blue-600 to-blue-400" style={{ height: `${h}%` }} title={`${day.count} actions`} />
                                                <span className="text-[7px] tabular-nums text-slate-400">
                                                    {new Date(day.day).getDate()}/{new Date(day.day).getMonth() + 1}
                                                </span>
                                            </div>
                                        );
                                    });
                                })()
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}