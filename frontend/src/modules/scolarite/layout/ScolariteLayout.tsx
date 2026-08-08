import { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Inbox,
  GitMerge,
  FolderOpen,
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
} from 'lucide-react';

// Import the four existing page components
import ScolariteDashboard from "../pages/ScolariteDashboard";
import ValidationDemandes from "../pages/ValidationDemandes";
import GestionWorkflows from "../pages/GestionWorkflows";
import GestionDocumentaire from "../pages/GestionDocumentaire";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type TabKey = 'dashboard' | 'demandes' | 'workflows' | 'documents';

interface NavItem {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

// ─────────────────────────────────────────────────────────────
// Nav configuration
// ─────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Tableau de Bord',
    icon: LayoutDashboard,
    description: "Vue d'ensemble des indicateurs",
  },
  {
    key: 'demandes',
    label: 'Traitement des Demandes',
    icon: Inbox,
    description: 'Validation des demandes administratives',
  },
  {
    key: 'workflows',
    label: 'Workflows',
    icon: GitMerge,
    description: 'Gestion des modèles de workflow',
  },
  {
    key: 'documents',
    label: 'Base Documentaire',
    icon: FolderOpen,
    description: 'Documents et signatures électroniques',
  },
];

const PAGE_TITLES: Record<TabKey, string> = {
  dashboard: 'Tableau de Bord',
  demandes: 'Traitement des Demandes',
  workflows: 'Gestion des Workflows',
  documents: 'Base Documentaire',
};

// ─────────────────────────────────────────────────────────────
// Main Layout Component
// ─────────────────────────────────────────────────────────────

export default function ScolariteLayout() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close the profile dropdown when clicking outside of it
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

  // Close the mobile sidebar whenever a nav item is selected
  const handleSelectTab = (tab: TabKey) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ScolariteDashboard />;
      case 'demandes':
        return <ValidationDemandes />;
      case 'workflows':
        return <GestionWorkflows />;
      case 'documents':
        return <GestionDocumentaire />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen w-full flex bg-gray-50 overflow-hidden">
      {/* ───────────────────────────────────────────────────── */}
      {/* Mobile overlay backdrop */}
      {/* ───────────────────────────────────────────────────── */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ───────────────────────────────────────────────────── */}
      {/* Sidebar */}
      {/* ───────────────────────────────────────────────────── */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-slate-900 text-slate-100 transition-all duration-300 ease-in-out
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
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-900/40">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div className={`min-w-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
            <p className="text-sm font-bold tracking-wide text-white leading-tight truncate">
              SmartCampus
            </p>
            <p className="text-[11px] text-slate-400 leading-tight truncate">
              Portail Scolarité
            </p>
          </div>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="ml-auto lg:hidden text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
          {!sidebarCollapsed && (
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Menu principal
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
                      ? 'bg-indigo-500/15 text-indigo-300'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  }
                `}
              >
                {/* Left accent bar for active state */}
                <span
                  className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-indigo-400 transition-opacity ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <Icon
                  className={`h-[18px] w-[18px] flex-shrink-0 ${
                    isActive ? 'text-indigo-300' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                <span className={`truncate ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                  {item.label}
                </span>

                {isActive && !sidebarCollapsed && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400" />
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

        {/* Footer / staff card */}
        <div
          className={`border-t border-slate-800 p-4 flex-shrink-0 ${
            sidebarCollapsed ? 'lg:hidden' : ''
          }`}
        >
          <div className="flex items-center gap-3 rounded-lg bg-slate-800/60 p-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-xs font-bold text-white">
              SA
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-100 truncate">
                Scolarité Staff
              </p>
              <p className="text-[11px] text-slate-400 truncate">Administration</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ───────────────────────────────────────────────────── */}
      {/* Right side: header + content */}
      {/* ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-gray-100 shadow-sm flex-shrink-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-800 truncate">
                {PAGE_TITLES[activeTab]}
              </h1>
              <p className="text-xs text-gray-400 hidden sm:block truncate">
                Bienvenue, Administration Scolarité 👋
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search (decorative, desktop only) */}
            <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 w-56 text-gray-400">
              <Search className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm truncate">Rechercher...</span>
            </div>

            {/* Notification bell */}
            <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            {/* Profile dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
                  SA
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-gray-700 leading-tight">
                    Scolarité Staff
                  </p>
                  <p className="text-[10px] text-gray-400 leading-tight">
                    Administration
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-gray-400 transition-transform ${
                    profileMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-50">
                    <p className="text-sm font-semibold text-gray-800">
                      Scolarité Staff
                    </p>
                    <p className="text-xs text-gray-400">staff@smartcampus.ma</p>
                  </div>
                  <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                    <User className="h-4 w-4 text-gray-400" />
                    Mon profil
                  </button>
                  <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                    <Settings className="h-4 w-4 text-gray-400" />
                    Paramètres
                  </button>
                  <div className="border-t border-gray-50 mt-1 pt-1">
                    <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                      <LogOut className="h-4 w-4" />
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic content area */}
        <main className="flex-1 overflow-y-auto">{renderActivePage()}</main>
      </div>
    </div>
  );
}