import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Crown,
    LogOut,
    ChevronDown,
    Shield,
    Moon,
    Sun,
    Menu,
} from "lucide-react";

interface SuperAdminTopbarProps {
    onToggleMobileSidebar?: () => void;
}

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
    "/admin/dashboard": {
        title: "Tableau de bord",
        subtitle: "Vue d'ensemble de la plateforme",
    },
    "/admin/users": {
        title: "Utilisateurs",
        subtitle: "Gestion des comptes",
    },
    "/admin/roles": {
        title: "Rôles",
        subtitle: "Définition des rôles et accès",
    },
    "/admin/permissions": {
        title: "Permissions",
        subtitle: "Matrice des autorisations",
    },
    "/admin/audit": {
        title: "Journal d'audit",
        subtitle: "Historique des actions",
    },
};

export default function SuperAdminTopbar({ onToggleMobileSidebar }: SuperAdminTopbarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState<any>(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setDarkMode(document.documentElement.classList.contains("dark"));

        const observer = new MutationObserver(() => {
            setDarkMode(document.documentElement.classList.contains("dark"));
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const userStr = localStorage.getItem("user");
        if (userStr) {
            try {
                setUser(JSON.parse(userStr));
            } catch {
                setUser(null);
            }
        }
    }, []);

    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        sessionStorage.clear();
        navigate("/", { replace: true });
    };

    const toggleDarkMode = () => {
        const newValue = !darkMode;
        document.documentElement.classList.toggle("dark", newValue);
        localStorage.setItem("theme", newValue ? "dark" : "light");
        setDarkMode(newValue);
    };

    const pageInfo = PAGE_TITLES[location.pathname] || {
        title: "Super Admin",
        subtitle: "Administration",
    };

    const getInitials = () => {
        if (!user) return "SA";
        const first = user.prenom?.[0] || "";
        const last = user.nom?.[0] || "";
        return (first + last).toUpperCase() || "SA";
    };

    return (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onToggleMobileSidebar}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
                        aria-label="Ouvrir le menu"
                    >
                        <Menu size={18} />
                    </button>

                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">
                                {pageInfo.title}
                            </h2>
                            <span className="hidden items-center gap-1 rounded-full bg-gradient-to-r from-rose-500 to-red-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white sm:inline-flex">
                                <Crown size={9} />
                                Super Admin
                            </span>
                        </div>
                        <p className="hidden text-[11px] text-slate-500 sm:block dark:text-slate-400">
                            {pageInfo.subtitle}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={toggleDarkMode}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        title={darkMode ? "Mode clair" : "Mode sombre"}
                    >
                        {darkMode ? <Sun size={17} /> : <Moon size={17} />}
                    </button>

                    <div className="hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-700" />

                    <div className="relative" ref={menuRef}>
                        <button
                            type="button"
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            <div className="relative">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-[12px] font-bold text-white shadow-md shadow-rose-500/30">
                                    {getInitials()}
                                </div>
                                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900">
                                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                                </span>
                            </div>
                            <div className="hidden text-left md:block">
                                <p className="text-[12.5px] font-bold text-slate-800 dark:text-white">
                                    {user?.prenom} {user?.nom}
                                </p>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                                    {user?.role || "SUPER_ADMIN"}
                                </p>
                            </div>
                            <ChevronDown
                                size={14}
                                className={`hidden text-slate-400 transition-transform md:block ${
                                    showUserMenu ? "rotate-180" : ""
                                }`}
                            />
                        </button>

                        <AnimatePresence>
                            {showUserMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
                                >
                                    <div className="border-b border-slate-100 bg-gradient-to-br from-rose-50 to-red-50 px-4 py-3 dark:border-slate-800 dark:from-rose-900/20 dark:to-red-900/20">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-[13px] font-bold text-white shadow-md shadow-rose-500/30">
                                                {getInitials()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-[13px] font-bold text-slate-900 dark:text-white">
                                                    {user?.prenom} {user?.nom}
                                                </p>
                                                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                                    {user?.email}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                                            <Shield size={9} />
                                            Accès total
                                        </div>
                                    </div>

                                    <div className="p-1.5">
                                        <button
                                            type="button"
                                            onClick={toggleDarkMode}
                                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                                        >
                                            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
                                            {darkMode ? "Mode clair" : "Mode sombre"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                                        >
                                            <LogOut size={15} />
                                            Se déconnecter
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </header>
    );
}