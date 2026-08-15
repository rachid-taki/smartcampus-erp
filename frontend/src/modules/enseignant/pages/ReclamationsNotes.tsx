import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  MessageSquare,
  CheckCircle,
  XCircle,
  User,
  BookOpen,
  Clock,
  Loader2,
  X,
  AlertTriangle,
  RefreshCw,
  Eye,
  Calendar,
  Hash,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

type StatutReclamation = 'Soumise' | 'En_Cours' | 'Resolue' | 'Rejetee';

interface Utilisateur {
  nom: string;
  prenom: string;
  CNE: string;
}

interface Etudiant {
  utilisateur: Utilisateur;
}

interface ModuleInfo {
  nomModule: string;
}

interface Reclamation {
  idReclamation: string;
  sujet: string;
  description: string;
  dateSoumission: string;
  statut: StatutReclamation;
  reponse: string | null;
  etudiant: Etudiant;
  module: ModuleInfo;
}

interface ApiListResponse {
  success: boolean;
  count: number;
  data: Reclamation[];
}

interface ApiSingleResponse {
  success: boolean;
  message?: string;
  data: Reclamation;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const API_BASE = 'http://localhost:3000/api/enseignant';

const STATUT_OPTIONS: StatutReclamation[] = ['Soumise', 'En_Cours', 'Resolue', 'Rejetee'];
const RESPONSE_STATUT_OPTIONS: Extract<StatutReclamation, 'Resolue' | 'Rejetee'>[] = [
  'Resolue',
  'Rejetee',
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

const formatStatutLabel = (statut: StatutReclamation): string => {
  const map: Record<StatutReclamation, string> = {
    Soumise: 'Soumise',
    En_Cours: 'En cours',
    Resolue: 'Résolue',
    Rejetee: 'Rejetée',
  };
  return map[statut] ?? statut.replace(/_/g, ' ');
};

const getStatutBadgeClasses = (statut: StatutReclamation): string => {
  const map: Record<StatutReclamation, string> = {
    Soumise: 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800',
    En_Cours: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    Resolue: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800',
    Rejetee: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800',
  };
  return map[statut] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
};

const isPending = (statut: StatutReclamation): boolean =>
  statut === 'Soumise' || statut === 'En_Cours';

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
// Processing Modal ("Traiter la réclamation")
// ─────────────────────────────────────────────────────────────

function ProcessReclamationModal({
  reclamation,
  onClose,
  onSaved,
  pushToast,
}: {
  reclamation: Reclamation;
  onClose: () => void;
  onSaved: () => Promise<void>;
  pushToast: (type: Toast['type'], message: string) => void;
}) {
  const [selectedStatut, setSelectedStatut] = useState<'Resolue' | 'Rejetee'>('Resolue');
  const [reponse, setReponse] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { nom, prenom, CNE } = reclamation.etudiant.utilisateur;
  const canRespond = isPending(reclamation.statut);

  const handleSubmit = async () => {
    setFormError(null);

    if (!reponse.trim()) {
      setFormError('La réponse est requise avant de soumettre.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${API_BASE}/reclamations/${reclamation.idReclamation}/repondre`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            statut: selectedStatut,
            reponse: reponse.trim(),
          }),
        }
      );

      const json: ApiSingleResponse = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(
          (json as any).message || `Erreur serveur (code ${response.status})`
        );
      }

      pushToast('success', json.message || 'Réponse enregistrée avec succès.');
      await onSaved();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de l'enregistrement de la réponse.";
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
        className="card p-0 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200/70 dark:border-slate-800 sticky top-0 bg-card dark:bg-card-dark rounded-t-card z-10">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white tracking-tight">
              {canRespond ? 'Traiter la réclamation' : 'Détails de la réclamation'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {prenom} {nom} • CNE: <span className="tabular-nums">{CNE}</span>
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

          {/* Context: student / module / date / current status */}
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
              <span className="text-sm text-slate-700 dark:text-slate-200 tabular-nums">{CNE}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-700">
                  <BookOpen className="h-3.5 w-3.5" />
                </div>
                Module
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-200">
                {reclamation.module?.nomModule || 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-700">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
                Date de soumission
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-200 tabular-nums">
                {formatDateFr(reclamation.dateSoumission)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Statut actuel
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatutBadgeClasses(
                  reclamation.statut
                )}`}
              >
                {formatStatutLabel(reclamation.statut)}
              </span>
            </div>
          </div>

          {/* Original complaint (read-only) */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Sujet
            </p>
            <p className="text-sm font-medium text-slate-800 dark:text-white mb-3">{reclamation.sujet}</p>

            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Description de l'étudiant
            </p>
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 rounded-lg p-4">
              <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                {reclamation.description}
              </p>
            </div>
          </div>

          <hr className="border-slate-200/70 dark:border-slate-800" />

          {canRespond ? (
            /* ── Response form (Soumise / En_Cours) ── */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  Votre réponse <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reponse}
                  onChange={(e) => setReponse(e.target.value)}
                  rows={5}
                  placeholder="Expliquez votre décision concernant cette réclamation de note..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  Décision
                </label>
                <select
                  value={selectedStatut}
                  onChange={(e) => setSelectedStatut(e.target.value as 'Resolue' | 'Rejetee')}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                >
                  {RESPONSE_STATUT_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {formatStatutLabel(s)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStatut('Resolue')}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    selectedStatut === 'Resolue'
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800 text-green-700 dark:text-green-400'
                      : 'bg-card dark:bg-card-dark border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <CheckCircle className="h-4 w-4" />
                  Résoudre
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatut('Rejetee')}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    selectedStatut === 'Rejetee'
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800 text-red-700 dark:text-red-400'
                      : 'bg-card dark:bg-card-dark border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <XCircle className="h-4 w-4" />
                  Rejeter
                </button>
              </div>
            </div>
          ) : (
            /* ── Read-only previous response (Resolue / Rejetee) ── */
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Réponse de l'enseignant
              </p>
              <div
                className={`rounded-lg p-4 border ${
                  reclamation.statut === 'Resolue'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}
              >
                <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                  {reclamation.reponse || 'Aucune réponse enregistrée.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200/70 dark:border-slate-800 sticky bottom-0 bg-card dark:bg-card-dark rounded-b-card">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            {canRespond ? 'Annuler' : 'Fermer'}
          </button>
          {canRespond && (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-soft hover:shadow-soft-hover transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Soumettre la réponse
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────

export default function ReclamationsNotes() {
  const [reclamations, setReclamations] = useState<Reclamation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('');

  const [selectedReclamation, setSelectedReclamation] = useState<Reclamation | null>(null);

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

  // ── Fetch grade complaints ──
  const fetchReclamations = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/reclamations`, { signal });

      if (!response.ok) {
        throw new Error(`Erreur serveur (code ${response.status})`);
      }

      const json: ApiListResponse = await response.json();

      if (!json.success) {
        throw new Error('La requête a échoué côté serveur.');
      }

      setReclamations(json.data);
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
    fetchReclamations(controller.signal);
    return () => controller.abort();
  }, [fetchReclamations]);

  // ── Client-side filtering ──
  const filteredReclamations = reclamations.filter((rec) => {
    const { nom, prenom, CNE } = rec.etudiant.utilisateur;
    const searchTarget = `${prenom} ${nom} ${CNE}`.toLowerCase();
    const matchesSearch = !searchInput.trim() || searchTarget.includes(searchInput.trim().toLowerCase());
    const matchesStatut = !statutFilter || rec.statut === statutFilter;
    return matchesSearch && matchesStatut;
  });

  // ───────────────────────────────────────────────────────────
  // Error State (full page, only when nothing has loaded yet)
  // ───────────────────────────────────────────────────────────

  if (error && !loading && reclamations.length === 0) {
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
            onClick={() => fetchReclamations()}
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
            <MessageSquare className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
              Réclamations de Notes
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Consultez et répondez aux réclamations soumises par les étudiants.
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
            className="md:w-56 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark text-slate-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          >
            <option value="">Tous les statuts</option>
            {STATUT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {formatStatutLabel(s)}
              </option>
            ))}
          </select>
        </div>

        {/* Inline error banner (shown if a retry fails but we still have stale data) */}
        {error && !loading && reclamations.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex-shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <p className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</p>
            <button
              onClick={() => fetchReclamations()}
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
                    Module
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Sujet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Date
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
                        <div className="h-4 w-40 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 w-20 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredReclamations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30 mx-auto mb-2">
                        <MessageSquare className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Aucune réclamation ne correspond aux critères sélectionnés.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredReclamations.map((rec) => {
                    const { nom, prenom, CNE } = rec.etudiant.utilisateur;
                    const pending = isPending(rec.statut);

                    return (
                      <tr key={rec.idReclamation} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
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
                              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">CNE: {CNE}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                            <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              <BookOpen className="h-3.5 w-3.5" />
                            </div>
                            {rec.module?.nomModule || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200 max-w-xs truncate" title={rec.sujet}>
                          {rec.sujet}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                          <span className="inline-flex items-center gap-1.5">
                            <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              <Clock className="h-3.5 w-3.5" />
                            </div>
                            {formatDateFr(rec.dateSoumission)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatutBadgeClasses(
                              rec.statut
                            )}`}
                          >
                            {formatStatutLabel(rec.statut)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => setSelectedReclamation(rec)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          >
                            {pending ? (
                              <>
                                <MessageSquare className="h-4 w-4" />
                                Traiter
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4" />
                                Voir
                              </>
                            )}
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
      {selectedReclamation && (
        <ProcessReclamationModal
          reclamation={selectedReclamation}
          onClose={() => setSelectedReclamation(null)}
          onSaved={() => fetchReclamations()}
          pushToast={pushToast}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}