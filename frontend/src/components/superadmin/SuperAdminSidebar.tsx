import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Shield, KeyRound, Activity, LogOut, Crown } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

const links = [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/users", label: "Utilisateurs", icon: Users },
    { to: "/admin/roles", label: "Rôles", icon: Shield },
    { to: "/admin/permissions", label: "Permissions", icon: KeyRound },
    { to: "/admin/audit", label: "Audit Log", icon: Activity },
];

export default function SuperAdminSidebar() {
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <motion.aside
            animate={{ width: collapsed ? 72 : 240 }}
            transition={{ duration: 0.25 }}
            className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex"
        >
            <SidebarContent collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} onNavigate={() => {}} />
        </motion.aside>
    );
}

function SidebarContent({ collapsed, onToggleCollapse, onNavigate }: { collapsed: boolean; onToggleCollapse: () => void; onNavigate: () => void }) {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.clear();
        sessionStorage.clear();
        navigate("/login");
    };

    return (
        <div className="flex h-full flex-col">
            <div className={`flex items-center border-b border-slate-200 dark:border-slate-800 ${collapsed ? "justify-center px-0 py-4" : "gap-2.5 px-4 py-4"}`}>
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/30">
                    <Crown size={16} strokeWidth={2.2} />
                </div>
                {!collapsed && (
                    <div className="min-w-0 leading-tight">
                        <p className="truncate text-[13px] font-bold tracking-tight text-slate-900 dark:text-white">Super Admin</p>
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">SmartCampus ERP</p>
                    </div>
                )}
            </div>

            <nav className="flex-1 space-y-0.5 overflow-y-auto p-2.5">
                {links.map((link) => {
                    const Icon = link.icon;
                    return (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            onClick={onNavigate}
                            className={({ isActive }) =>
                                [`group relative flex items-center rounded-lg py-2 transition-all ${collapsed ? "justify-center px-0" : "gap-2.5 px-2.5"}`,
                                isActive ? "text-rose-700 dark:text-rose-300" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"].join(" ")
                            }
                            title={collapsed ? link.label : undefined}
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/10" />}
                                    {isActive && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-rose-500 to-red-600" />}
                                    <Icon size={16} className={`relative z-10 shrink-0 ${isActive ? "scale-110" : ""}`} />
                                    {!collapsed && <span className={`relative z-10 text-[12px] ${isActive ? "font-semibold" : "font-medium"}`}>{link.label}</span>}
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            <div className="border-t border-slate-200 p-2.5 dark:border-slate-800">
                <button
                    onClick={handleLogout}
                    className={`flex w-full items-center rounded-lg py-2 text-[12px] font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-900/20 ${collapsed ? "justify-center px-0" : "gap-2.5 px-2.5"}`}
                    title={collapsed ? "Déconnexion" : undefined}
                >
                    <LogOut size={16} />
                    {!collapsed && "Déconnexion"}
                </button>
            </div>
        </div>
    );
}