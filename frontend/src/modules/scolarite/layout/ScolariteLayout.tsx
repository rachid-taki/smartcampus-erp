import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Inbox, GitMerge, FolderOpen, Menu, X, Bell, ChevronDown,
  Search, Settings, LogOut, User, ChevronsLeft, ChevronsRight, Moon, Sun,
  Building2, LayoutGrid, ArrowLeftRight, HelpCircle, BrainCircuit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import ScolariteDashboard from '../pages/ScolariteDashboard';
import ValidationDemandes from '../pages/ValidationDemandes';
import GestionWorkflows from '../pages/GestionWorkflows';
import GestionDocumentaire from '../pages/GestionDocumentaire';
import GestionSallesIntelligente from '../pages/GestionSallesIntelligente';
import GestionEmplois from '../pages/GestionEmplois'; // <-- Import de la nouvelle page

// ⚠️ Adapte ce chemin aux routes réelles de ton App.tsx
const CLUBS_PATH = '/clubs';

// <-- Ajout de 'emplois' dans le TabKey
type TabKey = 'dashboard' | 'demandes' | 'workflows' | 'documents' | 'salles' | 'emplois';

const NAV_ITEMS: { key: TabKey; label: string; icon: any }[] = [
  { key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { key: 'demandes', label: 'Demandes', icon: Inbox },
  { key: 'workflows', label: 'Workflows', icon: GitMerge },
  { key: 'documents', label: 'Documents', icon: FolderOpen },
  { key: 'salles', label: 'Salles & Conflits', icon: Building2 }, // <-- Ajustement du label
  { key: 'emplois', label: 'Emplois du temps (IA)', icon: BrainCircuit }, // <-- Nouvel onglet ajouté
];

const PAGE_TITLES: Record<TabKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Tableau de bord', subtitle: 'Indicateurs de la scolarité' },
  demandes: { title: 'Traitement des demandes', subtitle: 'Validation des demandes administratives' },
  workflows: { title: 'Workflows', subtitle: 'Processus de validation' },
  documents: { title: 'Base documentaire', subtitle: 'Documents officiels' },
  salles: { title: 'Salles & Conflits', subtitle: 'Suivi temps réel et détection de conflits' },
  emplois: { title: 'Emplois du Temps (IA)', subtitle: 'Génération automatique via extraction intelligente' }, // <-- Titre de la nouvelle page
};

export default function ScolariteLayout() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sc_sidebar') === '1');
  const [profileOpen, setProfileOpen] = useState(false);
  const [dark, setDark] = useState(() =>
    localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => { localStorage.setItem('sc_sidebar', collapsed ? '1' : '0'); }, [collapsed]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const go = (t: TabKey) => { setActiveTab(t); setMobileOpen(false); };

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard': return <ScolariteDashboard />;
      case 'demandes': return <ValidationDemandes />;
      case 'workflows': return <GestionWorkflows />;
      case 'documents': return <GestionDocumentaire />;
      case 'salles': return <GestionSallesIntelligente onNavigateToEmplois={() => go('emplois')} />;
      case 'emplois': return <GestionEmplois />;
      default: return null;
    }
  };

  const page = PAGE_TITLES[activeTab];

  return (
    <div className="h-screen w-full flex overflow-hidden bg-slate-50 dark:bg-slate-900">
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
        )}
      </AnimatePresence>

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 transition-all duration-300
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${collapsed ? 'lg:w-[72px]' : 'lg:w-64'} w-64`}>

        <div className={`flex items-center h-16 px-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 ${collapsed ? 'lg:justify-center lg:px-0' : 'gap-3'}`}>
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-md">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>
          <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
            <p className="text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">SmartCampus</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">Portail Scolarité</p>
          </div>
          <button onClick={() => setMobileOpen(false)} className="ml-auto lg:hidden text-slate-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className={`px-3 mb-2 ${collapsed ? 'lg:hidden' : ''}`}>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Scolarité</p>
          </div>

          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.key;
              return (
                <button key={item.key} onClick={() => go(item.key)} title={collapsed ? item.label : undefined}
                  className={`group relative w-full flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-all
                    ${collapsed ? 'lg:justify-center lg:px-0' : 'px-3'}
                    ${active ? 'bg-gradient-to-r from-primary-500/10 to-primary-600/5 dark:from-primary-500/20 dark:to-primary-600/10 text-primary-700 dark:text-primary-300'
                             : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70'}`}>
                  <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary-500 ${active ? 'opacity-100' : 'opacity-0'}`} />
                  <Icon className={`h-[18px] w-[18px] flex-shrink-0 ${active ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500'}`} />
                  <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                  {active && !collapsed && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-500" />}
                </button>
              );
            })}
          </div>

          {/* TUILE OD OO ICI : juste après les items Scolarité, dans le <nav> */}
          <div className={`px-3 pt-4 mt-3 border-t border-slate-200 dark:border-slate-800 ${collapsed ? 'lg:px-0' : ''}`}>
            <p className={`mb-2 text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ${collapsed ? 'lg:hidden' : ''}`}>
              Autres modules
            </p>
            <button
              onClick={() => navigate(CLUBS_PATH)}
              title="Vie Étudiante & Clubs"
              className={`w-full flex items-center gap-3 rounded-lg py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md transition-all
                ${collapsed ? 'lg:justify-center lg:px-0' : 'px-3'}`}>
              <LayoutGrid className="h-[18px] w-[18px] flex-shrink-0" />
              <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>Vie Étudiante & Clubs</span>
              <ArrowLeftRight className={`h-3.5 w-3.5 ml-auto opacity-70 ${collapsed ? 'lg:hidden' : ''}`} />
            </button>
          </div>
          {/* FIN TUILE */}
        </nav>

        <div className="hidden lg:flex border-t border-slate-200 dark:border-slate-800 p-2">
          <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" />Réduire</>}
          </button>
        </div>

        <div className={`border-t border-slate-200 dark:border-slate-800 p-3 ${collapsed ? 'lg:p-2' : ''}`}>
          <div className={`flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-2.5 ${collapsed ? 'lg:justify-center' : ''}`}>
            <div className="relative flex-shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-xs font-bold text-white">SC</div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950" />
            </div>
            <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">Scolarité Staff</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">staff@smartcampus.ma</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center justify-between h-16 px-4 sm:px-6 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">{page.title}</h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block truncate">{page.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="hidden lg:flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-64 text-slate-400">
              <Search className="h-4 w-4" /><span className="text-xs">Rechercher...</span>
            </div>
            <button onClick={() => setDark(!dark)} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button className="relative p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-950" />
            </button>
            <div className="relative" ref={profileRef}>
              <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-xs font-bold text-white">SC</div>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Scolarité Staff</p>
                      <p className="text-xs text-slate-500">staff@smartcampus.ma</p>
                    </div>
                    {[{ icon: User, label: 'Mon profil' }, { icon: Settings, label: 'Paramètres' }, { icon: HelpCircle, label: 'Aide' }].map((it) => (
                      <button key={it.label} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                        <it.icon className="h-4 w-4 text-slate-500" />{it.label}
                      </button>
                    ))}
                    <div className="border-t border-slate-200 dark:border-slate-800 mt-1 pt-1">
                      <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <LogOut className="h-4 w-4" />Déconnexion
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{renderPage()}</main>
      </div>
    </div>
  );
}