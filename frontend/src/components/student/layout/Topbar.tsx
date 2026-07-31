import { useState } from 'react';
import { Bell, Menu, Moon, Search, Sun } from 'lucide-react';
import { currentStudent, notifications } from '../../../data/dummyData';
import { initials } from '../../../utils/format';

interface TopbarProps {
  isDark: boolean;
  onToggleDark: () => void;
  onOpenMobileSidebar: () => void;
}

export default function Topbar({ isDark, onToggleDark, onOpenMobileSidebar }: TopbarProps) {
  const [query, setQuery] = useState('');
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-card-dark/80 sm:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onOpenMobileSidebar}
        aria-label="Ouvrir le menu"
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
      >
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="relative hidden max-w-md flex-1 md:block">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="text"
          placeholder="Rechercher une demande, un document…"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-[13.5px] text-slate-700 placeholder:text-slate-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:focus:bg-slate-800"
        />
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
        {/* Academic year */}
        <span className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-[12px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300 md:inline-block">
          {currentStudent.anneeUniversitaire}
        </span>

        {/* Dark mode switch */}
        <button
          onClick={onToggleDark}
          aria-label="Basculer le mode sombre"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notification bell */}
        <button
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-[9px] font-bold text-white ring-2 ring-white dark:ring-card-dark">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Divider */}
        <div className="hidden h-8 w-px bg-slate-200 dark:bg-slate-800 sm:block" />

        {/* Student identity */}
        <div className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-1 hover:bg-slate-50 dark:hover:bg-slate-800/60 sm:pr-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-[13px] font-bold text-primary-700 dark:bg-primary-500/20 dark:text-primary-300">
            {initials(currentStudent.firstName, currentStudent.lastName)}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
              {currentStudent.firstName} {currentStudent.lastName}
            </p>
            <p className="text-[11.5px] text-slate-400">Étudiant · {currentStudent.filiere.split(' — ')[0]}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
