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
    Present: 'bg-green-100 text-green-700 border border-green-200',
    Absent: 'bg-red-100 text-red-700 border border-red-200',
    Retard: 'bg-amber-100 text-amber-700 border border-amber-200',
    Justifie: 'bg-blue-100 text-blue-700 border border-blue-200',
  };
  return map[statut] ?? 'bg-gray-100 text-gray-600';
};

const getMethodeIcon = (methode: MethodePointage) => {
  switch (methode) {
    case 'RFID': return <CreditCard className="h-4 w-4 text-indigo-500" />;
    case 'QR_Code': return <QrCode className="h-4 w-4 text-sky-500" />;
    case 'Facial': return <ScanFace className="h-4 w-4 text-violet-500" />;
    case 'Manuel': return <Keyboard className="h-4 w-4 text-gray-500" />;
    default: return <UserCheck className="h-4 w-4 text-gray-500" />;
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
          className={`flex items-start gap-3 rounded-lg shadow-lg border p-4 ${
            toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
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
          // Auto-sélectionner la première session "En_Cours" si disponible
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
      setScanInput(''); // Vider l'input après succès
      fetchPresences(); // Rafraîchir la liste
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
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 shadow-inner">
            <ScanFace className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Présences Smart Campus</h1>
            <p className="text-sm text-gray-500 mt-0.5">Suivi des pointages via RFID, QR Code et Reconnaissance Faciale.</p>
          </div>
        </header>

        {/* Sélection de la Session */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Session active</label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-gray-50 focus:ring-2 focus:ring-teal-400 focus:outline-none"
            >
              {sessions.map(s => (
                <option key={s.id_session} value={s.id_session}>
                  [{s.statut.replace('_', ' ')}] {s.cours?.nom} - {s.salle?.numero} ({formatTimeFr(s.heure_debut)} - {formatTimeFr(s.heure_fin)})
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <div className="bg-teal-50 px-4 py-2 rounded-lg border border-teal-100 min-w[120px]">
              <p className="text-xs text-teal-600 font-semibold uppercase">Présents</p>
              <p className="text-xl font-bold text-teal-700">{presents}</p>
            </div>
            <div className="bg-amber-50 px-4 py-2 rounded-lg border border-amber-100 min-w[120px]">
              <p className="text-xs text-amber-600 font-semibold uppercase">En Retard</p>
              <p className="text-xl font-bold text-amber-700">{retards}</p>
            </div>
          </div>
        </div>

        {/* Simulateur de Scan (Hardware Mock) */}
        {selectedSession && selectedSession.statut === 'En_Cours' ? (
          <form onSubmit={handleScan} className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl shadow-lg border border-slate-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
              <h2 className="text-white font-semibold text-sm uppercase tracking-wider">Terminal de Pointage Actif</h2>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={scanMethode}
                onChange={(e) => setScanMethode(e.target.value as MethodePointage)}
                className="bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none sm:w-48"
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
                  className="w-full bg-slate-950 text-teal-400 font-mono border border-slate-600 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none placeholder:text-slate-600"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={scanning || !scanInput.trim()}
                className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-6 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simuler Scan'}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-gray-100 rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center text-gray-500">
            <ShieldAlert className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">Le terminal de pointage est désactivé.</p>
            <p className="text-xs mt-1">La session sélectionnée n'est pas "En Cours".</p>
          </div>
        )}

        {/* Table des Présences */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-semibold text-gray-800">Registre des Pointages</h3>
            <button onClick={fetchPresences} className="text-gray-400 hover:text-teal-600 transition-colors" title="Rafraîchir">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Heure</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Étudiant</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Méthode</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action Manuelle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading && presences.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></td></tr>
                ) : presences.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      <UserX className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Aucun pointage enregistré pour cette session.
                    </td>
                  </tr>
                ) : (
                  presences.map((p) => {
                    const user = p.etudiant?.utilisateur;
                    return (
                      <tr key={p.id_presence} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                          <div className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-gray-400" /> {formatTimeFr(p.heure_pointage)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xs">
                              {user?.prenom?.[0] || '?'}{user?.nom?.[0] || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{user?.prenom} {user?.nom}</p>
                              <p className="text-xs text-gray-500">CNE: {user?.cne || 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            {getMethodeIcon(p.methode)}
                            {p.methode.replace('_', ' ')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatutBadgeClasses(p.statut)}`}>
                            {p.statut}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <select
                            value={p.statut}
                            onChange={(e) => updateStatut(p.id_presence, e.target.value as StatutPresence)}
                            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-teal-400"
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