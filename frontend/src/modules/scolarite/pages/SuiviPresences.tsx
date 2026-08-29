import { useState, useEffect, useCallback, useRef } from 'react';
import {
  UserCheck,
  CheckCircle,
  X,
  AlertTriangle,
  Search,
  ScanFace,
  QrCode,
  CreditCard,
  Keyboard,
  Clock,
  Loader2,
  UserX,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

type MethodePointage = 'RFID' | 'QR_Code' | 'Facial' | 'Manuel';
type StatutPresence = 'Present' | 'Absent' | 'Retard' | 'Justifie';

interface Utilisateur {
  nom: string;
  prenom: string;
  cne: string | null;
  photo: string | null;
}

interface Etudiant {
  id_etudiant: string;
  utilisateur: Utilisateur;
}

interface Presence {
  id_presence: string;
  id_session: string;
  id_etudiant: string;
  methode: MethodePointage;
  heure_pointage: string;
  statut: StatutPresence;
  etudiant?: Etudiant;
}

interface Session {
  id_session: string;
  salle?: { numero: string; nom: string | null };
  cours?: { nom: string };
  date: string;
  heure_debut: string;
  heure_fin: string;
  statut: string;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const API_PRESENCES = 'http://localhost:3000/api/presences';
const API_SESSIONS = 'http://localhost:3000/api/sessions';

const METHODE_OPTIONS: MethodePointage[] = ['RFID', 'QR_Code', 'Facial', 'Manuel'];
const STATUT_OPTIONS: StatutPresence[] = ['Present', 'Absent', 'Retard', 'Justifie'];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const formatTimeFr = (isoTime: string | null): string => {
  if (!isoTime) return '--:--';
  try {
    return new Date(isoTime).toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC'
    });
  } catch {
    return isoTime;
  }
};

const getStatutBadgeClasses = (statut: StatutPresence): string => {
  const map: Record<StatutPresence, string> = {
    Present: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800',
    Absent: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800',
    Retard: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    Justifie: 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800',
  };
  return map[statut] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
};

const getMethodeIcon = (methode: MethodePointage) => {
  const baseTile = "flex h-6 w-6 items-center justify-center rounded-md";
  switch (methode) {
    case 'RFID': return <div className={`${baseTile} bg-primary-50 dark:bg-primary-900/30`}><CreditCard className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" /></div>;
    case 'QR_Code': return <div className={`${baseTile} bg-sky-50 dark:bg-sky-900/30`}><QrCode className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" /></div>;
    case 'Facial': return <div className={`${baseTile} bg-violet-50 dark:bg-violet-900/30`}><ScanFace className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" /></div>;
    case 'Manuel': return <div className={`${baseTile} bg-slate-100 dark:bg-slate-800`}><Keyboard className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" /></div>;
    default: return <div className={`${baseTile} bg-slate-100 dark:bg-slate-800`}><UserCheck className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" /></div>;
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
        <div
          key={toast.id}
          className={`flex items-start gap-3 rounded-lg shadow-lg border p-4 animate-fade-in ${
            toast.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
          }`}
        >
          <div className={`flex h-6 w-6 items-center justify-center rounded-full flex-shrink-0 mt-0.5 ${
            toast.type === 'success' ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
          }`}>
            {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
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

export default function SuiviPresences() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  
  const [presences, setPresences] = useState<Presence[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulateur de scan
  const [scanInput, setScanInput] = useState('');
  const [scanMethode, setScanMethode] = useState<MethodePointage>('RFID');
  const [scanning, setScanning] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((type: Toast['type'], message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // 1. Charger toutes les sessions pour le menu déroulant
  useEffect(() => {
    fetch(API_SESSIONS)
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          setSessions(json.data);
          const enCours = json.data.find((s: Session) => s.statut === 'En_Cours');
          if (enCours) setSelectedSessionId(enCours.id_session);
          else if (json.data.length > 0) setSelectedSessionId(json.data[0].id_session);
        }
      })
      .catch(err => console.error('Erreur chargement sessions:', err));
  }, []);

  // 2. Charger les présences pour la session sélectionnée
  const fetchPresences = useCallback(async () => {
    if (!selectedSessionId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_PRESENCES}?session=${selectedSessionId}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.message);
      setPresences(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    fetchPresences();
  }, [fetchPresences]);

  // 3. Simuler un scan (POST)
  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) {
      pushToast('error', 'Veuillez entrer un ID Étudiant (UUID) valide.');
      return;
    }

    setScanning(true);
    try {
      const payload = {
        id_session: selectedSessionId,
        id_etudiant: scanInput.trim(),
        methode: scanMethode,
        statut: 'Present'
      };

      const response = await fetch(API_PRESENCES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.message || 'Erreur serveur');

      pushToast('success', 'Pointage enregistré avec succès.');
      setScanInput('');
      fetchPresences();
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setScanning(false);
    }
  };

  // 4. Changer manuellement un statut (PUT)
  const updateStatut = async (id_presence: string, nouveauStatut: StatutPresence) => {
    try {
      const response = await fetch(`${API_PRESENCES}/${id_presence}/statut`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: nouveauStatut })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message);
      
      pushToast('success', 'Statut mis à jour.');
      fetchPresences();
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Erreur réseau');
    }
  };

  const selectedSession = sessions.find(s => s.id_session === selectedSessionId);

  // KPIs
  const presents = presences.filter(p => p.statut === 'Present').length;
  const retards = presences.filter(p => p.statut === 'Retard').length;

  return (
    <div className="sc-portal min-h-screen p-6 md:p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/30 shadow-inner">
            <ScanFace className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Présences Smart Campus</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Suivi des pointages via RFID, QR Code et Reconnaissance Faciale.</p>
          </div>
        </header>

        {/* Sélection de la Session */}
        <div className="card p-5 flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Session active</label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            >
              {sessions.map(s => (
                <option key={s.id_session} value={s.id_session}>
                  [{s.statut.replace('_', ' ')}] {s.cours?.nom} - {s.salle?.numero} ({formatTimeFr(s.heure_debut)} - {formatTimeFr(s.heure_fin)})
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2.5 rounded-lg border border-green-200 dark:border-green-800 min-w-[120px] text-center">
              <p className="text-xs text-green-700 dark:text-green-400 font-semibold uppercase tracking-wide">Présents</p>
              <p className="text-xl font-bold text-green-800 dark:text-green-300 tabular-nums tracking-tight">{presents}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 px-4 py-2.5 rounded-lg border border-amber-200 dark:border-amber-800 min-w-[120px] text-center">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold uppercase tracking-wide">En Retard</p>
              <p className="text-xl font-bold text-amber-800 dark:text-amber-300 tabular-nums tracking-tight">{retards}</p>
            </div>
          </div>
        </div>

        {/* Simulateur de Scan (Hardware Mock) */}
        {selectedSession && selectedSession.statut === 'En_Cours' ? (
          <form onSubmit={handleScan} className="card bg-slate-900 dark:bg-black border-slate-800 dark:border-slate-900 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
              <h2 className="text-white font-semibold text-sm uppercase tracking-wider">Terminal de Pointage Actif</h2>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={scanMethode}
                onChange={(e) => setScanMethode(e.target.value as MethodePointage)}
                className="bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-400 focus:outline-none sm:w-48"
              >
                {METHODE_OPTIONS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
              
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="En attente de scan... (Collez un UUID étudiant ici)"
                  className="w-full bg-slate-950 text-primary-400 font-mono border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-400 focus:outline-none placeholder:text-slate-600 tabular-nums"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={scanning || !scanInput.trim()}
                className="bg-primary-500 hover:bg-primary-400 text-slate-950 font-bold px-6 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simuler Scan'}
              </button>
            </div>
          </form>
        ) : (
          <div className="card bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-2 opacity-50">
              <ShieldAlert className="h-6 w-6 text-slate-500 dark:text-slate-400" />
            </div>
            <p className="text-sm font-medium">Le terminal de pointage est désactivé.</p>
            <p className="text-xs mt-1">La session sélectionnée n'est pas "En Cours".</p>
          </div>
        )}

        {/* Table des Présences */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200/70 dark:border-slate-800 flex justify-between items-center bg-surface dark:bg-surface-dark/50">
            <h3 className="font-semibold text-slate-800 dark:text-white tracking-tight">Registre des Pointages</h3>
            <button onClick={fetchPresences} className="text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800" title="Rafraîchir">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/70 dark:divide-slate-800">
              <thead className="bg-white dark:bg-card-dark">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Heure</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Étudiant</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Méthode</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action Manuelle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {loading && presences.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary-500 dark:text-primary-400" /></td></tr>
                ) : presences.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mx-auto mb-2 opacity-50">
                        <UserX className="h-6 w-6" />
                      </div>
                      <p className="text-sm">Aucun pointage enregistré pour cette session.</p>
                    </td>
                  </tr>
                ) : (
                  presences.map((p) => {
                    const user = p.etudiant?.utilisateur;
                    return (
                      <tr key={p.id_presence} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-200 tabular-nums">
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              <Clock className="h-3.5 w-3.5" />
                            </div> 
                            {formatTimeFr(p.heure_pointage)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-xs">
                              {user?.prenom?.[0] || '?'}{user?.nom?.[0] || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800 dark:text-white">{user?.prenom} {user?.nom}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">CNE: {user?.cne || 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                            {getMethodeIcon(p.methode)}
                            {p.methode.replace('_', ' ')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatutBadgeClasses(p.statut)}`}>
                            {p.statut}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <select
                            value={p.statut}
                            onChange={(e) => updateStatut(p.id_presence, e.target.value as StatutPresence)}
                            className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-card dark:bg-card-dark text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-primary-400"
                          >
                            {STATUT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
      <ToastContainer toasts={toasts} onDismiss={id => setToasts(t => t.filter(x => x.id !== id))} />
    </div>
  );
}