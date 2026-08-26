import { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  UserX,
  CalendarDays,
  Menu,
  X,
  Bell,
  ChevronDown,
  Search,
  Settings,
  LogOut,
  User,
  GraduationCap,
  ChevronsLeft,
  ChevronsRight,
  Construction,
  Building2, // <-- Ajout de l'icône pour les salles
} from 'lucide-react';

// Importez vos pages réelles ici
import ReclamationsNotes from '../pages/ReclamationsNotes';
import ValidationAbsences from '../pages/ValidationAbsences';
import PlanificationConsultations from '../pages/PlanificationConsultations';
import ReservationEnseignant from '../pages/ReservationEnseignant'; // <-- Ajout de la nouvelle page

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

// <-- Ajout de 'reservations'
type TabKey = 'dashboard' | 'reclamations' | 'absences' | 'consultations' | 'reservations';

interface NavItem {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// ─────────────────────────────────────────────────────────────
// Nav configuration (Module 7 - Enseignants)
// ─────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { key: 'reclamations', label: 'Réclamations de notes', icon: MessageSquare },
  { key: 'absences', label: 'Validation des absences', icon: UserX },
  { key: 'consultations', label: 'Planification consultations', icon: CalendarDays },
  { key: 'reservations', label: 'Réservation de salles', icon: Building2 }, // <-- Ajout au menu
];

const PAGE_TITLES: Record<TabKey, string> = {
  dashboard: 'Espace Enseignant',
  reclamations: 'Réclamations de Notes',
  absences: 'Validation des Absences',
  consultations: 'Planification des Consultations',
  reservations: 'Mes Réservations de Salles', // <-- Ajout du titre
};

// ─────────────────────────────────────────────────────────────
// Main Layout Component
// ─────────────────────────────────────────────────────────────

export default function EnseignantLayout() {
  const [activeTab, setActiveTab] = useState<TabKey>('reclamations');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close the profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTab = (tab: TabKey) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case 'reclamations':
        return <ReclamationsNotes />;
      case 'absences':
        return <ValidationAbsences />;
      case 'consultations':
        return <PlanificationConsultations />;
      case 'reservations':
        return <ReservationEnseignant />; // <-- Appel du composant
      default:
        return null;
    }
  };

  return (
    <div className="sc-portal h-screen w-full flex overflow-hidden">
      {/* ───────────────────────────────────────────────────── */}
      {/* Mobile overlay backdrop */}
      {/* ───────────────────────────────────────────────────── */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-surface-dark/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ───────────────────────────────────────────────────── */}
      {/* Sidebar */}
      {/* ───────────────────────────────────────────────────── */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-surface-dark text-slate-100 transition-all duration-300 ease-in-out
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-72'}
          w-72
        `}
      >
        {/* Brand */}
        <div
          className={`flex items-center gap-3 h-16 px-5 border-b border-slate-800 flex-shrink-0 ${
            sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''
          }`}
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-600 shadow-lg shadow-primary-900/40">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div className={`min-w-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
            <p className="text-sm font-bold tracking-wide text-white leading-tight truncate">
              SmartCampus
            </p>
            <p className="text-[11px] text-slate-400 leading-tight truncate">
              Portail Enseignant
            </p>
          </div>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="ml-auto lg:hidden text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
          {!sidebarCollapsed && (
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Menu Principal
            </p>
          )}

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;

            return (
              <button
                key={item.key}
                onClick={() => handleSelectTab(item.key)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`group relative w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150
                  ${sidebarCollapsed ? 'lg:justify-center' : ''}
                  ${
                    isActive
                      ? 'bg-primary-500/15 text-primary-300'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  }
                `}
              >
                {/* Left accent bar for active state */}
                <span
                  className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-primary-400 transition-opacity ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <Icon
                  className={`h-[18px] w-[18px] flex-shrink-0 ${
                    isActive
                      ? 'text-primary-300'
                      : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                <span className={`truncate ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                  {item.label}
                </span>

                {isActive && !sidebarCollapsed && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-400" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden lg:flex border-t border-slate-800 p-3">
          <button
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4" />
                Réduire
              </>
            )}
          </button>
        </div>

        {/* Footer / Teacher card */}
        <div
          className={`border-t border-slate-800 p-4 flex-shrink-0 ${
            sidebarCollapsed ? 'lg:hidden' : ''
          }`}
        >
          <div className="flex items-center gap-3 rounded-lg bg-slate-800/60 p-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
              Pr
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-100 truncate">
                Pr. Enseignant
              </p>
              <p className="text-[11px] text-slate-400 truncate">Département Info.</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ───────────────────────────────────────────────────── */}
      {/* Right side: header + content */}
      {/* ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-surface dark:bg-surface-dark">
        {/* Top Header */}
        <header className="flex items-center justify-between h-16 px-4 sm:px-6 bg-card dark:bg-card-dark border-b border-slate-200/70 dark:border-slate-800 flex-shrink-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-800 dark:text-white truncate tracking-tight">
                {PAGE_TITLES[activeTab]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search (decorative) */}
            <div className="hidden md:flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-56 text-slate-400 dark:text-slate-500">
              <Search className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm truncate">Recherche rapide...</span>
            </div>

            {/* Notification bell */}
            <button className="relative p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-card dark:ring-card-dark" />
            </button>

            {/* Profile dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                  Pr
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                    Mon Profil
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 dark:text-slate-500 transition-transform ${
                    profileMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 card py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-200/70 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">
                      Professeur
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">prof@smartcampus.ma</p>
                  </div>
                  <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-50 dark:bg-primary-900/30">
                      <User className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
                    </div>
                    Mon profil
                  </button>
                  <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-50 dark:bg-primary-900/30">
                      <Settings className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
                    </div>
                    Paramètres
                  </button>
                  <div className="border-t border-slate-200/70 dark:border-slate-800 mt-1 pt-1">
                    <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-50 dark:bg-red-900/30">
                        <LogOut className="h-3.5 w-3.5" />
                      </div>
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic content area */}
        <main className="flex-1 overflow-y-auto animate-fade-in">
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
}