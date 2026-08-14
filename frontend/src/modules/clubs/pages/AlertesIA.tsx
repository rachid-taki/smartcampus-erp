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

const API_BASE = 'http://localhost:3000/api/alertes';

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
    case 'Critique': return 'bg-red-100 text-red-800 border-red-200';
    case 'Haute': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'Moyenne': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Faible': return 'bg-blue-100 text-blue-800 border-blue-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatutBadge = (statut: StatutAlerte) => {
  switch (statut) {
    case 'A_Traiter': 
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-100"><AlertTriangle className="h-3 w-3" /> À Traiter</span>;
    case 'Resolue': 
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600 border border-green-100"><CheckCircle className="h-3 w-3" /> Résolue</span>;
    case 'Fausse_Alerte': 
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200"><XCircle className="h-3 w-3" /> Fausse Alerte</span>;
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
        <div key={toast.id} className={`flex items-start gap-3 rounded-lg shadow-lg border p-4 ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
          {toast.type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" /> : toast.type === 'error' ? <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" /> : <ShieldAlert className="h-5 w-5 flex-shrink-0 mt-0.5" />}
          <p className="text-sm flex-1">{toast.message}</p>
          <button onClick={() => onDismiss(toast.id)} className="opacity-60 hover:opacity-100"><X className="h-4 w-4" /></button>
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
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 shadow-inner">
              <ShieldAlert className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Alertes IA & Smart Campus</h1>
              <p className="text-sm text-gray-500 mt-0.5">Surveillance automatisée des anomalies et conflits.</p>
            </div>
          </div>

          <button
            onClick={runAIAnalysis}
            disabled={analyzing}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-lg shadow-slate-900/20 disabled:opacity-70"
          >
            {analyzing ? <Loader2 className="h-5 w-5 animate-spin text-violet-400" /> : <Cpu className="h-5 w-5 text-violet-400" />}
            Lancer le diagnostic IA
          </button>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 border-l-4 border-l-red-500">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Alertes à traiter</p>
              <BellRing className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{totalATraiter}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 border-l-4 border-l-orange-500">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Urgences Critiques</p>
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{totalCritiques}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 border-l-4 border-l-blue-500">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Total Historique</p>
              <Activity className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{alertes.length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher une alerte..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)} className="md:w-40 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400">
            <option value="">Tous les statuts</option>
            {STATUT_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select value={filterGravite} onChange={(e) => setFilterGravite(e.target.value)} className="md:w-40 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400">
            <option value="">Toutes les gravités</option>
            {GRAVITE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {/* Grid des Alertes */}
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          </div>
        ) : filteredAlertes.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center text-gray-500">
            <CheckCircle className="h-12 w-12 mb-3 text-green-400" />
            <p className="text-lg font-medium text-gray-700">Aucune alerte détectée !</p>
            <p className="text-sm mt-1 text-gray-400">Le Smart Campus fonctionne parfaitement.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredAlertes.map(a => (
              <div key={a.id_alerte} className={`bg-white rounded-xl shadow-sm border p-5 transition-shadow hover:shadow-md ${a.statut === 'A_Traiter' ? 'border-red-100' : 'border-gray-100'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getGraviteColor(a.gravite)}`}>
                      Gravité {a.gravite}
                    </span>
                    <span className="text-[10px] font-semibold text-gray-500 uppercase bg-gray-100 px-2 py-0.5 rounded">
                      {a.type.replace('_', ' ')}
                    </span>
                  </div>
                  {getStatutBadge(a.statut)}
                </div>

                <h3 className="text-base font-semibold text-gray-800 mb-1 leading-tight">{a.message}</h3>
                <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-4">
                  <Clock className="h-3.5 w-3.5" /> Détectée le {formatDateTimeFr(a.date_alerte)}
                </p>

                {/* Contexte de l'alerte (Salle / Session) */}
                <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1.5 border border-slate-100 mb-4">
                  {a.salle && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <MapPin className="h-4 w-4 text-indigo-400" />
                      <span className="font-medium">Salle :</span> {a.salle.numero} {a.salle.nom ? `(${a.salle.nom})` : ''}
                    </div>
                  )}
                  {a.session && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <Activity className="h-4 w-4 text-teal-400" />
                      <span className="font-medium">Cours :</span> {a.session.cours?.nom || 'Session inconnue'}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {a.statut === 'A_Traiter' && (
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => updateStatut(a.id_alerte, 'Resolue')}
                      className="flex-1 flex justify-center items-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                    >
                      <CheckCircle className="h-4 w-4" /> Marquer Résolue
                    </button>
                    <button
                      onClick={() => updateStatut(a.id_alerte, 'Fausse_Alerte')}
                      className="flex-1 flex justify-center items-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
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