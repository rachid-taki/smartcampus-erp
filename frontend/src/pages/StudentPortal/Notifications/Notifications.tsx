import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    AlertTriangle,
    Bell,
    CalendarDays,
    CheckCheck,
    CheckCircle2,
    ChevronRight,
    FileText,
    FolderOpen,
    Settings,
    Siren,
    Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
} from "../../../services/student.service";
import { formatRelative } from "../../../utils/format";
import { SiGoogleclassroom } from "react-icons/si";

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    category: string;
    createdAt: string;
    read: boolean;
}

type ReadFilter = "all" | "unread" | "read";

const CATEGORY_CONFIG: Record<string, { icon: LucideIcon; label: string; tone: string }> = {
    demande:    { icon: FileText,      label: "Demande",    tone: "blue" },
    document:   { icon: FolderOpen,    label: "Document",   tone: "emerald" },
    calendrier: { icon: CalendarDays,  label: "Calendrier", tone: "amber" },
    systeme:    { icon: Settings,      label: "Système",    tone: "slate" },
    succes:     { icon: CheckCircle2,  label: "Succès",     tone: "emerald" },
    alerte:     { icon: AlertTriangle, label: "Alerte",     tone: "amber" },
    urgent:     { icon: Siren,         label: "Urgent",     tone: "rose" },
    info:       { icon: Bell,          label: "Info",       tone: "slate" },
};

const TONE_DOT: Record<string, string> = {
    blue:    "bg-blue-500",
    emerald: "bg-emerald-500",
    amber:   "bg-amber-500",
    slate:   "bg-slate-400",
    rose:    "bg-rose-500",
};

const TONE_TEXT: Record<string, string> = {
    blue:    "text-blue-700 dark:text-blue-300",
    emerald: "text-emerald-700 dark:text-emerald-300",
    amber:   "text-amber-700 dark:text-amber-300",
    slate:   "text-slate-600 dark:text-slate-300",
    rose:    "text-rose-700 dark:text-rose-300",
};

const READ_FILTERS: { label: string; value: ReadFilter }[] = [
    { label: "Toutes", value: "all" },
    { label: "Non lues", value: "unread" },
    { label: "Lues", value: "read" },
];

export default function Notifications() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [readFilter, setReadFilter] = useState<ReadFilter>("all");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [markingAll, setMarkingAll] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getNotifications();
                setNotifications(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const unreadCount = notifications.filter((n) => !n.read).length;
    const readCount = notifications.length - unreadCount;
    const readPct = notifications.length
        ? Math.round((readCount / notifications.length) * 100)
        : 0;

    const presentCategories = useMemo(
        () => Array.from(new Set(notifications.map((n) => n.category))),
        [notifications]
    );

    const filtered = useMemo(
        () =>
            notifications.filter((n) => {
                if (readFilter === "unread" && n.read) return false;
                if (readFilter === "read" && !n.read) return false;
                if (categoryFilter !== "all" && n.category !== categoryFilter) return false;
                return true;
            }),
        [notifications, readFilter, categoryFilter]
    );

    const selected = filtered.find((n) => n.id === selectedId) ?? null;

    useEffect(() => {
        if (selectedId && !filtered.some((n) => n.id === selectedId)) {
            setSelectedId(filtered[0]?.id ?? null);
        }
    }, [filtered, selectedId]);

    const handleSelect = async (item: NotificationItem) => {
        setSelectedId(item.id);
        if (!item.read) {
            setNotifications((prev) =>
                prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
            );
            try {
                await markNotificationRead(item.id);
            } catch (err) {
                console.error(err);
                setNotifications((prev) =>
                    prev.map((n) => (n.id === item.id ? { ...n, read: false } : n))
                );
            }
        }
    };

    const handleMarkAll = async () => {
        try {
            setMarkingAll(true);
            await markAllNotificationsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        } catch (err) {
            console.error(err);
        } finally {
            setMarkingAll(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-9 w-56 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
                <div className="card h-32 animate-pulse" />
                <div className="card h-96 animate-pulse" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-5">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <span  />
                        <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white">
                            Notifications
                        </h1>
                    </div>
                    <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400">
                        Centre de contrôle de vos alertes et mises à jour administratives.
                    </p>
                </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
       <a
            href="https://classroom.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-yellow-400 hover:bg-[#0F9D58]/5 hover:shadow-md active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-yellow-400 dark:hover:hover:bg-[#0F9D58]/5"
        >
            <SiGoogleclassroom size={18} color="#0F9D58" />
            Annonces universitaires
        </a>

        <button
            type="button"
            onClick={handleMarkAll}
            disabled={markingAll || unreadCount === 0}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
            <CheckCheck size={16} />
            {markingAll ? "Mise à jour..." : "Tout marquer comme lu"}
        </button>
    </div>
            </div>

            {/* KPI Strip — design dashboard pro */}
            <div className="card grid grid-cols-1 overflow-hidden sm:grid-cols-3">
                <KpiBlock
                    label="Total"
                    value={notifications.length}
                    hint="notifications reçues"
                    right={
                        <div className="flex items-end gap-px h-10">
                            {[2, 4, 3, 6, 5, 4, 7, 6, 5, 8, 6, 7].map((h, i) => (
                                <span
                                    key={i}
                                    className="w-1 rounded-sm bg-slate-200 dark:bg-slate-700"
                                    style={{ height: `${h * 12}%` }}
                                />
                            ))}
                        </div>
                    }
                />
                <KpiBlock
                    label="Non lues"
                    value={unreadCount}
                    hint="à consulter"
                    accent={unreadCount > 0}
                    right={
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                <div
                                    className="h-full rounded-full bg-amber-500"
                                    style={{
                                        width: `${notifications.length ? (unreadCount / notifications.length) * 100 : 0}%`,
                                    }}
                                />
                            </div>
                            <span className="text-[11px] font-medium tabular-nums text-slate-500 dark:text-slate-400">
                                {notifications.length ? Math.round((unreadCount / notifications.length) * 100) : 0}%
                            </span>
                        </div>
                    }
                />
                <KpiBlock
                    label="Lues"
                    value={readCount}
                    hint={`${readPct}% du total`}
                    right={
                        <div className="relative h-10 w-10">
                            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                                <circle
                                    cx="18" cy="18" r="14"
                                    fill="none"
                                    strokeWidth="3"
                                    className="text-slate-200 dark:text-slate-700"
                                    stroke="currentColor"
                                />
                                <circle
                                    cx="18" cy="18" r="14"
                                    fill="none"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    className="text-emerald-500"
                                    stroke="currentColor"
                                    strokeDasharray={87.96}
                                    strokeDashoffset={87.96 - (readPct / 100) * 87.96}
                                />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                                {readPct}
                            </span>
                        </div>
                    }
                />
            </div>

            {/* Filters bar */}
            <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-1">
                    <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        État
                    </span>
                    {READ_FILTERS.map((f) => (
                        <button
                            key={f.value}
                            onClick={() => setReadFilter(f.value)}
                            className={`rounded-md px-2.5 py-1.5 text-[12px] font-medium transition ${
                                readFilter === f.value
                                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                            }`}
                        >
                            {f.label}
                            {f.value === "unread" && unreadCount > 0 && (
                                <span className={`ml-1.5 rounded-full px-1.5 text-[10px] font-bold ${
                                    readFilter === f.value
                                        ? "bg-white/20 text-white dark:bg-slate-900/20"
                                        : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                                }`}>
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0 dark:border-slate-800">
                    <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Catégorie
                    </span>
                    <button
                        onClick={() => setCategoryFilter("all")}
                        className={`rounded-md px-2.5 py-1.5 text-[12px] font-medium transition ${
                            categoryFilter === "all"
                                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        }`}
                    >
                        Toutes
                    </button>
                    {presentCategories.map((cat) => {
                        const config = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.info;
                        const CatIcon = config.icon;
                        const count = notifications.filter((n) => n.category === cat).length;
                        return (
                            <button
                                key={cat}
                                onClick={() =>
                                    setCategoryFilter(cat === categoryFilter ? "all" : cat)
                                }
                                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition ${
                                    categoryFilter === cat
                                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                                }`}
                            >
                                <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[config.tone]}`} />
                                {config.label}
                                <span className={`text-[10px] tabular-nums ${
                                    categoryFilter === cat ? "opacity-70" : "text-slate-400 dark:text-slate-500"
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Split view: list + preview */}
            {filtered.length === 0 ? (
                <div className="card flex flex-col items-center justify-center gap-3 p-20 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                        <Bell size={20} className="text-slate-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                        Aucune notification
                    </h3>
                    <p className="max-w-sm text-[13px] text-slate-500 dark:text-slate-400">
                        {notifications.length === 0
                            ? "Vous êtes à jour. Les nouvelles notifications apparaîtront ici."
                            : "Aucune notification ne correspond à vos filtres."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white lg:grid-cols-[minmax(0,1fr)_420px] dark:border-slate-800 dark:bg-slate-900">
                    {/* LEFT: compact list */}
                    <div className="max-h-[640px] overflow-y-auto border-slate-200 lg:border-r dark:border-slate-800">
                        {filtered.map((item, index) => {
                            const config = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.info;
                            const ItemIcon = config.icon;
                            const isSelected = selectedId === item.id;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleSelect(item)}
                                    className={`group relative flex w-full items-start gap-3 border-b border-slate-100 px-5 py-4 text-left transition-colors last:border-b-0 dark:border-slate-800 ${
                                        isSelected
                                            ? "bg-slate-50 dark:bg-slate-800/60"
                                            : "hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                                    }`}
                                >
                                    {/* Unread indicator bar */}
                                    {!item.read && (
                                        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-slate-900 dark:bg-white" />
                                    )}

                                    {/* Category icon tile */}
                                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 ${
                                        !item.read ? TONE_TEXT[config.tone] : "text-slate-400"
                                    }`}>
                                        <ItemIcon size={15} strokeWidth={1.8} />
                                    </div>

                                    {/* Content */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <h3
                                                    className={`truncate text-[13px] ${
                                                        item.read
                                                            ? "font-medium text-slate-600 dark:text-slate-300"
                                                            : "font-semibold text-slate-900 dark:text-white"
                                                    }`}
                                                >
                                                    {item.title}
                                                </h3>
                                                {!item.read && (
                                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-900 dark:bg-white" />
                                                )}
                                            </div>
                                            <span className="shrink-0 text-[11px] font-medium tabular-nums text-slate-400 dark:text-slate-500">
                                                {formatRelative(item.createdAt)}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 line-clamp-1 text-[12.5px] text-slate-500 dark:text-slate-400">
                                            {item.message}
                                        </p>
                                        <div className="mt-2 flex items-center gap-2">
                                            <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${TONE_TEXT[config.tone]} bg-slate-100 dark:bg-slate-800`}>
                                                <span className={`h-1 w-1 rounded-full ${TONE_DOT[config.tone]}`} />
                                                {config.label}
                                            </span>
                                            {!item.read && (
                                                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                                    Nouveau
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <ChevronRight
                                        size={14}
                                        className={`mt-2 shrink-0 transition-opacity ${
                                            isSelected
                                                ? "opacity-100 text-slate-700 dark:text-slate-200"
                                                : "opacity-0 group-hover:opacity-60 text-slate-400"
                                        }`}
                                    />
                                </button>
                            );
                        })}
                    </div>

                    {/* RIGHT: preview pane */}
                    <AnimatePresence mode="wait">
                        {selected ? (
                            <motion.div
                                key={selected.id}
                                initial={{ opacity: 0, x: 8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -8 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col border-t border-slate-200 p-6 lg:border-t-0 dark:border-slate-800"
                            >
                                <PreviewPane item={selected} />
                            </motion.div>
                        ) : (
                            <div className="hidden items-center justify-center p-12 text-center lg:flex">
                                <div>
                                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                                        <Bell size={20} className="text-slate-400" />
                                    </div>
                                    <p className="text-[13px] text-slate-500 dark:text-slate-400">
                                        Sélectionnez une notification pour la lire
                                    </p>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Footer count */}
            <div className="flex items-center justify-between px-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                <span className="tabular-nums">
                    {filtered.length} sur {notifications.length} notifications
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-900 dark:bg-white" />
                    Non lu
                    <span className="ml-2 h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                    Lu
                </span>
            </div>
        </div>
    );
}

/* ---------- Sub-components ---------- */

function KpiBlock({
    label,
    value,
    hint,
    accent = false,
    right,
}: {
    label: string;
    value: number;
    hint: string;
    accent?: boolean;
    right?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 dark:border-slate-800">
            <div className="min-w-0">
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {label}
                </p>
                <p className={`mt-1 text-[28px] font-semibold leading-none tracking-tight tabular-nums ${
                    accent ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"
                }`}>
                    {value}
                </p>
                <p className="mt-1 text-[11.5px] text-slate-500 dark:text-slate-400">
                    {hint}
                </p>
            </div>
            <div className="shrink-0">{right}</div>
        </div>
    );
}

function PreviewPane({ item }: { item: NotificationItem }) {
    const config = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.info;
    const ItemIcon = config.icon;

    const fullDate = new Date(item.createdAt).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <>
            {/* Top metadata bar */}
            <div className="flex items-start gap-3 border-b border-slate-100 pb-5 dark:border-slate-800">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white ${TONE_TEXT[config.tone]} dark:border-slate-700 dark:bg-slate-900`}>
                    <ItemIcon size={18} strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${TONE_TEXT[config.tone]} bg-slate-100 dark:bg-slate-800`}>
                            <span className={`h-1 w-1 rounded-full ${TONE_DOT[config.tone]}`} />
                            {config.label}
                        </span>
                        {item.read ? (
                            <span className="text-[10.5px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                Lu
                            </span>
                        ) : (
                            <span className="text-[10.5px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                                Non lu
                            </span>
                        )}
                    </div>
                    <h2 className="mt-2 text-[16px] font-semibold leading-tight tracking-tight text-slate-900 dark:text-white">
                        {item.title}
                    </h2>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto py-5">
                <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">
                    {item.message}
                </p>
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-[11.5px] dark:border-slate-800">
                <div>
                    <p className="font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Reçue
                    </p>
                    <p className="mt-0.5 font-medium text-slate-700 dark:text-slate-200">
                        {fullDate}
                    </p>
                </div>
                <div>
                    <p className="font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Référence
                    </p>
                    <p className="mt-0.5 font-mono text-slate-700 dark:text-slate-200">
                        #{item.id.slice(0, 8)}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                {!item.read ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1.5 text-[11.5px] font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                        <CheckCircle2 size={12} />
                        Marqué comme lu
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-[11.5px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <CheckCircle2 size={12} />
                        Consultée
                    </span>
                )}
                <div className="ml-auto flex items-center gap-1">
                    <button className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                        <Trash2 size={12} />
                        Supprimer
                    </button>
                </div>
            </div>
        </>
    );
}