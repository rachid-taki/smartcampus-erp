import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Cpu,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Activity,
  MapPin,
  X,
  Loader2,
  RefreshCw,
  BellRing
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

type Gravite = 'Faible' | 'Moyenne' | 'Haute' | 'Critique';
type StatutAlerte = 'A_Traiter' | 'Resolue' | 'Fausse_Alerte';
type TypeAlerte = 'Anomalie_Presence' | 'Capacite_Depassee' | 'Conflit_Salle' | 'Securite' | string;

interface Alerte {
  id_alerte: string;
  type: TypeAlerte;
  message: string;
  gravite: Gravite;
  date_alerte: string;
  statut: StatutAlerte;
  id_session?: string | null;
  id_salle?: string | null;
  salle?: {
    numero: string;
    nom: string | null;
  };
  session?: {
    cours?: { nom: string };
    heure_debut: string;
    heure_fin: string;
  };
}

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

const API_BASE = 'http://localhost:3000/api/scolarite/alertes';

const GRAVITE_OPTIONS: Gravite[] = ['Faible', 'Moyenne', 'Haute', 'Critique'];
const STATUT_OPTIONS: StatutAlerte[] = ['A_Traiter', 'Resolue', 'Fausse_Alerte'];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const formatDateTimeFr = (isoDate: string): string => {
  if (!isoDate) return 'N/A';
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) + 
           ' à ' + 
           d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoDate;
  }
};

const getGraviteColor = (gravite: Gravite) => {
  switch (gravite) {
    case 'Critique': return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
    case 'Haute': return 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
    case 'Moyenne': return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    case 'Faible': return 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800';
    default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  }
};

const getStatutBadge = (statut: StatutAlerte) => {
  switch (statut) {
    case 'A_Traiter': 
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"><AlertTriangle className="h-3 w-3" /> À Traiter</span>;
    case 'Resolue': 
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"><CheckCircle className="h-3 w-3" /> Résolue</span>;
    case 'Fausse_Alerte': 
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"><XCircle className="h-3 w-3" /> Fausse Alerte</span>;
  }
};

// ─────────────────────────────────────────────────────────────
// Toast Container
// ─────────────────────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => (
        <div key={toast.id} className={`flex items-start gap-3 rounded-lg shadow-lg border p-4 animate-fade-in ${
          toast.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' : 
          toast.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300' : 
          'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-800 dark:text-primary-300'
        }`}>
          <div className={`flex h-6 w-6 items-center justify-center rounded-full flex-shrink-0 mt-0.5 ${
            toast.type === 'success' ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' : 
            toast.type === 'error' ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' : 
            'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400'
          }`}>
            {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : toast.type === 'error' ? <AlertTriangle className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
          </div>
          <p className="text-sm flex-1">{toast.message}</p>
          <button onClick={() => onDismiss(toast.id)} className="opacity-60 hover:opacity-100 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5"><X className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function AlertesIA() {
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterStatut, setFilterStatut] = useState<string>('A_Traiter');
  const [filterGravite, setFilterGravite] = useState<string>('');
  const [searchInput, setSearchInput] = useState('');

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((type: Toast['type'], message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const fetchAlertes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(API_BASE);
      const json = await response.json();
      if (!response.ok) throw new Error(json.message);
      setAlertes(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlertes();
  }, [fetchAlertes]);

  // Déclencher l'analyse IA (POST /analyze)
  const runAIAnalysis = async () => {
    setAnalyzing(true);
    try {
      const response = await fetch(`${API_BASE}/analyze`, { method: 'POST' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message);
      
      pushToast('success', `Diagnostic IA terminé. ${json.created || 0} nouvelle(s) alerte(s) générée(s).`);
      fetchAlertes();
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : "Erreur lors de l'analyse IA.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Mettre à jour le statut d'une alerte
  const updateStatut = async (id: string, statut: StatutAlerte) => {
    try {
      const response = await fetch(`${API_BASE}/${id}/statut`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut })
      });
      if (!response.ok) throw new Error('Erreur de mise à jour');
      pushToast('info', 'Statut de l\'alerte mis à jour.');
      fetchAlertes();
    } catch (err) {
      pushToast('error', 'Impossible de mettre à jour l\'alerte.');
    }
  };

  // Filtrage côté client
  const filteredAlertes = alertes.filter(a => {
    const matchesStatut = !filterStatut || a.statut === filterStatut;
    const matchesGravite = !filterGravite || a.gravite === filterGravite;
    const searchStr = `${a.type} ${a.message} ${a.salle?.numero}`.toLowerCase();
    const matchesSearch = !searchInput.trim() || searchStr.includes(searchInput.toLowerCase());
    return matchesStatut && matchesGravite && matchesSearch;
  });

  // KPIs
  const totalATraiter = alertes.filter(a => a.statut === 'A_Traiter').length;
  const totalCritiques = alertes.filter(a => a.statut === 'A_Traiter' && a.gravite === 'Critique').length;

  return (
    <div className="sc-portal min-h-screen p-6 md:p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/30 shadow-inner">
              <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Alertes IA & Smart Campus</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Surveillance automatisée des anomalies et conflits.</p>
            </div>
          </div>

          <button
            onClick={runAIAnalysis}
            disabled={analyzing}
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-soft hover:shadow-soft-hover disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {analyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Cpu className="h-5 w-5" />}
            Lancer le diagnostic IA
          </button>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5 border-l-4 border-l-red-500 dark:border-l-red-400">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Alertes à traiter</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/30">
                <BellRing className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{totalATraiter}</p>
          </div>
          <div className="card p-5 border-l-4 border-l-orange-500 dark:border-l-orange-400">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Urgences Critiques</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-900/30">
                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{totalCritiques}</p>
          </div>
          <div className="card p-5 border-l-4 border-l-primary-500 dark:border-l-primary-400">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Historique</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/30">
                <Activity className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{alertes.length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher une alerte..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark text-slate-800 dark:text-white placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            />
          </div>
          <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)} className="md:w-48 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark text-slate-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent">
            <option value="">Tous les statuts</option>
            {STATUT_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <select value={filterGravite} onChange={(e) => setFilterGravite(e.target.value)} className="md:w-48 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark text-slate-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent">
            <option value="">Toutes les gravités</option>
            {GRAVITE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {/* Grid des Alertes */}
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500 dark:text-primary-400" />
          </div>
        ) : filteredAlertes.length === 0 ? (
          <div className="card p-12 flex flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30 mb-3">
              <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-lg font-medium text-slate-800 dark:text-white tracking-tight">Aucune alerte détectée !</p>
            <p className="text-sm mt-1 text-slate-500 dark:text-slate-400">Le Smart Campus fonctionne parfaitement.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredAlertes.map(a => (
              <div key={a.id_alerte} className={`card p-5 transition-shadow ${a.statut === 'A_Traiter' ? 'border-l-4 border-l-red-500 dark:border-l-red-400' : ''}`}>
                <div className="flex justify-between items-start mb-3 gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getGraviteColor(a.gravite)}`}>
                      {a.gravite}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                      {a.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {getStatutBadge(a.statut)}
                </div>

                <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-1 leading-tight tracking-tight">{a.message}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-4 tabular-nums">
                  <div className="flex h-4 w-4 items-center justify-center rounded bg-slate-100 dark:bg-slate-800">
                    <Clock className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                  </div>
                  Détectée le {formatDateTimeFr(a.date_alerte)}
                </p>

                {/* Contexte de l'alerte (Salle / Session) */}
                {(a.salle || a.session) && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-sm space-y-2 border border-slate-200/70 dark:border-slate-700 mb-4">
                    {a.salle && (
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-primary-50 dark:bg-primary-900/30">
                          <MapPin className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <span className="font-medium">Salle :</span> <span className="tabular-nums">{a.salle.numero}</span> {a.salle.nom ? `(${a.salle.nom})` : ''}
                      </div>
                    )}
                    {a.session && (
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-50 dark:bg-emerald-900/30">
                          <Activity className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="font-medium">Cours :</span> {a.session.cours?.nom || 'Session inconnue'}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {a.statut === 'A_Traiter' && (
                  <div className="flex gap-2 pt-3 border-t border-slate-200/70 dark:border-slate-800">
                    <button
                      onClick={() => updateStatut(a.id_alerte, 'Resolue')}
                      className="flex-1 flex justify-center items-center gap-1.5 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                    >
                      <CheckCircle className="h-4 w-4" /> Marquer Résolue
                    </button>
                    <button
                      onClick={() => updateStatut(a.id_alerte, 'Fausse_Alerte')}
                      className="flex-1 flex justify-center items-center gap-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                    >
                      <XCircle className="h-4 w-4" /> Fausse Alerte
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <ToastContainer toasts={toasts} onDismiss={id => setToasts(t => t.filter(x => x.id !== id))} />
    </div>
  );
}