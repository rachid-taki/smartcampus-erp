import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Trash2,
  X,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ToggleLeft,
  ToggleRight,
  Workflow as WorkflowIcon,
  User,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

type WorkflowStatut = 'Actif' | 'Inactif';

interface Etape {
  id_etape: string;
  ordre: number;
  nom: string;
  role_responsable: string | null;
}

interface Workflow {
  id_workflow: string;
  nom: string;
  description: string | null;
  statut: WorkflowStatut;
  date_creation: string;
  etapes: Etape[];
}

interface ApiListResponse {
  success: boolean;
  data: Workflow[];
}

interface ApiSingleResponse {
  success: boolean;
  message?: string;
  data: Workflow;
}

interface EtapeDraft {
  nom: string;
  role_responsable: string;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const API_BASE = 'http://localhost:3000/api/scolarite';

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

const emptyEtapeDraft = (): EtapeDraft => ({ nom: '', role_responsable: '' });

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
// Workflow Card
// ─────────────────────────────────────────────────────────────

function WorkflowCard({
  workflow,
  onToggleStatus,
  togglingId,
}: {
  workflow: Workflow;
  onToggleStatus: (workflow: Workflow) => void;
  togglingId: string | null;
}) {
  const isActive = workflow.statut === 'Actif';
  const isToggling = togglingId === workflow.id_workflow;
  const sortedEtapes = [...workflow.etapes].sort((a, b) => a.ordre - b.ordre);

  return (
    <div className="card p-6 flex flex-col transition-shadow duration-200">
      {/* Card header */}
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/30">
            <WorkflowIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-800 dark:text-white truncate tracking-tight">
              {workflow.nom}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              Créé le {formatDateFr(workflow.date_creation)}
            </p>
          </div>
        </div>

        <span
          className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
            isActive
              ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          {workflow.statut}
        </span>
      </div>

      {/* Description */}
      {workflow.description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
          {workflow.description}
        </p>
      )}

      {/* Etapes timeline */}
      <div className="flex-1 mb-4">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
          Étapes (<span className="tabular-nums">{sortedEtapes.length}</span>)
        </p>

        {sortedEtapes.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 italic">Aucune étape définie.</p>
        ) : (
          <ol className="space-y-2">
            {sortedEtapes.map((etape, idx) => (
              <li key={etape.id_etape} className="flex items-start gap-2.5">
                <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 text-[11px] font-semibold text-primary-600 dark:text-primary-400 tabular-nums">
                  {etape.ordre}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-tight">{etape.nom}</p>
                  {etape.role_responsable && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <div className="flex h-4 w-4 items-center justify-center rounded bg-slate-100 dark:bg-slate-800">
                        <User className="h-2.5 w-2.5 text-slate-500 dark:text-slate-400" />
                      </div>
                      {etape.role_responsable}
                    </div>
                  )}
                </div>
                {idx < sortedEtapes.length - 1 && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 mt-1.5 flex-shrink-0">
                    <ArrowRight className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Toggle status */}
      <div className="pt-4 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {isActive ? 'Workflow actif' : 'Workflow inactif'}
        </span>
        <button
          onClick={() => onToggleStatus(workflow)}
          disabled={isToggling}
          className="disabled:opacity-50 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Changer le statut du workflow"
        >
          {isToggling ? (
            <Loader2 className="h-6 w-6 text-slate-400 dark:text-slate-500 animate-spin" />
          ) : isActive ? (
            <ToggleRight className="h-7 w-7 text-green-500 dark:text-green-400" />
          ) : (
            <ToggleLeft className="h-7 w-7 text-slate-300 dark:text-slate-600" />
          )}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Creation Modal
// ─────────────────────────────────────────────────────────────

function CreateWorkflowModal({
  onClose,
  onCreated,
  pushToast,
}: {
  onClose: () => void;
  onCreated: () => Promise<void>;
  pushToast: (type: Toast['type'], message: string) => void;
}) {
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [etapes, setEtapes] = useState<EtapeDraft[]>([emptyEtapeDraft()]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleEtapeChange = (
    index: number,
    field: keyof EtapeDraft,
    value: string
  ) => {
    setEtapes((prev) =>
      prev.map((etape, i) => (i === index ? { ...etape, [field]: value } : etape))
    );
  };

  const handleAddEtape = () => {
    setEtapes((prev) => [...prev, emptyEtapeDraft()]);
  };

  const handleRemoveEtape = (index: number) => {
    setEtapes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setFormError(null);

    // --- Client-side validation ---
    if (!nom.trim()) {
      setFormError('Le nom du workflow est requis.');
      return;
    }

    const cleanedEtapes = etapes
      .map((e) => ({ nom: e.nom.trim(), role_responsable: e.role_responsable.trim() }))
      .filter((e) => e.nom !== '');

    if (cleanedEtapes.length === 0) {
      setFormError('Ajoutez au moins une étape valide (avec un nom).');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        nom: nom.trim(),
        description: description.trim(),
        etapes: cleanedEtapes.map((e, idx) => ({
          nom: e.nom,
          ordre: idx + 1,
          role_responsable: e.role_responsable || null,
        })),
      };

      const response = await fetch(`${API_BASE}/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json: ApiSingleResponse = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(
          (json as any).message || `Erreur serveur (code ${response.status})`
        );
      }

      pushToast('success', 'Workflow créé avec succès.');
      await onCreated();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de la création du workflow.';
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
              Créer un Workflow
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Définissez un modèle de workflow et ses étapes de validation.
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
        <div className="px-6 py-5 space-y-6">
          {formError && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5">
                <AlertTriangle className="h-3 w-3" />
              </div>
              <span>{formError}</span>
            </div>
          )}

          {/* Basic info */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Nom du workflow <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex: Validation attestation de réussite"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Décrivez le but de ce workflow..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
              />
            </div>
          </div>

          <hr className="border-slate-200/70 dark:border-slate-800" />

          {/* Dynamic steps builder */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Étapes du workflow
              </label>
              <button
                type="button"
                onClick={handleAddEtape}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Ajouter une étape
              </button>
            </div>

            <div className="space-y-3">
              {etapes.map((etape, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 rounded-lg p-3"
                >
                  <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30 text-sm font-semibold text-primary-600 dark:text-primary-400 mt-1 tabular-nums">
                    {index + 1}
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={etape.nom}
                      onChange={(e) =>
                        handleEtapeChange(index, 'nom', e.target.value)
                      }
                      placeholder="Nom de l'étape"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                    />
                    <input
                      type="text"
                      value={etape.role_responsable}
                      onChange={(e) =>
                        handleEtapeChange(index, 'role_responsable', e.target.value)
                      }
                      placeholder="Rôle responsable (ex: Scolarité)"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveEtape(index)}
                    disabled={etapes.length === 1}
                    className="flex-shrink-0 mt-1 p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                    aria-label="Supprimer l'étape"
                    title={
                      etapes.length === 1
                        ? 'Le workflow doit contenir au moins une étape'
                        : "Supprimer l'étape"
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
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

export default function GestionWorkflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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

  // ── Fetch workflows ──
  const fetchWorkflows = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/workflows`, { signal });

      if (!response.ok) {
        throw new Error(`Erreur serveur (code ${response.status})`);
      }

      const json: ApiListResponse = await response.json();

      if (!json.success) {
        throw new Error('La requête a échoué côté serveur.');
      }

      setWorkflows(json.data);
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
    fetchWorkflows(controller.signal);
    return () => controller.abort();
  }, [fetchWorkflows]);

  // ── Toggle Actif / Inactif ──
  const handleToggleStatus = async (workflow: Workflow) => {
    const newStatut: WorkflowStatut =
      workflow.statut === 'Actif' ? 'Inactif' : 'Actif';

    setTogglingId(workflow.id_workflow);

    try {
      const response = await fetch(
        `${API_BASE}/workflows/${workflow.id_workflow}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ statut: newStatut }),
        }
      );

      const json: ApiSingleResponse = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(
          (json as any).message || `Erreur serveur (code ${response.status})`
        );
      }

      // Update the single workflow in place rather than refetching everything
      setWorkflows((prev) =>
        prev.map((w) => (w.id_workflow === workflow.id_workflow ? json.data : w))
      );

      pushToast(
        'success',
        `Workflow ${newStatut === 'Actif' ? 'activé' : 'désactivé'} avec succès.`
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de la mise à jour du statut.';
      pushToast('error', message);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="sc-portal min-h-screen p-6 md:p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
              Gestion des Workflows
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Définissez et gérez les modèles de workflow utilisés pour le traitement des demandes.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-soft hover:shadow-soft-hover transition-all whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Créer un Workflow
          </button>
        </header>

        {/* Error state */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 mb-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 mx-auto mb-2">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Grid of workflow cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="card p-6 animate-pulse"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded" />
                    <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
                  </div>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded mb-2" />
                <div className="h-3 w-2/3 bg-slate-100 dark:bg-slate-800 rounded mb-4" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded" />
                  <div className="h-4 w-4/5 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : workflows.length === 0 && !error ? (
          <div className="card p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30 mx-auto mb-3">
              <WorkflowIcon className="h-7 w-7 text-primary-600 dark:text-primary-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Aucun workflow n'a encore été créé.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Cliquez sur "Créer un Workflow" pour commencer.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map((workflow) => (
              <WorkflowCard
                key={workflow.id_workflow}
                workflow={workflow}
                onToggleStatus={handleToggleStatus}
                togglingId={togglingId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Creation Modal */}
      {showCreateModal && (
        <CreateWorkflowModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => fetchWorkflows()}
          pushToast={pushToast}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}