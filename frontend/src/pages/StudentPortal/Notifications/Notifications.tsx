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
            <div className="space-y-4">
                <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
                <div className="card h-24 animate-pulse" />
                <div className="card h-80 animate-pulse" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <span />
                        <h1 className="text-[18px] font-semibold tracking-tight text-slate-900 dark:text-white">
                            Notifications
                        </h1>
                    </div>
                    <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                        Centre de contrôle de vos alertes et mises à jour administratives.
                    </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <a
                        href="https://classroom.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-[12px] font-semibold text-slate-700 shadow-sm transition hover:border-yellow-400 hover:bg-[#0F9D58]/5 hover:shadow-md active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-yellow-400"
                    >
                        <SiGoogleclassroom size={15} color="#0F9D58" />
                        Annonces universitaires
                    </a>

                    <button
                        type="button"
                        onClick={handleMarkAll}
                        disabled={markingAll || unreadCount === 0}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <CheckCheck size={14} />
                        {markingAll ? "Mise à jour..." : "Tout marquer comme lu"}
                    </button>
                </div>
            </div>

            <div className="card grid grid-cols-1 overflow-hidden sm:grid-cols-3">
                <KpiBlock
                    label="Total"
                    value={notifications.length}
                    hint="notifications reçues"
                    right={
                        <div className="flex h-8 items-end gap-px">
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
                        <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                <div
                                    className="h-full rounded-full bg-amber-500"
                                    style={{
                                        width: `${notifications.length ? (unreadCount / notifications.length) * 100 : 0}%`,
                                    }}
                                />
                            </div>
                            <span className="text-[10px] font-medium tabular-nums text-slate-500 dark:text-slate-400">
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
                        <div className="relative h-9 w-9">
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
                            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                                {readPct}
                            </span>
                        </div>
                    }
                />
            </div>

            <div className="card flex flex-col gap-2.5 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-1">
                    <span className="px-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        État
                    </span>
                    {READ_FILTERS.map((f) => (
                        <button
                            key={f.value}
                            onClick={() => setReadFilter(f.value)}
                            className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                                readFilter === f.value
                                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                            }`}
                        >
                            {f.label}
                            {f.value === "unread" && unreadCount > 0 && (
                                <span className={`ml-1 rounded-full px-1 text-[9px] font-bold ${
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

                <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 pt-2.5 sm:border-t-0 sm:pt-0 dark:border-slate-800">
                    <span className="px-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Catégorie
                    </span>
                    <button
                        onClick={() => setCategoryFilter("all")}
                        className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
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
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition ${
                                    categoryFilter === cat
                                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                                }`}
                            >
                                <span className={`h-1 w-1 rounded-full ${TONE_DOT[config.tone]}`} />
                                {config.label}
                                <span className={`text-[9px] tabular-nums ${
                                    categoryFilter === cat ? "opacity-70" : "text-slate-400 dark:text-slate-500"
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="card flex flex-col items-center justify-center gap-2 p-14 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                        <Bell size={18} className="text-slate-400" />
                    </div>
                    <h3 className="text-[13px] font-semibold text-slate-800 dark:text-white">
                        Aucune notification
                    </h3>
                    <p className="max-w-sm text-[12px] text-slate-500 dark:text-slate-400">
                        {notifications.length === 0
                            ? "Vous êtes à jour. Les nouvelles notifications apparaîtront ici."
                            : "Aucune notification ne correspond à vos filtres."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white lg:grid-cols-[minmax(0,1fr)_380px] dark:border-slate-800 dark:bg-slate-900">
                    <div className="max-h-[560px] overflow-y-auto border-slate-200 lg:border-r dark:border-slate-800">
                        {filtered.map((item, index) => {
                            const config = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.info;
                            const ItemIcon = config.icon;
                            const isSelected = selectedId === item.id;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleSelect(item)}
                                    className={`group relative flex w-full items-start gap-2.5 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 dark:border-slate-800 ${
                                        isSelected
                                            ? "bg-slate-50 dark:bg-slate-800/60"
                                            : "hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                                    }`}
                                >
                                    {!item.read && (
                                        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-slate-900 dark:bg-white" />
                                    )}

                                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 ${
                                        !item.read ? TONE_TEXT[config.tone] : "text-slate-400"
                                    }`}>
                                        <ItemIcon size={13} strokeWidth={1.8} />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <h3
                                                    className={`truncate text-[12px] ${
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
                                            <span className="shrink-0 text-[10px] font-medium tabular-nums text-slate-400 dark:text-slate-500">
                                                {formatRelative(item.createdAt)}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 line-clamp-1 text-[11.5px] text-slate-500 dark:text-slate-400">
                                            {item.message}
                                        </p>
                                        <div className="mt-1.5 flex items-center gap-1.5">
                                            <span className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium ${TONE_TEXT[config.tone]} bg-slate-100 dark:bg-slate-800`}>
                                                <span className={`h-0.5 w-0.5 rounded-full ${TONE_DOT[config.tone]}`} />
                                                {config.label}
                                            </span>
                                            {!item.read && (
                                                <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                                    Nouveau
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <ChevronRight
                                        size={13}
                                        className={`mt-1.5 shrink-0 transition-opacity ${
                                            isSelected
                                                ? "opacity-100 text-slate-700 dark:text-slate-200"
                                                : "opacity-0 group-hover:opacity-60 text-slate-400"
                                        }`}
                                    />
                                </button>
                            );
                        })}
                    </div>

                    <AnimatePresence mode="wait">
                        {selected ? (
                            <motion.div
                                key={selected.id}
                                initial={{ opacity: 0, x: 8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -8 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col border-t border-slate-200 p-5 lg:border-t-0 dark:border-slate-800"
                            >
                                <PreviewPane item={selected} />
                            </motion.div>
                        ) : (
                            <div className="hidden items-center justify-center p-10 text-center lg:flex">
                                <div>
                                    <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                                        <Bell size={18} className="text-slate-400" />
                                    </div>
                                    <p className="text-[12px] text-slate-500 dark:text-slate-400">
                                        Sélectionnez une notification pour la lire
                                    </p>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            <div className="flex items-center justify-between px-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                <span className="tabular-nums">
                    {filtered.length} sur {notifications.length} notifications
                </span>
                <span className="inline-flex items-center gap-1">
                    <span className="h-1 w-1 rounded-full bg-slate-900 dark:bg-white" />
                    Non lu
                    <span className="ml-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                    Lu
                </span>
            </div>
        </div>
    );
}

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
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 dark:border-slate-800">
            <div className="min-w-0">
                <p className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {label}
                </p>
                <p className={`mt-0.5 text-2xl font-semibold leading-none tracking-tight tabular-nums ${
                    accent ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"
                }`}>
                    {value}
                </p>
                <p className="mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400">
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
            <div className="flex items-start gap-2.5 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white ${TONE_TEXT[config.tone]} dark:border-slate-700 dark:bg-slate-900`}>
                    <ItemIcon size={16} strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide ${TONE_TEXT[config.tone]} bg-slate-100 dark:bg-slate-800`}>
                            <span className={`h-0.5 w-0.5 rounded-full ${TONE_DOT[config.tone]}`} />
                            {config.label}
                        </span>
                        {item.read ? (
                            <span className="text-[9.5px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                Lu
                            </span>
                        ) : (
                            <span className="text-[9.5px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                                Non lu
                            </span>
                        )}
                    </div>
                    <h2 className="mt-1.5 text-[14px] font-semibold leading-tight tracking-tight text-slate-900 dark:text-white">
                        {item.title}
                    </h2>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
                    {item.message}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-3 text-[10.5px] dark:border-slate-800">
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

            <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                {!item.read ? (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[10.5px] font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                        <CheckCircle2 size={11} />
                        Marqué comme lu
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[10.5px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <CheckCircle2 size={11} />
                        Consultée
                    </span>
                )}
                <div className="ml-auto flex items-center gap-1">
                    <button className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10.5px] font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                        <Trash2 size={11} />
                        Supprimer
                    </button>
                </div>
            </div>
        </>
    );
}