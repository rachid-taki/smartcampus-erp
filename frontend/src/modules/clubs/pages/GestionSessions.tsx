import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapPin,
  Clock,
  Calendar,
  CheckCircle,
  X,
  AlertTriangle,
  Search,
  Plus,
  Play,
  CheckSquare,
  Loader2,
  BookOpen,
  User,
  Activity
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

type StatutSession = 'Planifiee' | 'En_Cours' | 'Terminee' | 'Annulee';

interface Salle {
  numero: string;
  nom: string | null;
  capacite: number;
}

interface Cours {
  nom: string;
  code: string;
}

interface Professeur {
  employe?: {
    utilisateur?: {
      nom: string;
      prenom: string;
    }
  }
}

interface SessionSalle {
  id_session: string;
  id_salle: string;
  id_cours: string;
  id_professeur: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  heure_debut_reelle?: string | null;
  heure_fin_reelle?: string | null;
  statut: StatutSession;
  nombre_etudiants?: number | null;
  retard_moyen?: number | null;
  salle?: Salle;
  cours?: Cours;
  professeur?: Professeur;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const API_BASE = 'http://localhost:3000/api';
const STATUT_OPTIONS: StatutSession[] = ['Planifiee', 'En_Cours', 'Terminee', 'Annulee'];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const formatDateFr = (isoDate: string): string => {
  if (!isoDate) return 'N/A';
  try {
    return new Date(isoDate).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return isoDate;
  }
};

const formatTimeFr = (isoTime: string | null | undefined): string => {
  if (!isoTime) return '--:--';
  try {
    return new Date(isoTime).toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
    });
  } catch {
    return isoTime;
  }
};

const getStatutBadgeClasses = (statut: StatutSession): string => {
  const map: Record<StatutSession, string> = {
    Planifiee: 'bg-blue-100 text-blue-700 border border-blue-200',
    En_Cours: 'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse',
    Terminee: 'bg-green-100 text-green-700 border border-green-200',
    Annulee: 'bg-red-100 text-red-700 border border-red-200',
  };
  return map[statut] ?? 'bg-gray-100 text-gray-600';
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
// Create Session Modal
// ─────────────────────────────────────────────────────────────

function CreateSessionModal({
  onClose,
  onSaved,
  pushToast,
}: {
  onClose: () => void;
  onSaved: () => Promise<void>;
  pushToast: (type: Toast['type'], message: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [salles, setSalles] = useState<any[]>([]);

  const [form, setForm] = useState({
    id_salle: '',
    id_cours: '',
    id_professeur: '',
    date: '',
    heure_debut: '',
    heure_fin: '',
  });

  useEffect(() => {
    fetch(`${API_BASE}/salles`)
      .then(res => res.json())
      .then(json => { if (json.success) setSalles(json.data); })
      .catch(err => console.error("Erreur salles:", err));
  }, []);

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.id_salle || !form.id_cours || !form.id_professeur || !form.date || !form.heure_debut || !form.heure_fin) {
      setFormError('Tous les champs sont obligatoires.');
      return;
    }
    if (form.heure_fin <= form.heure_debut) {
      setFormError("L'heure de fin doit être postérieure à l'heure de début.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message);

      pushToast('success', 'Session planifiée avec succès.');
      await onSaved();
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && onClose()}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Planifier une Session</h2>
          <button onClick={onClose} disabled={saving} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {formError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" /><span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Salle <span className="text-red-500">*</span></label>
            <select
              value={form.id_salle}
              onChange={e => setForm({ ...form, id_salle: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
            >
              <option value="">-- Sélectionner une salle --</option>
              {salles.map(s => <option key={s.id_salle} value={s.id_salle}>{s.numero} {s.nom ? `(${s.nom})` : ''}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">ID Cours (UUID)</label>
              <input type="text" value={form.id_cours} onChange={e => setForm({ ...form, id_cours: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="UUID du cours" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">ID Professeur (UUID)</label>
              <input type="text" value={form.id_professeur} onChange={e => setForm({ ...form, id_professeur: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="UUID du prof" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Début</label>
              <input type="time" value={form.heure_debut} onChange={e => setForm({ ...form, heure_debut: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Fin</label>
              <input type="time" value={form.heure_fin} onChange={e => setForm({ ...form, heure_fin: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Annuler</button>
          <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Planifier
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Update Session Status Modal
// ─────────────────────────────────────────────────────────────

function UpdateSessionModal({
  session,
  onClose,
  onSaved,
  pushToast,
}: {
  session: SessionSalle;
  onClose: () => void;
  onSaved: () => Promise<void>;
  pushToast: (type: Toast['type'], message: string) => void;
}) {
  const [statut, setStatut] = useState<StatutSession>(session.statut);
  const [heureDebutReelle, setHeureDebutReelle] = useState(session.heure_debut_reelle ? formatTimeFr(session.heure_debut_reelle) : '');
  const [heureFinReelle, setHeureFinReelle] = useState(session.heure_fin_reelle ? formatTimeFr(session.heure_fin_reelle) : '');
  const [nbEtudiants, setNbEtudiants] = useState(session.nombre_etudiants?.toString() || '');
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSaving(true);
    try {
      const payload: any = { statut };
      if (statut === 'En_Cours' && heureDebutReelle) payload.heure_debut_reelle = heureDebutReelle;
      if (statut === 'Terminee') {
        if (heureFinReelle) payload.heure_fin_reelle = heureFinReelle;
        if (nbEtudiants) payload.nombre_etudiants = parseInt(nbEtudiants, 10);
      }

      const response = await fetch(`${API_BASE}/sessions/${session.id_session}/statut`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message);

      pushToast('success', 'Session mise à jour.');
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && onClose()}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Mettre à jour la session</h2>
          {error && <div className="mb-4 text-sm text-red-700 bg-red-50 p-3 rounded-lg">{error}</div>}

          <div className="bg-gray-50 rounded-lg p-4 space-y-2 mb-4 text-sm">
            <p><span className="text-gray-500">Salle:</span> <span className="font-medium">{session.salle?.numero}</span></p>
            <p><span className="text-gray-500">Cours:</span> <span className="font-medium">{session.cours?.nom}</span></p>
            <p><span className="text-gray-500">Prévu:</span> <span className="font-medium">{formatTimeFr(session.heure_debut)} - {formatTimeFr(session.heure_fin)}</span></p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Statut de la session</label>
              <select value={statut} onChange={e => setStatut(e.target.value as StatutSession)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white">
                {STATUT_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>

            {statut === 'En_Cours' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Heure de début réelle</label>
                <input type="time" value={heureDebutReelle} onChange={e => setHeureDebutReelle(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </div>
            )}

            {statut === 'Terminee' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Heure de fin réelle</label>
                  <input type="time" value={heureFinReelle} onChange={e => setHeureFinReelle(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nb. Étudiants (Présence)</label>
                  <input type="number" min="0" value={nbEtudiants} onChange={e => setNbEtudiants(e.target.value)} placeholder="Ex: 24" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Annuler</button>
          <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function GestionSessions() {
  const [sessions, setSessions] = useState<SessionSalle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [statutFilter, setStatutFilter] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sessionToUpdate, setSessionToUpdate] = useState<SessionSalle | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((type: Toast['type'], message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/sessions`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.message);
      setSessions(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredSessions = sessions.filter(s => {
    const searchStr = `${s.salle?.numero} ${s.cours?.nom} ${s.professeur?.employe?.utilisateur?.nom}`.toLowerCase();
    const matchesSearch = !searchInput.trim() || searchStr.includes(searchInput.toLowerCase());
    const matchesStatut = !statutFilter || s.statut === statutFilter;
    return matchesSearch && matchesStatut;
  });

  const enCours = sessions.filter(s => s.statut === 'En_Cours').length;
  const terminees = sessions.filter(s => s.statut === 'Terminee').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center gap-3 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100">
            <Activity className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Sessions de Salles (Smart Campus)</h1>
            <p className="text-sm text-gray-500 mt-0.5">Suivi en temps réel de l'occupation des salles de cours.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Toutes les sessions</p>
              <Calendar className="h-5 w-5 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{sessions.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">En Cours actuellement</p>
              <Play className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{enCours}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Sessions Terminées</p>
              <CheckSquare className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{terminees}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Rechercher salle, cours ou prof..." className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)} className="md:w-48 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
            <option value="">Tous les statuts</option>
            {STATUT_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
            <Plus className="h-4 w-4" /> Planifier Session
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Salle & Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cours & Professeur</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Horaires Prévus</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Réalité (Smart Tracking)</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></td></tr>
                ) : filteredSessions.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Aucune session trouvée.</td></tr>
                ) : (
                  filteredSessions.map((s) => {
                    const prof = s.professeur?.employe?.utilisateur;
                    return (
                      <tr key={s.id_session} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800"><MapPin className="h-4 w-4 text-indigo-500" /> {s.salle?.numero}</div>
                          <div className="text-xs text-gray-500 mt-1">{formatDateFr(s.date)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800"><BookOpen className="h-4 w-4 text-emerald-500" /> {s.cours?.nom || 'Inconnu'}</div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1"><User className="h-3.5 w-3.5" /> {prof ? `${prof.prenom} ${prof.nom}` : 'Non assigné'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {formatTimeFr(s.heure_debut)} - {formatTimeFr(s.heure_fin)}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {s.heure_debut_reelle ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs">Début: <span className="font-semibold text-gray-800">{formatTimeFr(s.heure_debut_reelle)}</span></span>
                              {s.heure_fin_reelle && <span className="text-xs">Fin: <span className="font-semibold text-gray-800">{formatTimeFr(s.heure_fin_reelle)}</span></span>}
                              {s.nombre_etudiants !== null && <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full w-max mt-1">{s.nombre_etudiants} présents</span>}
                            </div>
                          ) : <span className="text-gray-400 italic">En attente...</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatutBadgeClasses(s.statut)}`}>
                            {s.statut.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button onClick={() => setSessionToUpdate(s)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            Mettre à jour
                          </button>
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

      {showCreateModal && <CreateSessionModal onClose={() => setShowCreateModal(false)} onSaved={fetchData} pushToast={pushToast} />}
      {sessionToUpdate && <UpdateSessionModal session={sessionToUpdate} onClose={() => setSessionToUpdate(null)} onSaved={fetchData} pushToast={pushToast} />}
      <ToastContainer toasts={toasts} onDismiss={id => setToasts(t => t.filter(x => x.id !== id))} />
    </div>
  );
}