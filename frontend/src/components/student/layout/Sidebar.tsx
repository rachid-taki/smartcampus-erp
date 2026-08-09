import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,Megaphone,
} from 'lucide-react';

import Icon from '../../student/common/Icon';
import { navItems } from '../../../utils/navigation';

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  isMobileOpen,
  onCloseMobile,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  return (
    <>
      <motion.aside
        animate={{
          width: collapsed ? 80 : 264,
        }}
        transition={{ duration: 0.3 }}
        className="hidden lg:flex shrink-0 flex-col border-r border-slate-200/70 bg-white dark:border-slate-800 dark:bg-card-dark h-screen"
      >
        <SidebarContent
          collapsed={collapsed}
          onNavigate={() => undefined}
          onToggleCollapse={onToggleCollapse}
        />
      </motion.aside>

      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              key="drawer"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
              className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-white shadow-2xl dark:bg-card-dark lg:hidden"
            >
              <button
                onClick={onCloseMobile}
                aria-label="Fermer le menu"
                className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X size={20} />
              </button>
              <SidebarContent
                collapsed={false}
                onNavigate={onCloseMobile}
                onToggleCollapse={onToggleCollapse}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function SidebarContent({
  onNavigate,
  collapsed,
  onToggleCollapse,
}: {
  onNavigate: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.clear();
    sessionStorage.clear();
    navigate("/", { replace: true });
  };

  return (
    <div className="flex h-full flex-col">
      <div className={`flex items-center py-7 ${
        collapsed ? "justify-center px-0" : "gap-3 px-6"
      }`}>
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-500/30 transition-transform hover:scale-105">
          <GraduationCap size={22} strokeWidth={2.2} />
          <span className="absolute inset-0 rounded-2xl ring-2 ring-white/20" />
        </div>

        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="text-[16px] font-bold tracking-tight text-slate-900 dark:text-white">
              SmartCampus
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Portail Étudiant
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                `group relative flex items-center rounded-xl py-3 transition-all duration-200 ${
                  collapsed ? 'justify-center px-0' : 'gap-3 px-4'
                }`,
                isActive
                  ? 'text-primary-700 dark:text-primary-300'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 z-10 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary-600 shadow-sm shadow-primary-500/40 dark:bg-primary-400" />
                )}

                {isActive && (
                  <motion.span
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-500/10 dark:to-primary-500/5"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}

                <span className={`relative z-10 flex items-center ${
                  collapsed ? "justify-center w-full" : "gap-3"
                }`}>
                  <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                    <Icon name={item.icon} className="h-[19px] w-[19px] shrink-0" />
                  </span>
                  {!collapsed && (
                    <span className={`text-[14px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                      {item.label}
                    </span>
                  )}
                </span>

                {isActive && !collapsed && (
                  <span className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-primary-600 shadow-[0_0_8px_rgba(37,99,235,0.6)] dark:bg-primary-400" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200/70 px-3 py-4 dark:border-slate-800">
        <div className="space-y-1.5">
          <button
            onClick={logout}
            className={`flex w-full items-center rounded-xl px-4 py-3 text-[13.5px] font-medium text-slate-500 transition-all duration-200 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400 ${
              collapsed ? 'justify-center px-0' : 'gap-3'
            }`}
          >
            <LogOut size={18} strokeWidth={1.8} className="shrink-0" />
            {!collapsed && "Déconnexion"}
          </button>

          <button
            onClick={onToggleCollapse}
            className={`hidden lg:flex w-full items-center rounded-xl px-4 py-3 text-[13.5px] font-medium text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 ${
              collapsed ? 'justify-center px-0' : 'gap-3'
            }`}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} strokeWidth={1.8} className="shrink-0" />
            ) : (
              <>
                <PanelLeftClose size={18} strokeWidth={1.8} className="shrink-0" />
                <span>Réduire le menu</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}