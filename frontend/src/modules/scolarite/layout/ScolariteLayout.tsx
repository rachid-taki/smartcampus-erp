import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Inbox, GitMerge, FolderOpen, Menu, X, Bell, ChevronDown,
  Search, Settings, LogOut, User, ChevronsLeft, ChevronsRight, Moon, Sun,
  Building2, LayoutGrid, ArrowLeftRight, HelpCircle, BrainCircuit, QrCode,
  CalendarDays, AlertTriangle, FileText, ArrowRight, WifiOff, Check, Clock,MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import ScolariteDashboard from '../pages/ScolariteDashboard';
import ValidationDemandes from '../pages/ValidationDemandes';
import GestionDocumentaire from '../pages/GestionDocumentaire';
import GestionSallesIntelligente from '../pages/GestionSallesIntelligente';
import GestionEmplois from '../pages/GestionEmplois';
import GestionSessions from '../pages/GestionSessions';
import SuiviPresences from '../pages/SuiviPresences';
import AlertesIA from '../pages/AlertesIA';
import Messaging from '../pages/Messaging';

const CLUBS_PATH = '/clubs';
const API_BASE = 'http://localhost:3000/api';
const NOTIF_POLL_INTERVAL_MS = 30000; // 30s. Swap for a socket.io listener if you want true real-time.


type TabKey = 'dashboard' | 'demandes' | 'workflows' | 'documents' | 'salles' | 'emplois' | 'sessions' | 'presences' | 'alertes'| 'messaging';

interface NotificationItem {
  id_notification: string;
  titre: string;
  message: string;
  lu: boolean;
  date_envoi: string;
}

// Définition des groupes logiques
const NAV_GROUPS = [
  {
    title: 'Général',
    items: [
      { key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    ]
  },
  {
    title: 'Guichet & Administration',
    items: [
      { key: 'demandes', label: 'Demandes Étudiantes', icon: Inbox },

      { key: 'documents', label: 'Gestion Documentaire', icon: FolderOpen },
      { key: 'workflows', label: 'Moteur de Workflows', icon: GitMerge },
      { key: 'messaging', label: 'Messagerie', icon: MessageSquare }, 
 ]
  },
  {
    title: 'Académique & Opérations',
    items: [
      { key: 'sessions', label: 'Sessions de Cours', icon: CalendarDays },
      { key: 'presences', label: 'Suivi Présences', icon: QrCode },
    ]
  },
  {
    title: 'Infrastructures & IA',
    items: [
      { key: 'emplois', label: 'Emplois (IA)', icon: BrainCircuit },
      { key: 'salles', label: 'Salles Intelligentes', icon: Building2 },
      { key: 'alertes', label: 'Alertes & Conflits', icon: AlertTriangle },
    ]
  }
];

const PAGE_TITLES: Record<TabKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Tableau de bord', subtitle: 'Indicateurs de la scolarité' },
  demandes: { title: 'Traitement des demandes', subtitle: 'Validation des demandes administratives' },
  documents: { title: 'Base documentaire', subtitle: 'Documents officiels et archives' },
  messaging: { title: 'Messagerie', subtitle: 'Communication avec les étudiants' }, 
  salles: { title: 'Salles Intelligentes', subtitle: 'Supervision et état des salles' },
  emplois: { title: 'Emplois du Temps (IA)', subtitle: 'Génération automatique via extraction intelligente' },
  sessions: { title: 'Sessions de Cours', subtitle: 'Gestion des cours et plannings' },
  presences: { title: 'Suivi des Présences', subtitle: 'Pointage numérique des étudiants aux sessions' },
  alertes: { title: 'Alertes & Conflits', subtitle: 'Détection des anomalies et conflits IA' },
};

// Formatte une date ISO en "12 mars, 14:35" (fr-FR)
const formatNotifDate = (dateString: string) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export default function ScolariteLayout() {
  const navigate = useNavigate();

  // ─── ÉTATS DE L'INTERFACE ───
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sc_sidebar') === '1');
  const [openGroups, setOpenGroups] = useState<string[]>(NAV_GROUPS.map(g => g.title));

  const [dark, setDark] = useState(() =>
    localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  // ─── ÉTATS DE L'UTILISATEUR & AUTH ───
  const [user, setUser] = useState<any>(null);
  const [initials, setInitials] = useState('SC');

  // ─── ÉTATS DES MENUS DÉROULANTS ───
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifError, setNotifError] = useState(false);
  const [notifLoading, setNotifLoading] = useState(true);

  // ─── ÉTATS DE LA RECHERCHE GLOBALE ───
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // 1. Initialisation Utilisateur & Thème
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setInitials(`${parsedUser.prenom?.[0] || ''}${parsedUser.nom?.[0] || ''}`.toUpperCase() || 'U');
      } catch (e) {
        console.error("Erreur parsing utilisateur");
      }
    } else {
      navigate('/login');
    }
  }, [dark, navigate]);

  useEffect(() => { localStorage.setItem('sc_sidebar', collapsed ? '1' : '0'); }, [collapsed]);

  // 2. Gestion des clics en dehors des menus + touche Échap (Fermeture auto)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(target)) setNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(target)) setIsSearchFocused(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProfileOpen(false);
        setNotifOpen(false);
        setIsSearchFocused(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 3. Récupération des notifications (avec polling pour rester à jour)
  const fetchNotifs = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && json.data) {
        setNotifications(json.data);
        setNotifError(false);
      } else {
        setNotifError(true);
      }
    } catch (error) {
      console.error("Erreur de récupération des notifications:", error);
      setNotifError(true);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, NOTIF_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  // ─── ACTIONS NOTIFICATIONS ───
  const markAsRead = async (id: string) => {
    // Mise à jour optimiste
    setNotifications(prev => prev.map(n => n.id_notification === id ? { ...n, lu: true } : n));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/notifications/${id}/lu`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (error) {
      console.error("Erreur marquage lu:", error);
      // Rollback si l'appel échoue
      setNotifications(prev => prev.map(n => n.id_notification === id ? { ...n, lu: false } : n));
    } finally {
      // Resynchronise avec le serveur pour éviter tout état incohérent
      fetchNotifs();
    }
  };

  const markAllAsRead = async () => {
    const previous = notifications;
    setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/notifications/marquer-tout-lu`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (error) {
      console.error("Erreur marquage tout lu:", error);
      setNotifications(previous);
    } finally {
      fetchNotifs();
    }
  };

  // ─── ACTIONS GÉNÉRALES ───
  const go = (t: TabKey) => {
    setActiveTab(t);
    setMobileOpen(false);
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  const toggleGroup = (title: string) => {
    setOpenGroups(prev => prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const unreadNotifsCount = notifications.filter(n => !n.lu).length;
  const unreadBadgeLabel = unreadNotifsCount > 9 ? '9+' : String(unreadNotifsCount);

  // ─── LOGIQUE DE RECHERCHE ───
  const matchedModules = NAV_GROUPS.flatMap(g => g.items).filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard': return <ScolariteDashboard />;
      case 'demandes': return <ValidationDemandes />;
      case 'documents': return <GestionDocumentaire />;
      case 'messaging': return <Messaging />;
      case 'salles': return <GestionSallesIntelligente onNavigateToEmplois={() => go('emplois')} />;
      case 'emplois': return <GestionEmplois />;
      case 'sessions': return <GestionSessions />;
      case 'presences': return <SuiviPresences />;
      case 'alertes': return <AlertesIA />;
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

        {/* Header Sidebar */}
        <div className={`flex items-center h-16 px-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 ${collapsed ? 'lg:justify-center lg:px-0' : 'gap-3'}`}>
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-md">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>
          <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
            <p className="text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">SmartCampus</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">Portail Scolarité</p>
          </div>
          <button onClick={() => setMobileOpen(false)} aria-label="Fermer le menu" className="ml-auto lg:hidden text-slate-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Groupée */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4 custom-scrollbar">
          {NAV_GROUPS.map((group, groupIndex) => {
            const isOpen = collapsed || openGroups.includes(group.title);
            return (
              <div key={group.title} className="space-y-1">
                {!collapsed && group.title !== 'Général' && (
                  <button
                    onClick={() => toggleGroup(group.title)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    <span>{group.title}</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
                  </button>
                )}

                {collapsed && groupIndex > 0 && <div className="h-px bg-slate-100 dark:bg-slate-800/80 mx-2 my-2" />}

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={collapsed ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={collapsed ? false : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-0.5 overflow-hidden"
                    >
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = activeTab === item.key as TabKey;
                        return (
                          <button
                            key={item.key}
                            onClick={() => go(item.key as TabKey)}
                            title={collapsed ? item.label : undefined}
                            aria-current={active ? 'page' : undefined}
                            className={`group relative w-full flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-all
                              ${collapsed ? 'lg:justify-center lg:px-0' : 'px-3'}
                              ${active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                                       : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70'}`}
                          >
                            <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-indigo-500 transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`} />
                            <Icon className={`h-[18px] w-[18px] flex-shrink-0 transition-colors ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`} />
                            <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          <div className={`px-3 pt-4 border-t border-slate-200 dark:border-slate-800 ${collapsed ? 'lg:px-0' : ''}`}>
            <p className={`mb-2 text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ${collapsed ? 'lg:hidden' : ''}`}>
              Autres modules
            </p>
            <button
              onClick={() => navigate(CLUBS_PATH)}
              title="Vie Étudiante & Clubs"
              className={`group relative w-full flex items-start gap-3 rounded-lg py-2.5 text-sm font-medium transition-all duration-200 border
                ${collapsed
                  ? 'lg:justify-center lg:px-0 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
                  : 'px-3 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm'
                }`}
            >
              <LayoutGrid className="h-[18px] w-[18px] flex-shrink-0 mt-0.5" />
              <span className={`flex-1 text-left leading-snug ${collapsed ? 'lg:hidden' : ''}`}>Vie Étudiante & Clubs</span>
            </button>
          </div>

        </nav>

        <div className="hidden lg:flex border-t border-slate-200 dark:border-slate-800 p-2">
          <button onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Étendre le menu' : 'Réduire le menu'} className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" />Réduire</>}
          </button>
        </div>

        {/* Profil de l'utilisateur en bas à gauche */}
        <div className={`border-t border-slate-200 dark:border-slate-800 p-3 ${collapsed ? 'lg:p-2' : ''}`}>
          <div className={`flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-2.5 ${collapsed ? 'lg:justify-center' : ''}`}>
            <div className="relative flex-shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-bold text-white">{initials}</div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950" />
            </div>
            <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user?.prenom} {user?.nom}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.role || 'Scolarité'}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* HEADER */}
        <header className="flex items-center justify-between h-16 px-4 sm:px-6 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu" className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white truncate">{page.title}</h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">{page.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 flex-1 justify-end">

            {/* ─── BARRE DE RECHERCHE GLOBALE ─── */}
            <div className="relative w-full max-w-sm hidden md:block" ref={searchRef}>
              <div className={`flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 border ${isSearchFocused ? 'border-indigo-400 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-700'} rounded-lg px-3 py-2 transition-all`}>
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  placeholder="Rechercher un module..."
                  aria-label="Rechercher un module"
                  className="w-full bg-transparent text-sm text-slate-800 dark:text-white placeholder-slate-400 outline-none"
                />
              </div>

              {/* Menu des résultats de recherche */}
              <AnimatePresence>
                {isSearchFocused && searchQuery.trim() !== '' && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden"
                  >
                    <div className="p-2">
                      <p className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400">Fonctionnalités</p>
                      {matchedModules.length > 0 ? (
                        matchedModules.map(mod => (
                          <button key={mod.key} onClick={() => go(mod.key as TabKey)} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-400 rounded-lg transition-colors">
                            <mod.icon className="h-4 w-4 opacity-70" />
                            {mod.label}
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2 text-xs text-slate-500">Aucun module trouvé pour "{searchQuery}".</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={() => setDark(!dark)} aria-label={dark ? 'Passer en mode clair' : 'Passer en mode sombre'} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* ─── NOTIFICATIONS ─── */}
            <div className="relative" ref={notifRef}>
              <button onClick={() => setNotifOpen(!notifOpen)} aria-label={`Notifications${unreadNotifsCount > 0 ? ` (${unreadNotifsCount} non lues)` : ''}`} className="relative p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <Bell className="h-5 w-5" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-0.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-950">
                    {unreadBadgeLabel}
                  </span>
                )}
                {notifError && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-950">
                    <WifiOff className="h-2 w-2 text-white" />
                  </span>
                )}
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">Notifications</p>
                      {unreadNotifsCount > 0 && (
                        <button onClick={markAllAsRead} className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                          Tout marquer comme lu
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto custom-scrollbar">
                      {notifLoading ? (
                        <div className="p-6 text-center text-slate-400 text-xs">Chargement…</div>
                      ) : notifError && notifications.length === 0 ? (
                        <div className="p-6 text-center text-slate-500">
                          <WifiOff className="h-8 w-8 mx-auto text-slate-300 mb-2 opacity-50" />
                          <p className="text-xs">Impossible de charger les notifications.</p>
                          <button onClick={fetchNotifs} className="mt-2 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                            Réessayer
                          </button>
                        </div>
                      ) : notifications.length > 0 ? notifications.slice(0, 5).map(n => (
                        <div
                          key={n.id_notification}
                          onClick={() => !n.lu && markAsRead(n.id_notification)}
                          className={`p-4 border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${!n.lu ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{n.titre}</p>
                            {!n.lu && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 flex-shrink-0" />}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {formatNotifDate(n.date_envoi)}
                          </p>
                        </div>
                      )) : (
                        <div className="p-6 text-center text-slate-500">
                          <Bell className="h-8 w-8 mx-auto text-slate-300 mb-2 opacity-50" />
                          <p className="text-xs">Aucune notification</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ─── PROFIL DÉROULANT ─── */}
            <div className="relative" ref={profileRef}>
              <button onClick={() => setProfileOpen(!profileOpen)} aria-label="Menu du profil" className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-bold text-white shadow-sm">{initials}</div>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.prenom} {user?.nom}</p>
                      <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>
                    <div className="p-1.5 space-y-0.5">
                      <button onClick={() => navigate('/profile')} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <User className="h-4 w-4 text-slate-400" /> Mon profil
                      </button>
                      <button onClick={() => navigate('/settings')} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <Settings className="h-4 w-4 text-slate-400" /> Paramètres
                      </button>
                    </div>
                    <div className="border-t border-slate-100 dark:border-slate-800 p-1.5 mt-0.5">
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <LogOut className="h-4 w-4" /> Déconnexion
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar">{renderPage()}</main>
      </div>
    </div>
  );
}
