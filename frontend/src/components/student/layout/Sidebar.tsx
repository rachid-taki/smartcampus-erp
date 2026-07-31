import { NavLink } from 'react-router-dom';
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
      {/* Desktop sidebar */}
      <motion.aside
    animate={{
      width: collapsed ? 80 : 264,
    }}
    transition={{ duration: 0.3 }}
    className="hidden lg:flex shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-card-dark h-screen"
  >
    <SidebarContent
      collapsed={collapsed}
      onNavigate={() => undefined}
      onToggleCollapse={onToggleCollapse}
    />
  </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
            />
            <motion.aside
              key="drawer"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
              className="fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col bg-white shadow-xl dark:bg-card-dark lg:hidden"
            >
              <button
                onClick={onCloseMobile}
                aria-label="Fermer le menu"
                className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
              <SidebarContent 
              collapsed={collapsed} 
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
}) {  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div
  className={`flex items-center py-6 ${
    collapsed
      ? "justify-center px-0"
      : "gap-2.5 px-6"
  }`}
>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
          <GraduationCap size={20} strokeWidth={2} />
        </div>
        
       {!collapsed && (
<div className="leading-tight">
          <p className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">
            SmartCampus
          </p>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            ERP · Portail Étudiant
          </p>
        </div>)}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
  [
    `group relative flex items-center rounded-xl py-2.5 transition-colors duration-150 ${
      collapsed
        ? 'justify-center px-0'
        : 'gap-3 px-3'
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
                  <motion.span
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 rounded-xl bg-primary-50 dark:bg-primary-500/10"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <span className={`relative z-10 flex items-center ${
                  collapsed ? "justify-center w-full" : "gap-3"
                }`}>
                  <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-slate-100 px-3 py-4 dark:border-slate-800">
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400">
          <LogOut size={18} strokeWidth={1.8} />
          {!collapsed && "Déconnexion"}
        </button>
        <button
  onClick={onToggleCollapse}
  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-blue-400"
>
  {collapsed ? (
    <>
      <PanelLeftOpen size={18} />
      {!collapsed && "Agrandir"}
    </>
  ) : (
    <>
      <PanelLeftClose size={18} />
      Réduire
    </>
  )}
</button>
      </div>
    </div>
  );
}
