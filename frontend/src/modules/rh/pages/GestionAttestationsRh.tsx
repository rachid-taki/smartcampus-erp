import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Search,
  Loader2,
  Plus,
  X,
  AlertTriangle,
  ArrowRight,
  Pencil,
  ScrollText,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

type TypeAttestation = 'Attestation_Travail' | 'Attestation_Salaire';
type StatutAttestation = 'Soumise' | 'En_Traitement' | 'Validee' | 'Rejetee';

interface Utilisateur {
  id_utilisateur: string;
  nom: string;
  prenom: string;
  email?: string;
}

interface Employe {
  id_employe: string;
  utilisateur: Utilisateur;
}

interface Attestation {
  id_demande_rh: string;
  type: TypeAttestation;
  statut: StatutAttestation;
  date_demande: string;
  motif: string | null;
  commentaires_rh: string | null;
  employe: Employe;
}

interface ApiListResponse {
  success: boolean;
  count: number;
  data: Attestation[];
}

interface ApiSingleResponse {
  success: boolean;
  message?: string;
  data: Attestation;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const API_BASE = 'http://localhost:3000/api/rh';

const STATUT_OPTIONS: StatutAttestation[] = ['Soumise', 'En_Traitement', 'Validee', 'Rejetee'];
const TYPE_OPTIONS: TypeAttestation[] = ['Attestation_Travail', 'Attestation_Salaire'];

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

const formatTypeLabel = (type: TypeAttestation): string => {
  const map: Record<TypeAttestation, string> = {
    Attestation_Travail: 'Attestation de Travail',
    Attestation_Salaire: 'Attestation de Salaire',
  };
  return map[type] ?? type.replace(/_/g, ' ');
};

const formatStatutLabel = (statut: StatutAttestation): string => {
  const map: Record<StatutAttestation, string> = {
    Soumise: 'Soumise',
    En_Traitement: 'En traitement',
    Validee: 'Validée',
    Rejetee: 'Rejetée',
  };
  return map[statut] ?? statut.replace(/_/g, ' ');
};

const getStatutBadgeClasses = (statut: StatutAttestation): string => {
  const map: Record<StatutAttestation, string> = {
    Soumise: 'bg-blue-100 text-blue-700 border border-blue-200',
    En_Traitement: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    Validee: 'bg-green-100 text-green-700 border border-green-200',
    Rejetee: 'bg-red-100 text-red-700 border border-red-200',
  };
  return map[statut] ?? 'bg-gray-100 text-gray-600 border border-gray-200';
};

const getTypeBadgeClasses = (type: TypeAttestation): string => {
  const map: Record<TypeAttestation, string> = {
    Attestation_Travail: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    Attestation_Salaire: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  };
  return map[type] ?? 'bg-gray-50 text-gray-600 border border-gray-200';
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
// Processing Modal ("Traiter la demande")
// ─────────────────────────────────────────────────────────────

function ProcessAttestationModal({
  attestation,
  onClose,
  onSaved,
  pushToast,
}: {
  attestation: Attestation;
  onClose: () => void;
  onSaved: () => Promise<void>;
  pushToast: (type: Toast['type'], message: string) => void;
}) {
  const [selectedStatut, setSelectedStatut] = useState<StatutAttestation>(attestation.statut);
  const [commentairesRh, setCommentairesRh] = useState<string>(attestation.commentaires_rh || '');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { nom, prenom } = attestation.employe.utilisateur;

  const handleSubmit = async () => {
    setFormError(null);
    setSaving(true);

    try {
      const response = await fetch(
        `${API_BASE}/attestations/${attestation.id_demande_rh}/statut`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            statut: selectedStatut,
            commentaires_rh: commentairesRh || undefined,
          }),
        }
      );

      const json: ApiSingleResponse = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(
          (json as any).message || `Erreur serveur (code ${response.status})`
        );
      }

      pushToast('success', json.message || 'Statut mis à jour avec succès.');
      await onSaved();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de la mise à jour du statut.';
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
              Traiter la demande d'attestation
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {prenom} {nom}
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

          {/* Request details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Type
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getTypeBadgeClasses(
                  attestation.type
                )}`}
              >
                {formatTypeLabel(attestation.type)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Date de demande
              </span>
              <span className="text-sm text-gray-700">
                {formatDateFr(attestation.date_demande)}
              </span>
            </div>

            {attestation.motif && (
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                  Motif
                </span>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {attestation.motif}
                </p>
              </div>
            )}
          </div>

          <hr className="border-gray-100" />

          {/* New status selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Nouveau statut
            </label>
            <select
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value as StatutAttestation)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            >
              {STATUT_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {formatStatutLabel(s)}
                </option>
              ))}
            </select>
          </div>

          {/* Quick action buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedStatut('Validee')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 px-3 py-2 text-sm font-medium hover:bg-green-100 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              Valider
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatut('Rejetee')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm font-medium hover:bg-red-100 transition-colors"
            >
              <XCircle className="h-4 w-4" />
              Rejeter
            </button>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Commentaires RH{' '}
              <span className="normal-case font-normal text-gray-400">
                (optionnel)
              </span>
            </label>
            <textarea
              value={commentairesRh}
              onChange={(e) => setCommentairesRh(e.target.value)}
              rows={4}
              placeholder="Ajouter un commentaire..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
            />
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
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Simulation Modal ("Simuler une demande")
// ─────────────────────────────────────────────────────────────

function SimulateAttestationModal({
  onClose,
  onCreated,
  pushToast,
}: {
  onClose: () => void;
  onCreated: () => Promise<void>;
  pushToast: (type: Toast['type'], message: string) => void;
}) {
  const [idEmploye, setIdEmploye] = useState('');
  const [type, setType] = useState<TypeAttestation>('Attestation_Travail');
  const [motif, setMotif] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setFormError(null);

    if (!idEmploye.trim()) {
      setFormError("L'ID de l'employé est requis (UUID).");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE}/attestations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_employe: idEmploye.trim(),
          type,
          motif: motif.trim() || undefined,
        }),
      });

      const json: ApiSingleResponse = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(
          (json as any).message || `Erreur serveur (code ${response.status})`
        );
      }

      pushToast('success', "Demande d'attestation simulée avec succès.");
      await onCreated();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de la création de la demande.';
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
              Simuler une demande d'attestation
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Utile pour tester le flux de validation RH.
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
        <div className="px-6 py-5 space-y-4">
          {formError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              ID de l'employé (UUID) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={idEmploye}
              onChange={(e) => setIdEmploye(e.target.value)}
              placeholder="Ex: 3fa85f64-5717-4562-b3fc-2c963f66afa6"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Type d'attestation
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TypeAttestation)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {formatTypeLabel(t)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Motif <span className="normal-case font-normal text-gray-400">(optionnel)</span>
            </label>
            <textarea
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              rows={3}
              placeholder="Ex: Dossier bancaire, démarche administrative..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
            />
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
            Créer la demande
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────

export default function GestionAttestationsRh() {
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const [selectedAttestation, setSelectedAttestation] = useState<Attestation | null>(null);
  const [showSimulateModal, setShowSimulateModal] = useState(false);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

  // ── Fetch attestations ──
  const fetchAttestations = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/attestations`, { signal });

      if (!response.ok) {
        throw new Error(`Erreur serveur (code ${response.status})`);
      }

      const json: ApiListResponse = await response.json();

      if (!json.success) {
        throw new Error('La requête a échoué côté serveur.');
      }

      setAttestations(json.data);
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
    fetchAttestations(controller.signal);
    return () => controller.abort();
  }, [fetchAttestations]);

  // ── Download PDF flow ──
  const handleDownloadPdf = async (attestation: Attestation) => {
    setDownloadingId(attestation.id_demande_rh);

    try {
      const response = await fetch(
        `${API_BASE}/attestations/${attestation.id_demande_rh}/pdf`
      );

      if (!response.ok) {
        let message = `Erreur serveur (code ${response.status})`;
        try {
          const errJson = await response.json();
          if (errJson?.message) message = errJson.message;
        } catch {
          // response wasn't JSON — keep the generic message
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);

      const { nom, prenom } = attestation.employe.utilisateur;
      const fileName = `${formatTypeLabel(attestation.type).replace(/\s+/g, '_')}_${prenom}_${nom}.pdf`;

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors du téléchargement de l'attestation.";
      pushToast('error', message);
    } finally {
      setDownloadingId(null);
    }
  };

  // ── Client-side filtering ──
  const filteredAttestations = attestations.filter((att) => {
    const fullName = `${att.employe.utilisateur.prenom} ${att.employe.utilisateur.nom}`.toLowerCase();
    const matchesSearch = !searchInput.trim() || fullName.includes(searchInput.trim().toLowerCase());
    const matchesStatut = !statutFilter || att.statut === statutFilter;
    const matchesType = !typeFilter || att.type === typeFilter;
    return matchesSearch && matchesStatut && matchesType;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100">
              <ScrollText className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                Gestion des Attestations
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Consultez, traitez et générez les attestations demandées par les employés.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowSimulateModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Simuler une demande
          </button>
        </header>

        {/* Filter bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher par nom d'employé..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>

          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value)}
            className="md:w-52 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white"
          >
            <option value="">Tous les statuts</option>
            {STATUT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {formatStatutLabel(s)}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="md:w-56 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white"
          >
            <option value="">Tous les types</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {formatTypeLabel(t)}
              </option>
            ))}
          </select>
        </div>

        {/* Error state */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-6 mb-6 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Employé
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Type d'attestation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date de demande
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
                          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 w-32 bg-gray-100 rounded-full animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 bg-gray-100 rounded animate-pulse ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredAttestations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">
                        Aucune demande d'attestation ne correspond aux critères sélectionnés.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredAttestations.map((attestation) => {
                    const { nom, prenom } = attestation.employe.utilisateur;
                    const isValidated = attestation.statut === 'Validee';
                    const isDownloading = downloadingId === attestation.id_demande_rh;

                    return (
                      <tr
                        key={attestation.id_demande_rh}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                              {prenom?.[0]}
                              {nom?.[0]}
                            </div>
                            <span className="text-sm font-medium text-gray-800">
                              {prenom} {nom}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getTypeBadgeClasses(
                              attestation.type
                            )}`}
                          >
                            {formatTypeLabel(attestation.type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateFr(attestation.date_demande)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatutBadgeClasses(
                              attestation.statut
                            )}`}
                          >
                            {formatStatutLabel(attestation.statut)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!isValidated && (
                              <button
                                onClick={() => setSelectedAttestation(attestation)}
                                title="Traiter la demande"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              >
                                <Pencil className="h-4 w-4" />
                                Traiter
                              </button>
                            )}

                            <button
                              onClick={() => handleDownloadPdf(attestation)}
                              disabled={!isValidated || isDownloading}
                              title={
                                isValidated
                                  ? "Télécharger l'attestation PDF"
                                  : 'Disponible une fois la demande validée'
                              }
                              aria-label="Télécharger l'attestation PDF"
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                isValidated
                                  ? 'text-emerald-600 hover:bg-emerald-50'
                                  : 'text-gray-300 cursor-not-allowed'
                              }`}
                            >
                              {isDownloading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                              Télécharger
                            </button>
                          </div>
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
      {selectedAttestation && (
        <ProcessAttestationModal
          attestation={selectedAttestation}
          onClose={() => setSelectedAttestation(null)}
          onSaved={() => fetchAttestations()}
          pushToast={pushToast}
        />
      )}

      {/* Simulation Modal */}
      {showSimulateModal && (
        <SimulateAttestationModal
          onClose={() => setShowSimulateModal(false)}
          onCreated={() => fetchAttestations()}
          pushToast={pushToast}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}