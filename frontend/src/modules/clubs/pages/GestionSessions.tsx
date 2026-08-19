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
  id_professeur: string;
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

const API_BASE = 'http://localhost:3000/api/sessions';
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
    Planifiee: 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800',
    En_Cours: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse',
    Terminee: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800',
    Annulee: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800',
  };
  return map[statut] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
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
  
  // États pour les listes déroulantes
  const [salles, setSalles] = useState<any[]>([]);
  const [coursList, setCoursList] = useState<any[]>([]);
  const [profsList, setProfsList] = useState<any[]>([]);
  
  const [loadingCours, setLoadingCours] = useState(true);
  const [loadingProfs, setLoadingProfs] = useState(true);

  const [form, setForm] = useState({
    id_salle: '',
    id_cours: '',
    id_professeur: '',
    date: '',
    heure_debut: '',
    heure_fin: '',
  });

  useEffect(() => {
    // 1. Charger les salles (URL absolue pointant vers le module salles)
    fetch(`http://localhost:3000/api/salles`)
      .then(res => res.json())
      .then(json => { if (json.success) setSalles(json.data); })
      .catch(err => console.error("Erreur salles:", err));

    // 2. Charger les cours (URL pointant vers les nouvelles routes du module sessions)
    setLoadingCours(true);
    fetch(`${API_BASE}/cours`)
      .then(res => res.json())
      .then(json => { if (json.success) setCoursList(json.data); })
      .catch(err => console.error("Erreur cours:", err))
      .finally(() => setLoadingCours(false));

    // 3. Charger les professeurs (URL pointant vers les nouvelles routes du module sessions)
    setLoadingProfs(true);
    fetch(`${API_BASE}/professeurs`)
      .then(res => res.json())
      .then(json => { if (json.success) setProfsList(json.data); })
      .catch(err => console.error("Erreur professeurs:", err))
      .finally(() => setLoadingProfs(false));
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
      const response = await fetch(API_BASE, {
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-surface-dark/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => !saving && onClose()}>
      <div className="card p-0 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/70 dark:border-slate-800 sticky top-0 bg-card dark:bg-card-dark rounded-t-card z-10">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white tracking-tight">Planifier une Session</h2>
          <button onClick={onClose} disabled={saving} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {formError && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5">
                <AlertTriangle className="h-3 w-3" />
              </div>
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Salle <span className="text-red-500">*</span></label>
            <select
              value={form.id_salle}
              onChange={e => setForm({ ...form, id_salle: e.target.value })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            >
              <option value="" disabled>-- Sélectionner une salle --</option>
              {salles.map(s => <option key={s.id_salle} value={s.id_salle}>{s.numero} {s.nom ? `(${s.nom})` : ''}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Menu déroulant pour le Cours */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Cours <span className="text-red-500">*</span></label>
              {loadingCours ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
                </div>
              ) : (
                <select
                  value={form.id_cours}
                  onChange={e => setForm({ ...form, id_cours: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                >
                  <option value="" disabled>-- Sélectionner --</option>
                  {coursList.map(c => <option key={c.id_cours} value={c.id_cours}>{c.nom} ({c.code})</option>)}
                </select>
              )}
            </div>

            {/* Menu déroulant pour le Professeur */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Professeur <span className="text-red-500">*</span></label>
              {loadingProfs ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
                </div>
              ) : (
                <select
                  value={form.id_professeur}
                  onChange={e => setForm({ ...form, id_professeur: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                >
                  <option value="" disabled>-- Sélectionner --</option>
                  {profsList.map(p => (
                    <option key={p.id_professeur} value={p.id_professeur}>
                      {p.employe?.utilisateur?.prenom} {p.employe?.utilisateur?.nom}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Date <span className="text-red-500">*</span></label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Début <span className="text-red-500">*</span></label>
              <input type="time" value={form.heure_debut} onChange={e => setForm({ ...form, heure_debut: e.target.value })} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent tabular-nums" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Fin <span className="text-red-500">*</span></label>
              <input type="time" value={form.heure_fin} onChange={e => setForm({ ...form, heure_fin: e.target.value })} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent tabular-nums" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200/70 dark:border-slate-800 sticky bottom-0 bg-card dark:bg-card-dark rounded-b-card">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50">Annuler</button>
          <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-soft hover:shadow-soft-hover transition-all disabled:opacity-60 disabled:cursor-not-allowed">
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
      const payload: Record<string, any> = { statut };
      if (statut === 'En_Cours' && heureDebutReelle) payload.heure_debut_reelle = heureDebutReelle;
      if (statut === 'Terminee') {
        if (heureFinReelle) payload.heure_fin_reelle = heureFinReelle;
        if (nbEtudiants) payload.nombre_etudiants = parseInt(nbEtudiants, 10);
      }

      const response = await fetch(`${API_BASE}/${session.id_session}/statut`, {
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-surface-dark/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => !saving && onClose()}>
      <div className="card p-0 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 space-y-5">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white tracking-tight">Mettre à jour la session</h2>
          
          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5">
                <AlertTriangle className="h-3 w-3" />
              </div>
              <span>{error}</span>
            </div>
          )}

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-2 border border-slate-200/70 dark:border-slate-700 text-sm">
            <p><span className="text-slate-500 dark:text-slate-400">Salle:</span> <span className="font-medium text-slate-800 dark:text-white">{session.salle?.numero}</span></p>
            <p><span className="text-slate-500 dark:text-slate-400">Cours:</span> <span className="font-medium text-slate-800 dark:text-white">{session.cours?.nom}</span></p>
            <p><span className="text-slate-500 dark:text-slate-400">Prévu:</span> <span className="font-medium text-slate-800 dark:text-white tabular-nums">{formatTimeFr(session.heure_debut)} - {formatTimeFr(session.heure_fin)}</span></p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Statut de la session</label>
              <select value={statut} onChange={e => setStatut(e.target.value as StatutSession)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent">
                {STATUT_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>

            {statut === 'En_Cours' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Heure de début réelle</label>
                <input type="time" value={heureDebutReelle} onChange={e => setHeureDebutReelle(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent tabular-nums" />
              </div>
            )}

            {statut === 'Terminee' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Heure de fin réelle</label>
                  <input type="time" value={heureFinReelle} onChange={e => setHeureFinReelle(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent tabular-nums" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Nb. Étudiants (Présence)</label>
                  <input type="number" min="0" value={nbEtudiants} onChange={e => setNbEtudiants(e.target.value)} placeholder="Ex: 24" className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent tabular-nums" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200/70 dark:border-slate-800 sticky bottom-0 bg-card dark:bg-card-dark rounded-b-card">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50">Annuler</button>
          <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-soft hover:shadow-soft-hover transition-all disabled:opacity-60 disabled:cursor-not-allowed">
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
      const response = await fetch(API_BASE);
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
    <div className="sc-portal min-h-screen p-6 md:p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center gap-3 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/30">
            <Activity className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Sessions de Salles (Smart Campus)</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Suivi en temps réel de l'occupation des salles de cours.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card p-5">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Toutes les sessions</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/30">
                <Calendar className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{sessions.length}</p>
          </div>
          <div className="card p-5">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">En Cours actuellement</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
                <Play className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{enCours}</p>
          </div>
          <div className="card p-5">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Sessions Terminées</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
                <CheckSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{terminees}</p>
          </div>
        </div>

        <div className="card p-4 mb-6 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Rechercher salle, cours ou prof..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark text-slate-800 dark:text-white placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent" />
          </div>
          <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)} className="md:w-48 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark text-slate-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent">
            <option value="">Tous les statuts</option>
            {STATUT_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-soft hover:shadow-soft-hover transition-all whitespace-nowrap">
            <Plus className="h-4 w-4" /> Planifier Session
          </button>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/70 dark:divide-slate-800">
              <thead className="bg-surface dark:bg-surface-dark/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Salle & Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cours & Professeur</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Horaires Prévus</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Réalité (Smart Tracking)</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary-500 dark:text-primary-400" /></td></tr>
                ) : filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30 mx-auto mb-2">
                        <Activity className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Aucune session trouvée.</p>
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map((s) => {
                    const prof = s.professeur?.employe?.utilisateur;
                    return (
                      <tr key={s.id_session} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-white">
                            <div className="flex h-5 w-5 items-center justify-center rounded bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                              <MapPin className="h-3.5 w-3.5" />
                            </div>
                            {s.salle?.numero}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">{formatDateFr(s.date)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-white">
                            <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                              <BookOpen className="h-3.5 w-3.5" />
                            </div>
                            {s.cours?.nom || 'Inconnu'}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <div className="flex h-4 w-4 items-center justify-center rounded bg-slate-100 dark:bg-slate-800">
                              <User className="h-2.5 w-2.5" />
                            </div>
                            {prof ? `${prof.prenom} ${prof.nom}` : 'Non assigné'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              <Clock className="h-3.5 w-3.5" />
                            </div>
                            {formatTimeFr(s.heure_debut)} - {formatTimeFr(s.heure_fin)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 tabular-nums">
                          {s.heure_debut_reelle ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs">Début: <span className="font-semibold text-slate-800 dark:text-white">{formatTimeFr(s.heure_debut_reelle)}</span></span>
                              {s.heure_fin_reelle && <span className="text-xs">Fin: <span className="font-semibold text-slate-800 dark:text-white">{formatTimeFr(s.heure_fin_reelle)}</span></span>}
                              {s.nombre_etudiants !== null && s.nombre_etudiants !== undefined && (
                                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full w-max mt-1 border border-slate-200 dark:border-slate-700">
                                  {s.nombre_etudiants} présents
                                </span>
                              )}
                            </div>
                          ) : <span className="text-slate-400 dark:text-slate-500 italic">En attente...</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatutBadgeClasses(s.statut)}`}>
                            {s.statut.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button onClick={() => setSessionToUpdate(s)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
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