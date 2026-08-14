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
    // Prisma renvoie les TIME sous forme de date complète (ex: 1970-01-01T14:30:00Z)
    return new Date(isoTime).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC' // Assure qu'on lit l'heure exacte stockée sans décalage local
    });
  } catch {
    return isoTime;
  }
};

const getStatutBadgeClasses = (statut: StatutReservation): string => {
  const map: Record<StatutReservation, string> = {
    Demandee: 'bg-blue-100 text-blue-700 border border-blue-200',
    Approuvee: 'bg-green-100 text-green-700 border border-green-200',
    Rejetee: 'bg-red-100 text-red-700 border border-red-200',
    Annulee: 'bg-gray-100 text-gray-600 border border-gray-200',
  };
  return map[statut] ?? 'bg-gray-100 text-gray-600 border border-gray-200';
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
            toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          )}
          <p className="text-sm flex-1">{toast.message}</p>
          <button onClick={() => onDismiss(toast.id)} className="opacity-60 hover:opacity-100">
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
    id_demandeur: '', // Idéalement, cela vient du contexte utilisateur connecté
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && onClose()}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Nouvelle Réservation</h2>
          <button onClick={onClose} disabled={saving} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {formError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Salle</label>
            <select
              value={form.id_salle}
              onChange={(e) => setForm({ ...form, id_salle: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
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
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">ID Demandeur (UUID temporaire)</label>
            <input
              type="text"
              value={form.id_demandeur}
              onChange={(e) => setForm({ ...form, id_demandeur: e.target.value })}
              placeholder="Ex: 123e4567-e89b-12d3-a456-426614174000"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">À remplacer plus tard par l'ID de l'utilisateur connecté.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Heure de début</label>
              <input
                type="time"
                value={form.heure_debut}
                onChange={(e) => setForm({ ...form, heure_debut: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Heure de fin</label>
              <input
                type="time"
                value={form.heure_fin}
                onChange={(e) => setForm({ ...form, heure_fin: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Motif</label>
            <textarea
              value={form.motif}
              onChange={(e) => setForm({ ...form, motif: e.target.value })}
              rows={3}
              placeholder="Ex: Réunion du club d'informatique..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && onClose()}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Traiter la demande</h2>
          
          {error && (
            <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Salle:</span>
              <span className="font-medium text-gray-800">{reservation.salle?.numero} {reservation.salle?.nom ? `(${reservation.salle.nom})` : ''}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Demandeur:</span>
              <span className="font-medium text-gray-800">{reservation.demandeur?.prenom} {reservation.demandeur?.nom}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Créneau:</span>
              <span className="font-medium text-gray-800">{formatDateFr(reservation.date)} de {formatTimeFr(reservation.heure_debut)} à {formatTimeFr(reservation.heure_fin)}</span>
            </div>
            <div className="flex flex-col text-sm pt-2 border-t border-gray-200">
              <span className="text-gray-500 mb-1">Motif:</span>
              <p className="text-gray-800 italic">"{reservation.motif}"</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Décision</label>
            <select
              value={statut}
              onChange={(e) => setStatut(e.target.value as StatutReservation)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
            >
              {STATUT_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Annuler</button>
          <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
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

  // Client filtering
  const filteredReservations = reservations.filter((r) => {
    const salleName = `${r.salle?.numero} ${r.salle?.nom}`.toLowerCase();
    const demandeurName = `${r.demandeur?.prenom} ${r.demandeur?.nom}`.toLowerCase();
    const matchesSearch = !searchInput.trim() || salleName.includes(searchInput.toLowerCase()) || demandeurName.includes(searchInput.toLowerCase());
    const matchesStatut = !statutFilter || r.statut === statutFilter;
    return matchesSearch && matchesStatut;
  });

  // KPIs
  const demandesEnAttente = reservations.filter(r => r.statut === 'Demandee').length;
  const approuvees = reservations.filter(r => r.statut === 'Approuvee').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="flex items-center gap-3 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100">
            <MapPin className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Réservation de Salles</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gérez l'attribution des espaces du campus.</p>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Demandes en attente</p>
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{demandesEnAttente}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Réservations Approuvées</p>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{approuvees}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Salles enregistrées</p>
              <MapPin className="h-5 w-5 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{salles.length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher salle ou demandeur..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value)}
            className="md:w-48 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            <option value="">Tous les statuts</option>
            {STATUT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
          >
            <Plus className="h-4 w-4" /> Nouvelle Réservation
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Salle</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Demandeur</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Créneau</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Motif</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></td></tr>
                ) : filteredReservations.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Aucune réservation trouvée.</td></tr>
                ) : (
                  filteredReservations.map((r) => (
                    <tr key={r.id_reservation} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                        {r.salle?.numero} {r.salle?.nom ? `(${r.salle.nom})` : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <User className="h-4 w-4 text-gray-400" />
                          {r.demandeur?.prenom} {r.demandeur?.nom}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {formatDateFr(r.date)}</div>
                        <div className="flex items-center gap-1.5 mt-1 text-xs"><Clock className="h-3.5 w-3.5" /> {formatTimeFr(r.heure_debut)} - {formatTimeFr(r.heure_fin)}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-[200px]" title={r.motif}>
                        <div className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 flex-shrink-0" /> <span className="truncate">{r.motif}</span></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatutBadgeClasses(r.statut)}`}>
                          {r.statut}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setReservationToProcess(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
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