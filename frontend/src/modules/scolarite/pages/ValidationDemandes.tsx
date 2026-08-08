import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, CheckCircle, XCircle, Eye, X, Loader2, AlertTriangle, Clock, Download } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

type Statut =
  | 'Brouillon'
  | 'Soumise'
  | 'En_Traitement'
  | 'Validee'
  | 'Rejetee'
  | 'Cloturee';

interface Demande {
  id_demande: string;
  numero: string;
  objet: string;
  description: string;
  statut: Statut;
  date_creation: string; // ISO date string
}

interface ApiListResponse {
  success: boolean;
  count: number;
  data: Demande[];
}

interface ApiUpdateResponse {
  success: boolean;
  message: string;
  data: Demande;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const API_BASE = 'http://localhost:3000/api/scolarite';

const STATUT_OPTIONS: Statut[] = [
  'Brouillon',
  'Soumise',
  'En_Traitement',
  'Validee',
  'Rejetee',
  'Cloturee',
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

const formatStatutLabel = (statut: string): string => statut.replace(/_/g, ' ');

const getStatutBadgeClasses = (statut: Statut): string => {
  const map: Record<Statut, string> = {
    Brouillon: 'bg-gray-100 text-gray-700 border border-gray-200',
    Soumise: 'bg-blue-100 text-blue-700 border border-blue-200',
    En_Traitement: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    Validee: 'bg-green-100 text-green-700 border border-green-200',
    Rejetee: 'bg-red-100 text-red-700 border border-red-200',
    Cloturee: 'bg-slate-200 text-slate-700 border border-slate-300',
  };
  return map[statut] ?? 'bg-gray-100 text-gray-700 border border-gray-200';
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
          className={`flex items-start gap-3 rounded-lg shadow-lg border p-4 animate-in fade-in slide-in-from-top-2 ${
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
// Action Modal
// ─────────────────────────────────────────────────────────────

function DemandeModal({
  demande,
  onClose,
  onSave,
  saving,
}: {
  demande: Demande;
  onClose: () => void;
  onSave: (statut: Statut, commentaires: string) => Promise<void>;
  saving: boolean;
}) {
  const [selectedStatut, setSelectedStatut] = useState<Statut>(demande.statut);
  const [commentaires, setCommentaires] = useState<string>('');

  const handleSave = () => {
    onSave(selectedStatut, commentaires);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-xl">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Traiter la demande
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{demande.numero}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Request details */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Objet
            </p>
            <p className="text-sm text-gray-800">{demande.objet}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Description
            </p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {demande.description || 'Aucune description fournie.'}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Statut actuel
              </p>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatutBadgeClasses(
                  demande.statut
                )}`}
              >
                {formatStatutLabel(demande.statut)}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Date de création
              </p>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDateFr(demande.date_creation)}
              </p>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* New status selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Nouveau statut
            </label>
            <select
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value as Statut)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
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
              Commentaires{' '}
              <span className="normal-case font-normal text-gray-400">
                (optionnel — recommandé en cas de rejet)
              </span>
            </label>
            <textarea
              value={commentaires}
              onChange={(e) => setCommentaires(e.target.value)}
              rows={4}
              placeholder="Ajouter une note ou un motif..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
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
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
// Main Page Component
// ─────────────────────────────────────────────────────────────

export default function ValidationDemandes() {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statutFilter, setStatutFilter] = useState<string>('');

  const [selectedDemande, setSelectedDemande] = useState<Demande | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  // ── Toast helpers ──
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

  // ── Debounce search input (400ms) ──
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // ── Fetch demandes whenever filters change ──
  const fetchDemandes = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (statutFilter) params.set('statut', statutFilter);

        const url = `${API_BASE}/demandes${
          params.toString() ? `?${params.toString()}` : ''
        }`;

        const response = await fetch(url, { signal });

        if (!response.ok) {
          throw new Error(`Erreur serveur (code ${response.status})`);
        }

        const json: ApiListResponse = await response.json();

        if (!json.success) {
          throw new Error('La requête a échoué côté serveur.');
        }

        setDemandes(json.data);
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
    },
    [debouncedSearch, statutFilter]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchDemandes(controller.signal);
    return () => controller.abort();
  }, [fetchDemandes]);

  // ── Handle status update (PATCH) ──
  const handleSaveStatus = async (statut: Statut, commentaires: string) => {
    if (!selectedDemande) return;

    setSaving(true);

    try {
      const response = await fetch(
        `${API_BASE}/demandes/${selectedDemande.id_demande}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            statut,
            commentaires: commentaires || undefined,
          }),
        }
      );

      const json: ApiUpdateResponse = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || `Erreur serveur (code ${response.status})`);
      }

      pushToast('success', json.message || 'Statut mis à jour avec succès.');
      setSelectedDemande(null);

      // Refresh the table data
      await fetchDemandes();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de la mise à jour du statut.";
      pushToast('error', message);
    } finally {
      setSaving(false);
    }
  };
  /**
 * Downloads the PDF attestation for a given demande.
 * Fetches the binary stream, converts it to a Blob, and forces
 * a browser download via a temporary hidden <a> tag.
 */
const handleDownloadPdf = async (id_demande: string) => {
  setDownloadingPdfId(id_demande);

  try {
    const response = await fetch(`${API_BASE}/demandes/${id_demande}/pdf`);

    if (!response.ok) {
      // The backend returns JSON on error (400/404/500), so try to parse
      // a meaningful message; fall back to a generic one if that fails.
      let message = `Erreur serveur (code ${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson?.message) message = errJson.message;
      } catch {
        // Response wasn't JSON — keep the generic message
      }
      throw new Error(message);
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);

    // Trigger the download via a temporary, invisible <a> tag
    const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `Demande_${id_demande}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Release the object URL once the download has been triggered
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors du téléchargement de l'attestation PDF.";
      pushToast('error', message);
    } finally {
      setDownloadingPdfId(null);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Validation des Demandes Administratives
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Consultez, filtrez et traitez les demandes soumises par les étudiants.
          </p>
        </header>

        {/* Filter bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher par numéro ou objet..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>

          {/* Statut filter */}
          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value)}
            className="md:w-56 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
          >
            <option value="">Tous les statuts</option>
            {STATUT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {formatStatutLabel(s)}
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
                    Numéro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Objet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date de création
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
                  // Skeleton rows
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-16 bg-gray-100 rounded animate-pulse ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : demandes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400">
                      Aucune demande ne correspond aux critères sélectionnés.
                    </td>
                  </tr>
                ) : (
                  demandes.map((demande) => (
                    <tr key={demande.id_demande} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                        {demande.numero}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {demande.objet}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateFr(demande.date_creation)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatutBadgeClasses(
                            demande.statut
                          )}`}
                        >
                          {formatStatutLabel(demande.statut)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedDemande(demande)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          {demande.statut === 'Soumise' || demande.statut === 'En_Traitement' ? (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              Traiter
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4" />
                              Voir
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleDownloadPdf(demande.id_demande)}
                          disabled={downloadingPdfId === demande.id_demande}
                          title="Télécharger l'attestation PDF"
                          aria-label="Télécharger l'attestation PDF"
                          className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {downloadingPdfId === demande.id_demande ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Modal */}
      {selectedDemande && (
        <DemandeModal
          demande={selectedDemande}
          onClose={() => setSelectedDemande(null)}
          onSave={handleSaveStatus}
          saving={saving}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}