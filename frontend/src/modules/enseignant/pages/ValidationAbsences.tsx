import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Loader2,
  X,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Pencil,
  Paperclip,
  FileText,
  Calendar,
  Clock,
  User,
  Hash,
  BookOpen,
  ClipboardCheck,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

type StatutAbsence =
  | 'Non_Justifiee'
  | 'Justifiee'
  | 'En_Attente_Validation'
  | 'Signalee_Par_Erreur';

interface Utilisateur {
  nom: string;
  prenom: string;
  CNE: string;
}

interface Etudiant {
  utilisateur: Utilisateur;
}

interface Cours {
  nom_cours: string;
}

interface SessionSalle {
  cours?: Cours;
}

interface Absence {
  id_absence: string;
  date_heure: string;
  statut: StatutAbsence;
  justificatif: string | null;
  remarques: string | null;
  etudiant: Etudiant;
  session_salle?: SessionSalle;
}

interface ApiListResponse {
  success: boolean;
  count: number;
  data: Absence[];
}

interface ApiSingleResponse {
  success: boolean;
  message?: string;
  data: Absence;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const API_BASE = 'http://localhost:3000/api/enseignant';

const STATUT_OPTIONS: StatutAbsence[] = [
  'Non_Justifiee',
  'Justifiee',
  'En_Attente_Validation',
  'Signalee_Par_Erreur',
];

// Statuses a teacher can set from the processing modal (validation
// outcomes) — 'En_Attente_Validation' is an entry state, not a decision.
const DECISION_STATUT_OPTIONS: StatutAbsence[] = [
  'Justifiee',
  'Non_Justifiee',
  'Signalee_Par_Erreur',
];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const formatDateFr = (isoDate: string): string => {
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

const formatTimeFr = (isoDate: string): string => {
  try {
    return new Date(isoDate).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const formatStatutLabel = (statut: StatutAbsence): string => {
  const map: Record<StatutAbsence, string> = {
    Non_Justifiee: 'Non justifiée',
    Justifiee: 'Justifiée',
    En_Attente_Validation: 'En attente de validation',
    Signalee_Par_Erreur: 'Signalée par erreur',
  };
  return map[statut] ?? statut.replace(/_/g, ' ');
};

const getStatutBadgeClasses = (statut: StatutAbsence): string => {
  const map: Record<StatutAbsence, string> = {
    En_Attente_Validation: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    Justifiee: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800',
    Non_Justifiee: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800',
    Signalee_Par_Erreur: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  };
  return map[statut] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
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
          className={`flex items-start gap-3 rounded-lg shadow-lg border p-4 animate-fade-in ${
            toast.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
          }`}
        >
          {toast.type === 'success' ? (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5">
              <CheckCircle className="h-4 w-4" />
            </div>
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5">
              <AlertTriangle className="h-4 w-4" />
            </div>
          )}
          <p className="text-sm flex-1">{toast.message}</p>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-current opacity-60 hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Processing Modal ("Traiter l'absence")
// ─────────────────────────────────────────────────────────────

function ProcessAbsenceModal({
  absence,
  onClose,
  onSaved,
  pushToast,
}: {
  absence: Absence;
  onClose: () => void;
  onSaved: () => Promise<void>;
  pushToast: (type: Toast['type'], message: string) => void;
}) {
  const [selectedStatut, setSelectedStatut] = useState<StatutAbsence>(
    absence.statut === 'En_Attente_Validation' ? 'Justifiee' : absence.statut
  );
  const [remarques, setRemarques] = useState<string>(absence.remarques || '');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const nom = absence.etudiant?.utilisateur?.nom || 'N/A';
  const prenom = absence.etudiant?.utilisateur?.prenom || 'N/A';
  const cne = absence.etudiant?.utilisateur?.CNE || 'N/A';
  const nomCours = absence.session_salle?.cours?.nom_cours || 'N/A';

  const handleSubmit = async () => {
    setFormError(null);
    setSaving(true);

    try {
      const response = await fetch(
        `${API_BASE}/absences/${absence.id_absence}/statut`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            statut: selectedStatut,
            remarques: remarques.trim() || undefined,
          }),
        }
      );

      const json: ApiSingleResponse = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(
          (json as any).message || `Erreur serveur (code ${response.status})`
        );
      }

      pushToast('success', json.message || 'Absence mise à jour avec succès.');
      await onSaved();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de la mise à jour de l'absence.";
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-surface-dark/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={() => !saving && onClose()}
    >
      <div
        className="card p-0 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200/70 dark:border-slate-800 sticky top-0 bg-card dark:bg-card-dark rounded-t-card z-10">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white tracking-tight">
              Traiter l'absence
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {prenom} {nom} • CNE: <span className="tabular-nums">{cne}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-50 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 space-y-5">
          {formError && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5">
                <AlertTriangle className="h-3 w-3" />
              </div>
              <span>{formError}</span>
            </div>
          )}

          {/* Context: student / course / date / justificatif / current status */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-700">
                  <User className="h-3.5 w-3.5" />
                </div>
                Étudiant
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-200">
                {prenom} {nom}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-700">
                  <Hash className="h-3.5 w-3.5" />
                </div>
                CNE
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-200 tabular-nums">{cne}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-700">
                  <BookOpen className="h-3.5 w-3.5" />
                </div>
                Cours
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-200">{nomCours}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-700">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
                Date & Heure
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-200 tabular-nums">
                {formatDateFr(absence.date_heure)} à {formatTimeFr(absence.date_heure)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-700">
                  <Paperclip className="h-3.5 w-3.5" />
                </div>
                Justificatif
              </span>
              {absence.justificatif ? (
                <a
                  href={absence.justificatif}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-primary-50 dark:bg-primary-900/30">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  Voir le document
                </a>
              ) : (
                <span className="text-sm text-slate-500 dark:text-slate-400 italic">Aucun</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Statut actuel
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatutBadgeClasses(
                  absence.statut
                )}`}
              >
                {formatStatutLabel(absence.statut)}
              </span>
            </div>
          </div>

          <hr className="border-slate-200/70 dark:border-slate-800" />

          {/* Decision form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Nouveau statut
              </label>
              <select
                value={selectedStatut}
                onChange={(e) => setSelectedStatut(e.target.value as StatutAbsence)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              >
                {DECISION_STATUT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {formatStatutLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Remarques{' '}
                <span className="normal-case font-normal text-slate-400 dark:text-slate-500">
                  (optionnel — ex: "Justificatif illisible")
                </span>
              </label>
              <textarea
                value={remarques}
                onChange={(e) => setRemarques(e.target.value)}
                rows={4}
                placeholder="Ajouter une remarque..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200/70 dark:border-slate-800 sticky bottom-0 bg-card dark:bg-card-dark rounded-b-card">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-soft hover:shadow-soft-hover transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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

export default function ValidationAbsences() {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('');

  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);

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

  // ── Fetch absences ──
  const fetchAbsences = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/absences`, { signal });

      if (!response.ok) {
        throw new Error(`Erreur serveur (code ${response.status})`);
      }

      const json: ApiListResponse = await response.json();

      if (!json.success) {
        throw new Error('La requête a échoué côté serveur.');
      }

      setAbsences(json.data);
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
    fetchAbsences(controller.signal);
    return () => controller.abort();
  }, [fetchAbsences]);

  // ── Client-side filtering (safe nested access throughout) ──
  const filteredAbsences = absences.filter((abs) => {
    const nom = abs.etudiant?.utilisateur?.nom || '';
    const prenom = abs.etudiant?.utilisateur?.prenom || '';
    const cne = abs.etudiant?.utilisateur?.CNE || '';
    const searchTarget = `${prenom} ${nom} ${cne}`.toLowerCase();

    const matchesSearch =
      !searchInput.trim() || searchTarget.includes(searchInput.trim().toLowerCase());
    const matchesStatut = !statutFilter || abs.statut === statutFilter;

    return matchesSearch && matchesStatut;
  });

  // ───────────────────────────────────────────────────────────
  // Error State (full page, only when nothing has loaded yet)
  // ───────────────────────────────────────────────────────────

  if (error && !loading && absences.length === 0) {
    return (
      <div className="sc-portal min-h-screen flex items-center justify-center p-6 animate-fade-in">
        <div className="max-w-md w-full card p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-2 tracking-tight">
            Erreur de chargement
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => fetchAbsences()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-soft hover:shadow-soft-hover transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sc-portal min-h-screen p-6 md:p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex items-center gap-3 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/30">
            <ClipboardCheck className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
              Validation des Absences
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Consultez et statuez sur les absences signalées par les étudiants.
            </p>
          </div>
        </header>

        {/* Filter bar */}
        <div className="card p-4 mb-6 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher par nom d'étudiant ou CNE..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark text-slate-800 dark:text-white placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            />
          </div>

          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value)}
            className="md:w-64 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark text-slate-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
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
        {error && !loading && absences.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex-shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <p className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</p>
            <button
              onClick={() => fetchAbsences()}
              className="text-sm font-medium text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline flex-shrink-0"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/70 dark:divide-slate-800">
              <thead className="bg-surface dark:bg-surface-dark/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Étudiant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Cours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Date & Heure
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Justificatif
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
                          <div className="space-y-1.5">
                            <div className="h-3.5 w-28 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                            <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-28 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 w-24 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredAbsences.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30 mx-auto mb-2">
                        <ClipboardCheck className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Aucune absence ne correspond aux critères sélectionnés.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredAbsences.map((abs) => {
                    const nom = abs.etudiant?.utilisateur?.nom || 'N/A';
                    const prenom = abs.etudiant?.utilisateur?.prenom || 'N/A';
                    const cne = abs.etudiant?.utilisateur?.CNE || 'N/A';
                    const nomCours = abs.session_salle?.cours?.nom_cours || 'N/A';

                    return (
                      <tr key={abs.id_absence} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-xs font-bold">
                              {prenom?.[0]}
                              {nom?.[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                                {prenom} {nom}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">CNE: {cne}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                            <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              <BookOpen className="h-3.5 w-3.5" />
                            </div>
                            {nomCours}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                          <span className="flex items-center gap-1.5">
                            <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              <Calendar className="h-3.5 w-3.5" />
                            </div>
                            {formatDateFr(abs.date_heure)}
                          </span>
                          <span className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
                            <div className="flex h-4 w-4 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              <Clock className="h-3 w-3" />
                            </div>
                            {formatTimeFr(abs.date_heure)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {abs.justificatif ? (
                            <a
                              href={abs.justificatif}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline"
                            >
                              <div className="flex h-5 w-5 items-center justify-center rounded bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                                <Paperclip className="h-3.5 w-3.5" />
                              </div>
                              Voir
                            </a>
                          ) : (
                            <span className="text-sm text-slate-500 dark:text-slate-400 italic">Aucun</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatutBadgeClasses(
                              abs.statut
                            )}`}
                          >
                            {formatStatutLabel(abs.statut)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => setSelectedAbsence(abs)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
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
      {selectedAbsence && (
        <ProcessAbsenceModal
          absence={selectedAbsence}
          onClose={() => setSelectedAbsence(null)}
          onSaved={() => fetchAbsences()}
          pushToast={pushToast}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}