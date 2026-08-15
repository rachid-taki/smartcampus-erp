import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapPin,
  Clock,
  Calendar,
  CheckCircle,
  X,
  AlertTriangle,
  RefreshCw,
  Search,
  Plus,
  Shield,
  Loader2,
  FileText,
  User
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

type StatutReservation = 'Demandee' | 'Approuvee' | 'Rejetee' | 'Annulee';

interface Salle {
  id_salle: string;
  numero: string;
  nom: string | null;
  capacite: number;
  type: string;
  statut: string;
}

interface Demandeur {
  nom: string;
  prenom: string;
  email: string;
}

interface Reservation {
  id_reservation: string;
  id_salle: string;
  id_demandeur: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  motif: string;
  statut: StatutReservation;
  salle?: {
    numero: string;
    nom: string | null;
    capacite: number;
  };
  demandeur?: Demandeur;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const API_BASE = 'http://localhost:3000/api';
const STATUT_OPTIONS: StatutReservation[] = ['Demandee', 'Approuvee', 'Rejetee', 'Annulee'];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const formatDateFr = (isoDate: string): string => {
  if (!isoDate) return 'N/A';
  try {
    return new Date(isoDate).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
};

const formatTimeFr = (isoTime: string): string => {
  if (!isoTime) return 'N/A';
  try {
    return new Date(isoTime).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    });
  } catch {
    return isoTime;
  }
};

const getStatutBadgeClasses = (statut: StatutReservation): string => {
  const map: Record<StatutReservation, string> = {
    Demandee: 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800',
    Approuvee: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800',
    Rejetee: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800',
    Annulee: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
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
            toast.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
          }`}
        >
          <div className={`flex h-6 w-6 items-center justify-center rounded-full flex-shrink-0 mt-0.5 ${
            toast.type === 'success' 
              ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' 
              : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
          }`}>
            {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          </div>
          <p className="text-sm flex-1">{toast.message}</p>
          <button onClick={() => onDismiss(toast.id)} className="opacity-60 hover:opacity-100 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Create Reservation Modal
// ─────────────────────────────────────────────────────────────

function CreateReservationModal({
  salles,
  onClose,
  onSaved,
  pushToast,
}: {
  salles: Salle[];
  onClose: () => void;
  onSaved: () => Promise<void>;
  pushToast: (type: Toast['type'], message: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState({
    id_salle: '',
    id_demandeur: '',
    date: '',
    heure_debut: '',
    heure_fin: '',
    motif: '',
  });

  const handleSubmit = async () => {
    setFormError(null);

    if (!form.id_salle || !form.id_demandeur || !form.date || !form.heure_debut || !form.heure_fin || !form.motif) {
      setFormError('Tous les champs sont obligatoires.');
      return;
    }

    if (form.heure_fin <= form.heure_debut) {
      setFormError("L'heure de fin doit être postérieure à l'heure de début.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Erreur serveur');
      }

      pushToast('success', 'Réservation créée avec succès.');
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
      <div className="card p-0 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/70 dark:border-slate-800 sticky top-0 bg-card dark:bg-card-dark rounded-t-card z-10">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white tracking-tight">Nouvelle Réservation</h2>
          <button onClick={onClose} disabled={saving} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
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
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Salle</label>
            <select
              value={form.id_salle}
              onChange={(e) => setForm({ ...form, id_salle: e.target.value })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            >
              <option value="">-- Sélectionner une salle --</option>
              {salles.map((s) => (
                <option key={s.id_salle} value={s.id_salle}>
                  {s.numero} {s.nom ? `- ${s.nom}` : ''} (Capacité: {s.capacite})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">ID Demandeur (UUID temporaire)</label>
            <input
              type="text"
              value={form.id_demandeur}
              onChange={(e) => setForm({ ...form, id_demandeur: e.target.value })}
              placeholder="Ex: 123e4567-e89b-12d3-a456-426614174000"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">À remplacer plus tard par l'ID de l'utilisateur connecté.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Heure de début</label>
              <input
                type="time"
                value={form.heure_debut}
                onChange={(e) => setForm({ ...form, heure_debut: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Heure de fin</label>
              <input
                type="time"
                value={form.heure_fin}
                onChange={(e) => setForm({ ...form, heure_fin: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Motif</label>
            <textarea
              value={form.motif}
              onChange={(e) => setForm({ ...form, motif: e.target.value })}
              rows={3}
              placeholder="Ex: Réunion du club d'informatique..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200/70 dark:border-slate-800 sticky bottom-0 bg-card dark:bg-card-dark rounded-b-card">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-soft hover:shadow-soft-hover transition-all disabled:opacity-60 disabled:cursor-not-allowed">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Créer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Process Reservation Modal (Validation)
// ─────────────────────────────────────────────────────────────

function ProcessReservationModal({
  reservation,
  onClose,
  onSaved,
  pushToast,
}: {
  reservation: Reservation;
  onClose: () => void;
  onSaved: () => Promise<void>;
  pushToast: (type: Toast['type'], message: string) => void;
}) {
  const [statut, setStatut] = useState<StatutReservation>(reservation.statut);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/reservations/${reservation.id_reservation}/statut`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message);

      pushToast('success', 'Statut mis à jour.');
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
      <div className="card p-0 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 space-y-5">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white tracking-tight">Traiter la demande</h2>
          
          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5">
                <AlertTriangle className="h-3 w-3" />
              </div>
              <span>{error}</span>
            </div>
          )}

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3 border border-slate-200/70 dark:border-slate-700">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Salle:</span>
              <span className="font-medium text-slate-800 dark:text-white text-right ml-4">{reservation.salle?.numero} {reservation.salle?.nom ? `(${reservation.salle.nom})` : ''}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Demandeur:</span>
              <span className="font-medium text-slate-800 dark:text-white">{reservation.demandeur?.prenom} {reservation.demandeur?.nom}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Créneau:</span>
              <span className="font-medium text-slate-800 dark:text-white text-right ml-4 tabular-nums">
                {formatDateFr(reservation.date)} <br className="sm:hidden" />
                <span className="text-slate-500 dark:text-slate-400 font-normal">de</span> {formatTimeFr(reservation.heure_debut)} <span className="text-slate-500 dark:text-slate-400 font-normal">à</span> {formatTimeFr(reservation.heure_fin)}
              </span>
            </div>
            <div className="flex flex-col text-sm pt-3 border-t border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400 mb-1.5 text-xs font-semibold uppercase tracking-wide">Motif:</span>
              <p className="text-slate-800 dark:text-white italic leading-relaxed">"{reservation.motif}"</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Décision</label>
            <select
              value={statut}
              onChange={(e) => setStatut(e.target.value as StatutReservation)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            >
              {STATUT_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200/70 dark:border-slate-800 sticky bottom-0 bg-card dark:bg-card-dark rounded-b-card">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50">Annuler</button>
          <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-soft hover:shadow-soft-hover transition-all disabled:opacity-60 disabled:cursor-not-allowed">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function ReservationSalles() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [salles, setSalles] = useState<Salle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [statutFilter, setStatutFilter] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [reservationToProcess, setReservationToProcess] = useState<Reservation | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((type: Toast['type'], message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resReq, sallesReq] = await Promise.all([
        fetch(`${API_BASE}/reservations`),
        fetch(`${API_BASE}/salles`)
      ]);

      const resJson = await resReq.json();
      const sallesJson = await sallesReq.json();

      if (!resReq.ok) throw new Error(resJson.message || 'Erreur réservations');
      if (!sallesReq.ok) throw new Error(sallesJson.message || 'Erreur salles');

      setReservations(resJson.data || []);
      setSalles(sallesJson.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredReservations = reservations.filter((r) => {
    const salleName = `${r.salle?.numero} ${r.salle?.nom || ''}`.toLowerCase();
    const demandeurName = `${r.demandeur?.prenom || ''} ${r.demandeur?.nom || ''}`.toLowerCase();
    const matchesSearch = !searchInput.trim() || salleName.includes(searchInput.toLowerCase()) || demandeurName.includes(searchInput.toLowerCase());
    const matchesStatut = !statutFilter || r.statut === statutFilter;
    return matchesSearch && matchesStatut;
  });

  const demandesEnAttente = reservations.filter(r => r.statut === 'Demandee').length;
  const approuvees = reservations.filter(r => r.statut === 'Approuvee').length;

  return (
    <div className="sc-portal min-h-screen p-6 md:p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="flex items-center gap-3 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/30">
            <MapPin className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Réservation de Salles</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Gérez l'attribution des espaces du campus.</p>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card p-5">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Demandes en attente</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{demandesEnAttente}</p>
          </div>
          <div className="card p-5">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Réservations Approuvées</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{approuvees}</p>
          </div>
          <div className="card p-5">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Salles enregistrées</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/30">
                <MapPin className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{salles.length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher salle ou demandeur..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark text-slate-800 dark:text-white placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            />
          </div>
          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value)}
            className="md:w-48 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark text-slate-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          >
            <option value="">Tous les statuts</option>
            {STATUT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-soft hover:shadow-soft-hover transition-all whitespace-nowrap"
          >
            <Plus className="h-4 w-4" /> Nouvelle Réservation
          </button>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/70 dark:divide-slate-800">
              <thead className="bg-surface dark:bg-surface-dark/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Salle</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Demandeur</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Créneau</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Motif</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary-500 dark:text-primary-400" /></td></tr>
                ) : filteredReservations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30 mx-auto mb-2">
                        <MapPin className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Aucune réservation trouvée.</p>
                    </td>
                  </tr>
                ) : (
                  filteredReservations.map((r) => (
                    <tr key={r.id_reservation} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-white">
                        {r.salle?.numero} {r.salle?.nom ? `(${r.salle.nom})` : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
                          <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            <User className="h-3.5 w-3.5" />
                          </div>
                          {r.demandeur?.prenom} {r.demandeur?.nom}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            <Calendar className="h-3.5 w-3.5" />
                          </div>
                          {formatDateFr(r.date)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-xs">
                          <div className="flex h-4 w-4 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            <Clock className="h-3 w-3" />
                          </div>
                          {formatTimeFr(r.heure_debut)} - {formatTimeFr(r.heure_fin)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-[200px]" title={r.motif}>
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex-shrink-0">
                            <FileText className="h-3.5 w-3.5" />
                          </div> 
                          <span className="truncate">{r.motif}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatutBadgeClasses(r.statut)}`}>
                          {r.statut}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setReservationToProcess(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                        >
                          <Shield className="h-4 w-4" /> Traiter
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateReservationModal salles={salles} onClose={() => setShowCreateModal(false)} onSaved={fetchData} pushToast={pushToast} />
      )}

      {reservationToProcess && (
        <ProcessReservationModal reservation={reservationToProcess} onClose={() => setReservationToProcess(null)} onSaved={fetchData} pushToast={pushToast} />
      )}

      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts(t => t.filter(x => x.id !== id))} />
    </div>
  );
}