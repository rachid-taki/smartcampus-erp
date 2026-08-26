import { useState, useEffect, useCallback } from 'react';
import {
  FileText, AlertCircle, FileCheck, ClipboardCheck, Building2, Users, Award,
  BellRing, GraduationCap, Briefcase, Send, Search, X, Loader2, Calendar,
  DoorOpen, XCircle, AlertTriangle, CheckCircle2, Activity, Megaphone, UserCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const API_BASE = 'http://localhost:3000/api/scolarite';

interface DashboardData {
  demandesStats: any;
  reclamationsStats: any;
  certificatsStats: any;
  verificationsStats: any;
  sallesStats: any;
  clubsStats: any;
  documentsOfficielsStats: any;
  notificationsStats: any;
  recentActivity: any[];
  activityLast14Days: any[];
  demandesByStatus: any[];
  sessionsNext7Days: any[];
}

const DEFAULT_DATA: DashboardData = {
  demandesStats: { soumises: 0, enTraitement: 0, validees: 0, rejetees: 0, cloturees: 0, total: 0 },
  reclamationsStats: { ouvertes: 0, total: 0 },
  certificatsStats: { enAttente: 0, total: 0 },
  verificationsStats: { demandees: 0, planifiees: 0, total: 0 },
  sallesStats: { disponibles: 0, occupees: 0, maintenance: 0, total: 0, sessionsAujourdhui: 0, reservationsEnAttente: 0 },
  clubsStats: { actifs: 0, inactifs: 0, suspendus: 0, total: 0, demandesEnAttente: 0 },
  documentsOfficielsStats: { genereAujourdhui: 0, totalSemaine: 0 },
  notificationsStats: { etudiantsANotifier: 0, enseignantsANotifier: 0 },
  recentActivity: [],
  activityLast14Days: [],
  demandesByStatus: [],
  sessionsNext7Days: [],
};

const NOTIF_TYPES = [
  { value: 'Info', label: 'Info' },
  { value: 'Demande', label: 'Demande' },
  { value: 'Document', label: 'Document' },
  { value: 'Calendrier', label: 'Calendrier' },
  { value: 'Succes', label: 'Succès' },
  { value: 'Alerte', label: 'Alerte' },
  { value: 'Urgent', label: 'Urgent' },
];

const NOTIF_PRIORITES = [
  { value: 'Info', label: 'Normale' },
  { value: 'Warning', label: 'Importante' },
  { value: 'Urgent', label: 'Urgente' },
];

const formatDateFr = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
};

const getStatutConfig = (statut: string) => {
  const map: Record<string, { gradient: string; icon: any }> = {
    Soumise: { gradient: 'from-blue-500 to-indigo-600', icon: FileText },
    En_Traitement: { gradient: 'from-amber-500 to-orange-600', icon: Activity },
    Validee: { gradient: 'from-emerald-500 to-teal-600', icon: CheckCircle2 },
    Rejetee: { gradient: 'from-rose-500 to-red-600', icon: XCircle },
    Cloturee: { gradient: 'from-slate-500 to-slate-600', icon: CheckCircle2 },
    Brouillon: { gradient: 'from-slate-400 to-slate-500', icon: FileText },
  };
  return map[statut] || map.Brouillon;
};

function NotificationModal({ audience, onClose, onSent }: {
  audience: 'ETUDIANT' | 'PROFESSOR';
  onClose: () => void;
  onSent: (count: number, error?: string) => void;
}) {
  const [mode, setMode] = useState<'tous' | 'specifique'>('tous');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [titre, setTitre] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('Info');
  const [priorite, setPriorite] = useState('Info');
  const [sending, setSending] = useState(false);

  const isEtudiant = audience === 'ETUDIANT';

  useEffect(() => {
    if (mode !== 'specifique') return;
    const t = setTimeout(async () => {
      setLoadingUsers(true);
      try {
        const res = await fetch(`${API_BASE}/utilisateurs?role=${audience}&search=${encodeURIComponent(search)}`);
        const json = await res.json();
        if (json.success) setUsers(json.data);
      } catch {}
      setLoadingUsers(false);
    }, 300);
    return () => clearTimeout(t);
  }, [mode, search, audience]);

  const toggleUser = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canSend = titre.trim().length > 0 && message.trim().length > 0 && (mode === 'tous' || selected.size > 0);

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre,
          message,
          type,
          priorite,
          cible: mode === 'tous' ? (isEtudiant ? 'etudiants' : 'enseignants') : 'specifique',
          userIds: mode === 'specifique' ? Array.from(selected) : [],
        }),
      });
      const json = await res.json();
      if (json.success) onSent(json.count);
      else onSent(0, json.message);
    } catch {
      onSent(0, 'Erreur de connexion au serveur.');
    }
    setSending(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[92vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col"
      >
        <div className={`relative overflow-hidden bg-gradient-to-br ${isEtudiant ? 'from-blue-500 to-indigo-600' : 'from-amber-500 to-orange-600'} p-5 text-white`}>
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                {isEtudiant ? <GraduationCap className="h-6 w-6" /> : <Briefcase className="h-6 w-6" />}
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">
                  Notifier {isEtudiant ? 'les étudiants' : 'les enseignants'}
                </h2>
                <p className="text-xs text-white/80">Envoi de notification personnalisée</p>
              </div>
            </div>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-2">Destinataires</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('tous')}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all ${
                  mode === 'tous'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <Users className="h-4 w-4" />
                Tous
              </button>
              <button
                type="button"
                onClick={() => setMode('specifique')}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all ${
                  mode === 'specifique'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <UserCheck className="h-4 w-4" />
                Spécifique
              </button>
            </div>
          </div>

          <AnimatePresence>
            {mode === 'specifique' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="relative border-b border-slate-200 dark:border-slate-700">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Rechercher par nom, prénom, email..."
                      className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {loadingUsers ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      </div>
                    ) : users.length === 0 ? (
                      <p className="py-6 text-center text-xs text-slate-400">Aucun utilisateur trouvé</p>
                    ) : (
                      users.map((u) => (
                        <button
                          key={u.id_utilisateur}
                          type="button"
                          onClick={() => toggleUser(u.id_utilisateur)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                            selected.has(u.id_utilisateur) ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <div className={`flex h-4 w-4 items-center justify-center rounded border-2 transition-colors ${
                            selected.has(u.id_utilisateur) ? 'border-primary-500 bg-primary-500 text-white' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {selected.has(u.id_utilisateur) && <CheckCircle2 className="h-3 w-3" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">{u.prenom} {u.nom}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{u.email}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  {selected.size > 0 && (
                    <div className="border-t border-slate-200 dark:border-slate-700 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50">
                      <p className="text-[10px] font-semibold text-primary-700 dark:text-primary-300">{selected.size} sélectionné(s)</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1.5">Titre</label>
            <input
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex: Rappel — dépôt des certificats"
              className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Rédigez votre message..."
              className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary-400 transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1.5">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-primary-400">
                {NOTIF_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1.5">Priorité</label>
              <select value={priorite} onChange={(e) => setPriorite(e.target.value)} className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-primary-400">
                {NOTIF_PRIORITES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
          <button onClick={onClose} disabled={sending} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50">
            Annuler
          </button>
          <button
            onClick={handleSend}
            disabled={!canSend || sending}
            className={`inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white rounded-lg shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.98] bg-gradient-to-r ${isEtudiant ? 'from-blue-500 to-indigo-600' : 'from-amber-500 to-orange-600'}`}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {mode === 'tous' ? 'Envoyer à tous' : `Envoyer (${selected.size})`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ScolariteDashboard() {
  const [data, setData] = useState<DashboardData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifAudience, setNotifAudience] = useState<'ETUDIANT' | 'PROFESSOR' | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE}/dashboard/stats`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Erreur serveur (code ${response.status})`);
        const json = await response.json();
        if (!json.success) throw new Error('La requête a échoué côté serveur.');
        setData({
          demandesStats: { ...DEFAULT_DATA.demandesStats, ...(json.data.demandesStats || {}) },
          reclamationsStats: { ...DEFAULT_DATA.reclamationsStats, ...(json.data.reclamationsStats || {}) },
          certificatsStats: { ...DEFAULT_DATA.certificatsStats, ...(json.data.certificatsStats || {}) },
          verificationsStats: { ...DEFAULT_DATA.verificationsStats, ...(json.data.verificationsStats || {}) },
          sallesStats: { ...DEFAULT_DATA.sallesStats, ...(json.data.sallesStats || {}) },
          clubsStats: { ...DEFAULT_DATA.clubsStats, ...(json.data.clubsStats || {}) },
          documentsOfficielsStats: { ...DEFAULT_DATA.documentsOfficielsStats, ...(json.data.documentsOfficielsStats || {}) },
          notificationsStats: { ...DEFAULT_DATA.notificationsStats, ...(json.data.notificationsStats || {}) },
          recentActivity: json.data.recentActivity || [],
          activityLast14Days: json.data.activityLast14Days || [],
          demandesByStatus: json.data.demandesByStatus || [],
          sessionsNext7Days: json.data.sessionsNext7Days || [],
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Impossible de contacter le serveur.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleNotifSent = (count: number, errorMsg?: string) => {
    if (errorMsg) setToast({ type: 'error', msg: errorMsg });
    else setToast({ type: 'success', msg: `Notification envoyée à ${count} destinataire(s).` });
    setNotifAudience(null);
  };

  if (loading) {
    return (
      <div className="sc-portal min-h-screen p-5 md:p-6 animate-fade-in">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="h-14 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="card p-5 h-28 animate-pulse" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-5 h-72 lg:col-span-2 animate-pulse" />
            <div className="card p-5 h-72 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sc-portal min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full card p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/30">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Erreur de chargement</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  const { demandesStats, reclamationsStats, certificatsStats, verificationsStats, sallesStats, clubsStats, documentsOfficielsStats, recentActivity, activityLast14Days, demandesByStatus, sessionsNext7Days } = data;

  const demandesTraitees = demandesStats.validees + demandesStats.rejetees + demandesStats.cloturees;
  const tauxValidation = demandesTraitees > 0 ? Math.round((demandesStats.validees / demandesTraitees) * 100) : 0;

  const kpis = [
    { label: 'Demandes', value: demandesStats.total, sub: `${demandesStats.soumises + demandesStats.enTraitement} à traiter`, icon: FileText, gradient: 'from-blue-500 to-indigo-600', trend: `${tauxValidation}% validées` },
    { label: 'Réclamations', value: reclamationsStats.ouvertes, sub: `${reclamationsStats.total} au total`, icon: AlertCircle, gradient: 'from-rose-500 to-red-600', trend: 'ouvertes' },
    { label: 'Certificats', value: certificatsStats.enAttente, sub: `${certificatsStats.total} au total`, icon: FileCheck, gradient: 'from-emerald-500 to-teal-600', trend: 'en attente' },
    { label: 'Vérifications', value: verificationsStats.total, sub: `${verificationsStats.planifiees} planifiées`, icon: ClipboardCheck, gradient: 'from-amber-500 to-orange-600', trend: 'examens' },
  ];

  return (
    <div className="sc-portal min-h-screen p-5 md:p-6 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white shadow-lg shadow-primary-500/30">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Tableau de bord Scolarité</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Vue d'ensemble des activités académiques et administratives</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setNotifAudience('ETUDIANT')}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98] transition-all"
            >
              <BellRing className="h-4 w-4" />
              Notifier étudiants
            </button>
            <button
              onClick={() => setNotifAudience('PROFESSOR')}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 active:scale-[0.98] transition-all"
            >
              <Megaphone className="h-4 w-4" />
              Notifier enseignants
            </button>
          </div>
        </motion.header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis.map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (i + 1) }}
                className="card relative overflow-hidden p-5 group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${kpi.gradient}`} />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{kpi.label}</p>
                    <p className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight mt-1">{kpi.value}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{kpi.sub}</p>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${kpi.gradient} text-white shadow-md group-hover:scale-110 transition-transform`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">Activité des 14 derniers jours</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Demandes et réclamations reçues</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />Demandes</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />Réclamations</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={activityLast14Days}>
                <defs>
                  <linearGradient id="gradDem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Area type="monotone" dataKey="Demandes" stroke="#3b82f6" strokeWidth={2} fill="url(#gradDem)" />
                <Area type="monotone" dataKey="Reclamations" stroke="#f43f5e" strokeWidth={2} fill="url(#gradRec)" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="card p-5">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">Répartition des demandes</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Par statut</p>
            </div>
            {demandesByStatus.length === 0 ? (
              <div className="flex h-56 items-center justify-center text-xs text-slate-400">Aucune donnée</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={demandesByStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={3} stroke="none">
                      {demandesByStatus.map((entry: any, index: number) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {demandesByStatus.map((s: any) => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-white tabular-nums">{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="card p-5">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">Sessions à venir</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">7 prochains jours</p>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={sessionsNext7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="Sessions" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">Salles</h2>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                <Building2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                <span className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400"><DoorOpen className="h-4 w-4 text-emerald-500" />Disponibles</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{sallesStats.disponibles}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                <span className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400"><XCircle className="h-4 w-4 text-rose-500" />Occupées</span>
                <span className="text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums">{sallesStats.occupees}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                <span className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400"><AlertTriangle className="h-4 w-4 text-amber-500" />Maintenance</span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">{sallesStats.maintenance}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-center">
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300 tabular-nums">{sallesStats.sessionsAujourdhui}</p>
                  <p className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 uppercase">Sessions aujourd'hui</p>
                </div>
                <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/20 text-center">
                  <p className="text-lg font-bold text-purple-700 dark:text-purple-300 tabular-nums">{sallesStats.reservationsEnAttente}</p>
                  <p className="text-[9px] font-semibold text-purple-600 dark:text-purple-400 uppercase">Réservations</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">Clubs</h2>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                <Award className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                <span className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Actifs</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{clubsStats.actifs}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                <span className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400"><XCircle className="h-4 w-4 text-slate-400" />Inactifs</span>
                <span className="text-lg font-bold text-slate-600 dark:text-slate-400 tabular-nums">{clubsStats.inactifs}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                <span className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400"><AlertTriangle className="h-4 w-4 text-amber-500" />Suspendus</span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">{clubsStats.suspendus}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-primary-50 to-indigo-50 dark:from-primary-950/20 dark:to-indigo-950/20 border border-primary-200 dark:border-primary-900 text-center">
                <p className="text-lg font-bold text-primary-700 dark:text-primary-300 tabular-nums">{clubsStats.demandesEnAttente}</p>
                <p className="text-[9px] font-semibold text-primary-600 dark:text-primary-400 uppercase">Demandes de clubs en attente</p>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">Activité récente</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Dernières demandes soumises</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <Activity className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </div>
          </div>
          <div className="space-y-2">
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <FileText className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Aucune activité récente</p>
              </div>
            ) : (
              recentActivity.map((item, index) => {
                const config = getStatutConfig(item.statut);
                const Icon = config.icon;
                return (
                  <motion.div
                    key={item.idDemande}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all"
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${config.gradient} text-white shadow-sm flex-shrink-0`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-800 dark:text-white tabular-nums">{item.numero}</p>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400">{item.typeDemande}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 truncate">{item.objet}</p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{item.statut.replace(/_/g, ' ')}</span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400"><Calendar className="h-3 w-3" />{formatDateFr(item.dateCreation)}</span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {notifAudience && (
          <NotificationModal audience={notifAudience} onClose={() => setNotifAudience(null)} onSent={handleNotifSent} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 flex items-start gap-3 rounded-lg shadow-lg border p-3 max-w-sm ${
              toast.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
            <p className="text-xs flex-1">{toast.msg}</p>
            <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}