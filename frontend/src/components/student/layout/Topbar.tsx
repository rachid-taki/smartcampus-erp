import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
  CalendarDays,
  Compass,
  FileText,
  FolderOpen,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
} from 'lucide-react';
import { formatRelative, initials } from '../../../utils/format';
import {
  getCurrentStudent,
  getNotifications,
  getRecentDocuments,
  getRecentRequests,
  markNotificationRead,
} from '../../../services/student.service';

interface TopbarProps {
  isDark: boolean;
  onToggleDark: () => void;
  onOpenMobileSidebar: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  '/student/dashboard': 'Tableau de bord',
  '/student/profile': 'Mon Profil',
  '/student/documents': 'Mes Documents',
  '/student/requests': 'Mes Demandes',
  '/student/workflow': 'Suivi des demandes',
  '/student/notifications': 'Notifications',
  '/student/document': 'Mes documents',
  '/student/reclamations': 'Mes Réclamations',
  '/student/calendrier': 'Calendrier académique',
  '/student/parametres': 'Paramètres',
  '/student/presidence': 'espace president',
};

const categoryIcon: Record<string, typeof Bell> = {
  demande: FileText,
  document: FolderOpen,
  calendrier: CalendarDays,
  systeme: Settings,
  info: Bell,
  succes: FileText,
  alerte: CalendarDays,
  urgent: Settings,
};

export default function Topbar({ isDark, onToggleDark, onOpenMobileSidebar }: TopbarProps) {
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'SmartCampus ERP';
  const normalized = query.trim().toLowerCase();

  useEffect(() => {
    const loadStudent = async () => {
      try {
        const data = await getCurrentStudent();
        setStudent(data.user);
      } catch (err) {
        console.error(err);
      }
    };
    loadStudent();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [notif, req, docs] = await Promise.all([
          getNotifications(),
          getRecentRequests(),
          getRecentDocuments(),
        ]);
        setNotifications(notif);
        setRequests(req);
        setDocuments(docs);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const results = useMemo(() => {
    if (!normalized) return null;
    return {
      pages: Object.entries(PAGE_TITLES)
        .filter(([, label]) => label.toLowerCase().includes(normalized))
        .map(([to, label]) => ({ to, label })),
      requests: requests
        .filter(
          (r) =>
            r.reference?.toLowerCase().includes(normalized) ||
            r.type?.toLowerCase().includes(normalized) ||
            r.objet?.toLowerCase().includes(normalized)
        )
        .slice(0, 4),
      documents: documents
        .filter((d) => d.name?.toLowerCase().includes(normalized))
        .slice(0, 4),
      notifications: notifications
        .filter(
          (n) =>
            n.title?.toLowerCase().includes(normalized) ||
            n.message?.toLowerCase().includes(normalized)
        )
        .slice(0, 3),
    };
  }, [normalized, requests, documents, notifications]);

  const hasResults =
    results &&
    (results.pages.length > 0 ||
      results.requests.length > 0 ||
      results.documents.length > 0 ||
      results.notifications.length > 0);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const go = (to: string) => {
    navigate(to);
    setShowSearch(false);
    setQuery('');
  };

  const handleMarkRead = async (item: any) => {
    if (item.read) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );
    try {
      await markNotificationRead(item.id);
    } catch (err) {
      console.error(err);
    }
  };

  const firstName = student?.prenom ?? '';
  const lastName = student?.nom ?? '';
  const filiere = student?.filiere ?? '';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-card-dark/85">
      <div className="flex h-14 items-center gap-2.5 px-4 sm:px-6">
        <button
          onClick={onOpenMobileSidebar}
          aria-label="Ouvrir le menu"
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu size={18} />
        </button>

        <div key={location.pathname} className="flex animate-fade-in items-center gap-2.5">
          <span className="h-6 w-1.5 rounded-full bg-gradient-to-b from-primary-400 to-primary-700 shadow-sm shadow-primary-500/40" />
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">
              {pageTitle}
            </h1>
            <p className="text-[10px] font-medium tracking-wide text-slate-400 dark:text-slate-500">
              Espace étudiant
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <div className="relative hidden md:block md:w-48 lg:w-64" ref={searchRef}>
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSearch(true);
              }}
              onFocus={() => setShowSearch(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setShowSearch(false);
              }}
              type="text"
              placeholder="Rechercher…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-[12px] text-slate-700 placeholder:text-slate-400 transition focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:focus:bg-slate-800"
            />

            {showSearch && normalized && (
              <div className="absolute right-0 top-full z-50 mt-2 w-[320px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                {hasResults ? (
                  <div className="max-h-80 overflow-y-auto pb-2">
                    {results!.pages.length > 0 && (
                      <>
                        <p className="px-3 pb-1 pt-2.5 text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          Pages
                        </p>
                        {results!.pages.map((p) => (
                          <button
                            key={p.to}
                            onClick={() => go(p.to)}
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                              <Compass size={13} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-semibold text-slate-800 dark:text-white">
                                {p.label}
                              </p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">Page</p>
                            </div>
                          </button>
                        ))}
                      </>
                    )}

                    {results!.requests.length > 0 && (
                      <>
                        <p className="px-3 pb-1 pt-2.5 text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          Demandes
                        </p>
                        {results!.requests.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => go('/student/requests')}
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                              <FileText size={13} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-semibold text-slate-800 dark:text-white">
                                {r.objet || r.reference}
                              </p>
                              <p className="truncate text-[10px] text-slate-400 dark:text-slate-500">
                                {r.reference} • {r.type}
                              </p>
                            </div>
                          </button>
                        ))}
                      </>
                    )}

                    {results!.documents.length > 0 && (
                      <>
                        <p className="px-3 pb-1 pt-2.5 text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          Documents
                        </p>
                        {results!.documents.map((d) => (
                          <button
                            key={d.id}
                            onClick={() => go('/student/documents')}
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                              <FolderOpen size={13} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-semibold text-slate-800 dark:text-white">
                                {d.name}
                              </p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                {d.sizeKb} Ko
                              </p>
                            </div>
                          </button>
                        ))}
                      </>
                    )}

                    {results!.notifications.length > 0 && (
                      <>
                        <p className="px-3 pb-1 pt-2.5 text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          Notifications
                        </p>
                        {results!.notifications.map((n) => (
                          <button
                            key={n.id}
                            onClick={() => go('/student/notifications')}
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                              <Bell size={13} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-semibold text-slate-800 dark:text-white">
                                {n.title}
                              </p>
                              <p className="truncate text-[10px] text-slate-400 dark:text-slate-500">
                                {n.message}
                              </p>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="px-3 py-6 text-center">
                    <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                      Aucun résultat
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                      pour « {query} »
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={onToggleDark}
            aria-label="Basculer le mode sombre"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications((v) => !v)}
              aria-label="Notifications"
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white ring-2 ring-white dark:ring-card-dark">
                  {unreadCount >= 4 ? '+4' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full z-50 mt-2 w-[300px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5 dark:border-slate-700">
                  <h3 className="text-[12px] font-bold text-slate-800 dark:text-white">Notifications</h3>
                  <Link
                    to="/student/notifications"
                    onClick={() => setShowNotifications(false)}
                    className="text-[11px] font-semibold text-primary-600 transition hover:text-primary-700"
                  >
                    Voir plus
                  </Link>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.slice(0, 4).map((item) => {
                    const ItemIcon = categoryIcon[item.category?.toLowerCase()] || Bell;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleMarkRead(item)}
                        className="flex w-full items-start gap-2.5 border-b border-slate-100 px-3 py-2.5 text-left transition last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                      >
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          <ItemIcon size={13} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p
                              className={`truncate text-[12px] ${
                                item.read
                                  ? 'font-semibold text-slate-600 dark:text-slate-300'
                                  : 'font-bold text-slate-900 dark:text-white'
                              }`}
                            >
                              {item.title}
                            </p>
                            {!item.read && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600" />
                            )}
                          </div>
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400 dark:text-slate-500">
                            {item.message}
                          </p>
                          <p className="mt-1 text-[9px] font-medium text-slate-400 dark:text-slate-600">
                            {formatRelative(item.createdAt)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                  {notifications.length === 0 && (
                    <p className="px-3 py-6 text-center text-[12px] text-slate-400 dark:text-slate-500">
                      Aucune notification
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mx-0.5 hidden h-8 w-px bg-slate-200 dark:bg-slate-800 sm:block" />

          <button
            onClick={() => navigate('/student/profile')}
            aria-label="Voir mon profil"
            className="flex cursor-pointer items-center gap-2.5 rounded-full py-1 pl-1 pr-2.5 transition hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
          >
           
            {student?.photo ? (
              <img
                src={student.photo}
                alt="Photo de profil"
                className="h-8 w-8 rounded-full object-cover ring-2 ring-primary-100 dark:ring-primary-900/40"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-[11px] font-bold text-white shadow-sm">
                {initials(firstName, lastName)}
              </div>
            )}
            <div className="hidden text-left leading-tight sm:block">
             <p className="inline-flex items-center gap-4 text-[12px] font-bold text-slate-800 dark:text-slate-100">
  <span>{firstName} {lastName}</span>
  {localStorage.getItem("isPresidentClub") === "true" && (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800">
      <Building2 size={11} strokeWidth={2} />
      Président · {localStorage.getItem("clubName") || "Club"}
    </span>
  )}
</p>

              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                Étudiant · {filiere.split(' — ')[0]}
                
              </p>
              
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}