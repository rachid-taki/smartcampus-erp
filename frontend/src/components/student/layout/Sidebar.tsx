import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';

import Icon from '../../student/common/Icon';
import { navItems } from '../../../utils/navigation';
import { Building2 } from 'lucide-react';
import { useState,useEffect } from 'react';


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
          width: collapsed ? 72 : 240,
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
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
              className="fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-white shadow-2xl dark:bg-card-dark lg:hidden"
            >
              <button
                onClick={onCloseMobile}
                aria-label="Fermer le menu"
                className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X size={18} />
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
  
const [isPresidentDeClub, setIsPresidentDeClub] = useState(false);

useEffect(() => {
  const checkPresident = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('http://localhost:3000/api/student/presidence', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('🔍 Présidence check status:', res.status);

      if (res.ok) {
        const data = await res.json();
        console.log('🏛️ Président trouvé:', data.club?.nom);
        setIsPresidentDeClub(true);
        localStorage.setItem('isPresidentClub', 'true');
      } else {
        console.log('❌ Pas président');
        setIsPresidentDeClub(false);
      }
    } catch (error) {
      console.error('Erreur check:', error);
      setIsPresidentDeClub(false);
    }
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  console.log('👤 Rôle utilisateur:', user.role);
  if (user.role === 'ETUDIANT') {
    checkPresident();
  }
}, []);

  return (
    <div className="flex h-full flex-col">
      <div
        className={`flex items-center border-b border-slate-200/70 dark:border-slate-800 ${
          collapsed ? "justify-center px-0 py-4" : "gap-2.5 px-5 py-5"
        }`}
      >
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-500/30 transition-transform hover:scale-105">
          <GraduationCap size={18} strokeWidth={2.2} />
          <span className="absolute inset-0 rounded-xl ring-2 ring-white/20" />
        </div>

        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="text-[14px] font-bold tracking-tight text-slate-900 dark:text-white">
              SmartCampus
            </p>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Portail Étudiant
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                `group relative flex items-center rounded-lg py-2 transition-all duration-200 ${
                  collapsed ? 'justify-center px-0' : 'gap-2.5 px-3'
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
                  <span className="absolute left-0 top-1/2 z-10 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary-600 shadow-sm shadow-primary-500/40 dark:bg-primary-400" />
                )}

                {isActive && (
                  <motion.span
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-500/10 dark:to-primary-500/5"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}

                <span className={`relative z-10 flex items-center ${
                  collapsed ? "justify-center w-full" : "gap-2.5"
                }`}>
                  <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                    <Icon name={item.icon} className="h-[17px] w-[17px] shrink-0" />
                  </span>
                  {!collapsed && (
                    <span className={`text-[13px] font-medium ${isActive ? 'font-semibold' : ''}`}>
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
       {isPresidentDeClub && (
  <NavLink
    to="/student/presidence"
    onClick={onNavigate}
    className={({ isActive }) =>
      `group relative flex items-center rounded-lg py-2 transition-all duration-200 ${
        collapsed ? 'justify-center px-0' : 'gap-2.5 px-3'
      } ${
        isActive
          ? 'text-emerald-700 dark:text-emerald-300'
          : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-400 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300'
      }`
    }
  >
    {({ isActive }) => (
      <>
        {isActive && (
          <span className="absolute left-0 top-1/2 z-10 h-5 w-1 -translate-y-1/2 rounded-r-full bg-emerald-600 dark:bg-emerald-400" />
        )}
        {isActive && (
          <motion.span
            layoutId="sidebar-active-pill"
            className="absolute inset-0 rounded-lg bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-500/10 dark:to-emerald-500/5"
            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
          />
        )}
        <span className={`relative z-10 flex items-center ${collapsed ? 'justify-center w-full' : 'gap-2.5'}`}>
          <Building2 className={`h-[17px] w-[17px] shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
          {!collapsed && (
            <span className={`text-[13px] font-medium ${isActive ? 'font-semibold' : ''}`}>
              Présidence Club
            </span>
          )}
        </span>
      </>
    )}
  </NavLink>
)}
      </nav>

      <div className="border-t border-slate-200/70 px-2.5 py-3 dark:border-slate-800">
        <div className="space-y-1">
          <button
            onClick={logout}
            className={`flex w-full items-center rounded-lg px-3 py-2 text-[12px] font-medium text-slate-500 transition-all duration-200 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400 ${
              collapsed ? 'justify-center px-0' : 'gap-2.5'
            }`}
          >
            <LogOut size={16} strokeWidth={1.8} className="shrink-0" />
            {!collapsed && "Déconnexion"}
          </button>

          <button
            onClick={onToggleCollapse}
            className={`hidden lg:flex w-full items-center rounded-lg px-3 py-2 text-[12px] font-medium text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 ${
              collapsed ? 'justify-center px-0' : 'gap-2.5'
            }`}
          >
            {collapsed ? (
              <PanelLeftOpen size={16} strokeWidth={1.8} className="shrink-0" />
            ) : (
              <>
                <PanelLeftClose size={16} strokeWidth={1.8} className="shrink-0" />
                <span>Réduire</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}



