import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Loader2,
  X,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  User,
  Hash,
  MessageSquare,
  CalendarClock,
  Pencil,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

type StatutConsultation =
  | 'Demandee'
  | 'Acceptee'
  | 'Rejetee'
  | 'Planifiee'
  | 'Consultee'
  | 'Cloturee';

interface Utilisateur {
  nom: string;
  prenom: string;
}

interface Etudiant {
  cne: string;
  utilisateur: Utilisateur;
}

interface Consultation {
  id_verification: string;
  date_demande: string;
  motif: string;
  statut: StatutConsultation;
  date_planification: string | null;
  heure_planification: string | null;
  salle_planification: string | null;
  commentaires_prof: string | null;
  etudiant: Etudiant;
}

interface ApiListResponse {
  success: boolean;
  count: number;
  data: Consultation[];
}

interface ApiSingleResponse {
  success: boolean;
  message?: string;
  data: Consultation;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const API_BASE = 'http://localhost:3000/api/enseignant';

const STATUT_OPTIONS: StatutConsultation[] = [
  'Demandee',
  'Acceptee',
  'Rejetee',
  'Planifiee',
  'Consultee',
  'Cloturee',
];

// Statuses for which scheduling fields (date/heure/salle) are relevant
const SCHEDULING_STATUTS: StatutConsultation[] = ['Acceptee', 'Planifiee'];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const formatDateFr = (isoDate: string | null | undefined): string => {
  if (!isoDate) return '—';
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

// Converts an ISO datetime (or plain "HH:mm:ss") string to "HH:mm" for display
const formatHeureFr = (value: string | null | undefined): string => {
  if (!value) return '—';
  try {
    // Handle full ISO datetime strings (e.g. "1970-01-01T10:30:00.000Z")
    if (value.includes('T')) {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return value;
      return d.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      });
    }
    // Handle plain "HH:mm:ss" or "HH:mm" strings
    const parts = value.split(':');
    if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
    return value;
  } catch {
    return value;
  }
};

// Converts an ISO date string to "yyyy-MM-dd" for an <input type="date">
const toDateInputValue = (value: string | null | undefined): string => {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

// Converts a stored time value to "HH:mm" for an <input type="time">
const toTimeInputValue = (value: string | null | undefined): string => {
  if (!value) return '';
  try {
    if (value.includes('T')) {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return '';
      const hh = String(d.getUTCHours()).padStart(2, '0');
      const mm = String(d.getUTCMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    const parts = value.split(':');
    if (parts.length >= 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    return '';
  } catch {
    return '';
  }
};

const formatStatutLabel = (statut: StatutConsultation): string => {
  const map: Record<StatutConsultation, string> = {
    Demandee: 'Demandée',
    Acceptee: 'Acceptée',
    Rejetee: 'Rejetée',
    Planifiee: 'Planifiée',
    Consultee: 'Consultée',
    Cloturee: 'Clôturée',
  };
  return map[statut] ?? statut;
};

const getStatutBadgeClasses = (statut: StatutConsultation): string => {
  const map: Record<StatutConsultation, string> = {
    Demandee: 'bg-blue-100 text-blue-700 border border-blue-200',
    Acceptee: 'bg-green-100 text-green-700 border border-green-200',
    Planifiee: 'bg-green-100 text-green-700 border border-green-200',
    Rejetee: 'bg-red-100 text-red-700 border border-red-200',
    Consultee: 'bg-gray-100 text-gray-600 border border-gray-200',
    Cloturee: 'bg-gray-100 text-gray-600 border border-gray-200',
  };
  return map[statut] ?? 'bg-gray-100 text-gray-600 border border-gray-200';
};

// ─────────────────────────────────────────────────────────────
// Toast Container
// ─────────────────────────────────────────────────────────────

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
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
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-current opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Processing Modal ("Planifier la consultation")
// ─────────────────────────────────────────────────────────────

function PlanifierModal({
  consultation,
  onClose,
  onSaved,
  pushToast,
}: {
  consultation: Consultation;
  onClose: () => void;
  onSaved: () => Promise<void>;
  pushToast: (type: Toast['type'], message: string) => void;
}) {
  const [statut, setStatut] = useState<StatutConsultation>(consultation.statut);
  const [datePlanification, setDatePlanification] = useState(
    toDateInputValue(consultation.date_planification)
  );
  const [heurePlanification, setHeurePlanification] = useState(
    toTimeInputValue(consultation.heure_planification)
  );
  const [sallePlanification, setSallePlanification] = useState(
    consultation.salle_planification || ''
  );
  const [commentairesProf, setCommentairesProf] = useState(
    consultation.commentaires_prof || ''
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const nom = consultation.etudiant?.utilisateur?.nom || 'N/A';
  const prenom = consultation.etudiant?.utilisateur?.prenom || 'N/A';
  const cne = consultation.etudiant?.cne || 'N/A';

  const requiresScheduling = SCHEDULING_STATUTS.includes(statut);

  const handleSubmit = async () => {
    setFormError(null);

    if (requiresScheduling) {
      if (!datePlanification) {
        setFormError('La date de planification est requise pour ce statut.');
        return;
      }
      if (!heurePlanification) {
        setFormError("L'heure de planification est requise pour ce statut.");
        return;
      }
      if (!sallePlanification.trim()) {
        setFormError('La salle de planification est requise pour ce statut.');
        return;
      }
    }

    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        statut,
        commentaires_prof: commentairesProf.trim() || undefined,
      };

      // Only send scheduling fields if relevant/filled, so we don't
      // accidentally clear existing values on unrelated status changes
      // (e.g. simply rejecting a request).
      if (datePlanification) payload.date_planification = datePlanification;
      if (heurePlanification) payload.heure_planification = heurePlanification;
      if (sallePlanification.trim()) payload.salle_planification = sallePlanification.trim();

      const response = await fetch(
        `${API_BASE}/consultations/${consultation.id_verification}/planifier`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const json: ApiSingleResponse = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(
          (json as any).message || `Erreur serveur (code ${response.status})`
        );
      }

      pushToast('success', json.message || 'Consultation mise à jour avec succès.');
      await onSaved();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de la mise à jour de la consultation.';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-xl z-10">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Planifier la consultation
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {prenom} {nom} • CNE: {cne}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 space-y-5">
          {formError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Context: student / request date / current status */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Étudiant
              </span>
              <span className="text-sm text-gray-700">
                {prenom} {nom}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5" />
                CNE
              </span>
              <span className="text-sm text-gray-700">{cne}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Date de demande
              </span>
              <span className="text-sm text-gray-700">
                {formatDateFr(consultation.date_demande)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Statut actuel
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatutBadgeClasses(
                  consultation.statut
                )}`}
              >
                {formatStatutLabel(consultation.statut)}
              </span>
            </div>
          </div>

          {/* Motif (read-only) */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Motif de la demande
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {consultation.motif}
              </p>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Processing form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Nouveau statut
              </label>
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value as StatutConsultation)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white"
              >
                {STATUT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {formatStatutLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            <div
              className={`grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg p-3 transition-colors ${
                requiresScheduling ? 'bg-indigo-50/50 border border-indigo-100' : ''
              }`}
            >
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Date {requiresScheduling && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="date"
                  value={datePlanification}
                  onChange={(e) => setDatePlanification(e.target.value)}
                  disabled={!requiresScheduling}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Heure {requiresScheduling && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="time"
                  value={heurePlanification}
                  onChange={(e) => setHeurePlanification(e.target.value)}
                  disabled={!requiresScheduling}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  Salle {requiresScheduling && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={sallePlanification}
                  onChange={(e) => setSallePlanification(e.target.value)}
                  disabled={!requiresScheduling}
                  placeholder="Ex: Salle B204"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Commentaires{' '}
                <span className="normal-case font-normal text-gray-400">(optionnel)</span>
              </label>
              <textarea
                value={commentairesProf}
                onChange={(e) => setCommentairesProf(e.target.value)}
                rows={3}
                placeholder="Ajouter une note pour l'étudiant..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-xl">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────

export default function PlanificationConsultations() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('');

  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((type: Toast['type'], message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ── Fetch consultations ──
  const fetchConsultations = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/consultations`, { signal });

      if (!response.ok) {
        throw new Error(`Erreur serveur (code ${response.status})`);
      }

      const json: ApiListResponse = await response.json();

      if (!json.success) {
        throw new Error('La requête a échoué côté serveur.');
      }

      setConsultations(json.data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message =
        err instanceof Error
          ? err.message
          : 'Impossible de contacter le serveur. Vérifiez que le backend est démarré.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchConsultations(controller.signal);
    return () => controller.abort();
  }, [fetchConsultations]);

  // ── Client-side filtering (safe nested access throughout) ──
  const filteredConsultations = consultations.filter((c) => {
    const nom = c.etudiant?.utilisateur?.nom || '';
    const prenom = c.etudiant?.utilisateur?.prenom || '';
    const cne = c.etudiant?.cne || '';
    const searchTarget = `${prenom} ${nom} ${cne}`.toLowerCase();

    const matchesSearch =
      !searchInput.trim() || searchTarget.includes(searchInput.trim().toLowerCase());
    const matchesStatut = !statutFilter || c.statut === statutFilter;

    return matchesSearch && matchesStatut;
  });

  // ───────────────────────────────────────────────────────────
  // Error State (full page, only when nothing has loaded yet)
  // ───────────────────────────────────────────────────────────

  if (error && !loading && consultations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-md border border-red-100 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-7 w-7 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Erreur de chargement
          </h2>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => fetchConsultations()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex items-center gap-3 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100">
            <CalendarClock className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Planification des Consultations
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Traitez les demandes de consultation de copies d'examen des étudiants.
            </p>
          </div>
        </header>

        {/* Filter bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher par nom d'étudiant ou CNE..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>

          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value)}
            className="md:w-56 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white"
          >
            <option value="">Tous les statuts</option>
            {STATUT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {formatStatutLabel(s)}
              </option>
            ))}
          </select>
        </div>

        {/* Inline error banner (shown if a retry fails but stale data remains) */}
        {error && !loading && consultations.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 flex-1">{error}</p>
            <button
              onClick={() => fetchConsultations()}
              className="text-sm font-medium text-red-700 hover:text-red-800 underline flex-shrink-0"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Étudiant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Motif
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date demande
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Planification
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-gray-100 rounded-full animate-pulse" />
                          <div className="space-y-1.5">
                            <div className="h-3.5 w-28 bg-gray-100 rounded animate-pulse" />
                            <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-20 bg-gray-100 rounded animate-pulse ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredConsultations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <CalendarClock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">
                        Aucune consultation ne correspond aux critères sélectionnés.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredConsultations.map((c) => {
                    const nom = c.etudiant?.utilisateur?.nom || 'N/A';
                    const prenom = c.etudiant?.utilisateur?.prenom || 'N/A';
                    const cne = c.etudiant?.cne || 'N/A';
                    const hasScheduling = Boolean(
                      c.date_planification || c.heure_planification || c.salle_planification
                    );

                    return (
                      <tr key={c.id_verification} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                              {prenom?.[0]}
                              {nom?.[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {prenom} {nom}
                              </p>
                              <p className="text-xs text-gray-400">CNE: {cne}</p>
                            </div>
                          </div>
                        </td>
                        <td
                          className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate"
                          title={c.motif}
                        >
                          {c.motif}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateFr(c.date_demande)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {hasScheduling ? (
                            <div className="text-sm text-gray-600 space-y-0.5">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                {formatDateFr(c.date_planification)}
                                <Clock className="h-3 w-3 text-gray-400 ml-1" />
                                {formatHeureFr(c.heure_planification)}
                              </span>
                              {c.salle_planification && (
                                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                                  <MapPin className="h-3 w-3" />
                                  {c.salle_planification}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 italic">Non planifiée</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatutBadgeClasses(
                              c.statut
                            )}`}
                          >
                            {formatStatutLabel(c.statut)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => setSelectedConsultation(c)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                            Traiter
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

      {/* Processing Modal */}
      {selectedConsultation && (
        <PlanifierModal
          consultation={selectedConsultation}
          onClose={() => setSelectedConsultation(null)}
          onSaved={() => fetchConsultations()}
          pushToast={pushToast}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}