import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Clock,
  Plus,
  CheckCircle,
  XCircle,
  Search,
  Loader2,
  Calendar,
  X,
  AlertTriangle,
  Pencil,
  Hourglass,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

type StatutHeureSup = 'Soumise' | 'En_Traitement' | 'Validee' | 'Rejetee';

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

interface HeureSup {
  id_demande_rh: string;
  statut: StatutHeureSup;
  date_demande: string;
  date_debut: string; // date the overtime was worked
  duree: number; // number of overtime hours
  motif: string;
  commentaires_rh: string | null;
  employe: Employe;
}

interface ApiListResponse {
  success: boolean;
  count: number;
  data: HeureSup[];
}

interface ApiSingleResponse {
  success: boolean;
  message?: string;
  data: HeureSup;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const API_BASE = 'http://localhost:3000/api/rh';

const STATUT_OPTIONS: StatutHeureSup[] = ['Soumise', 'En_Traitement', 'Validee', 'Rejetee'];

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

const formatStatutLabel = (statut: StatutHeureSup): string => {
  const map: Record<StatutHeureSup, string> = {
    Soumise: 'Soumise',
    En_Traitement: 'En traitement',
    Validee: 'Validée',
    Rejetee: 'Rejetée',
  };
  return map[statut] ?? statut.replace(/_/g, ' ');
};

const getStatutBadgeClasses = (statut: StatutHeureSup): string => {
  const map: Record<StatutHeureSup, string> = {
    Soumise: 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800',
    En_Traitement: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    Validee: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800',
    Rejetee: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800',
  };
  return map[statut] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
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
// Processing Modal ("Traiter la déclaration")
// ─────────────────────────────────────────────────────────────

function ProcessHeureSupModal({
  heureSup,
  onClose,
  onSaved,
  pushToast,
}: {
  heureSup: HeureSup;
  onClose: () => void;
  onSaved: () => Promise<void>;
  pushToast: (type: Toast['type'], message: string) => void;
}) {
  const [selectedStatut, setSelectedStatut] = useState<StatutHeureSup>(heureSup.statut);
  const [commentairesRh, setCommentairesRh] = useState<string>(heureSup.commentaires_rh || '');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { nom, prenom } = heureSup.employe.utilisateur;

  const handleSubmit = async () => {
    setFormError(null);
    setSaving(true);

    try {
      const response = await fetch(
        `${API_BASE}/heures-supplementaires/${heureSup.id_demande_rh}/statut`,
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
              Traiter la déclaration d'heures
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {prenom} {nom}
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

          {/* Overtime details */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Date effectuée
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5 tabular-nums">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
                {formatDateFr(heureSup.date_debut)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Nombre d'heures
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-semibold tabular-nums tracking-tight">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  <Hourglass className="h-3.5 w-3.5" />
                </div>
                {heureSup.duree} h
              </span>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">
                Motif
              </span>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{heureSup.motif}</p>
            </div>
          </div>

          <hr className="border-slate-200/70 dark:border-slate-800" />

          {/* New status selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              Nouveau statut
            </label>
            <select
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value as StatutHeureSup)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
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
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-3 py-2 text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              Valider
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatut('Rejetee')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            >
              <XCircle className="h-4 w-4" />
              Rejeter
            </button>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              Commentaires RH{' '}
              <span className="normal-case font-normal text-slate-400 dark:text-slate-500">(optionnel)</span>
            </label>
            <textarea
              value={commentairesRh}
              onChange={(e) => setCommentairesRh(e.target.value)}
              rows={4}
              placeholder="Ajouter un commentaire..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
            />
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
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Simulation Modal ("Déclarer des heures")
// ─────────────────────────────────────────────────────────────

function DeclareHeureSupModal({
  onClose,
  onCreated,
  pushToast,
}: {
  onClose: () => void;
  onCreated: () => Promise<void>;
  pushToast: (type: Toast['type'], message: string) => void;
}) {
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [loadingEmployes, setLoadingEmployes] = useState(true);

  const [idEmploye, setIdEmploye] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [duree, setDuree] = useState('');
  const [motif, setMotif] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Charger la liste des employés au montage de la modale
  useEffect(() => {
    const fetchEmployes = async () => {
      try {
        const response = await fetch(`${API_BASE}/employes`);
        const json = await response.json();
        if (json.success && json.data) {
          setEmployes(json.data);
          // Auto-sélectionner le premier employé de la liste s'il y en a
          if (json.data.length > 0) {
            setIdEmploye(json.data[0].id_employe);
          }
        }
      } catch (err) {
        console.error("Impossible de charger les employés", err);
        setFormError("Impossible de charger la liste des employés.");
      } finally {
        setLoadingEmployes(false);
      }
    };
    
    fetchEmployes();
  }, []);

  const handleSubmit = async () => {
    setFormError(null);

    if (!idEmploye.trim()) {
      setFormError("Veuillez sélectionner un employé.");
      return;
    }
    if (!dateDebut) {
      setFormError('La date des heures effectuées est requise.');
      return;
    }
    const dureeNum = Number(duree);
    if (!duree || Number.isNaN(dureeNum) || dureeNum <= 0) {
      setFormError('Le nombre d\'heures doit être un nombre supérieur à 0.');
      return;
    }
    if (!motif.trim()) {
      setFormError('Le motif est requis.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE}/heures-supplementaires`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_employe: idEmploye.trim(),
          date_debut: dateDebut,
          duree: dureeNum,
          motif: motif.trim(),
        }),
      });

      const json: ApiSingleResponse = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(
          (json as any).message || `Erreur serveur (code ${response.status})`
        );
      }

      pushToast('success', 'Déclaration d\'heures créée avec succès.');
      await onCreated();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de la création de la déclaration.';
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
              Déclarer des heures supplémentaires
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Simulation — utile pour tester le flux de validation RH.
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
        <div className="px-6 py-5 space-y-4">
          {formError && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5">
                <AlertTriangle className="h-3 w-3" />
              </div>
              <span>{formError}</span>
            </div>
          )}

          {/* Menu déroulant pour l'employé */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Employé <span className="text-red-500">*</span>
            </label>
            {loadingEmployes ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des employés...
              </div>
            ) : (
              <select
                value={idEmploye}
                onChange={(e) => setIdEmploye(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              >
                <option value="" disabled>Sélectionnez un employé...</option>
                {employes.map((emp) => (
                  <option key={emp.id_employe} value={emp.id_employe}>
                    {emp.utilisateur?.prenom} {emp.utilisateur?.nom}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Date effectuée <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Nombre d'heures <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={duree}
                onChange={(e) => setDuree(e.target.value)}
                placeholder="Ex: 3.5"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Motif <span className="text-red-500">*</span>
            </label>
            <textarea
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              rows={3}
              placeholder="Ex: Clôture des inscriptions, support événement..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
            />
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
            Déclarer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────

export default function HeuresSupplementaires() {
  const [heuresSup, setHeuresSup] = useState<HeureSup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('');

  const [selectedHeureSup, setSelectedHeureSup] = useState<HeureSup | null>(null);
  const [showDeclareModal, setShowDeclareModal] = useState(false);

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

  // ── Fetch overtime requests ──
  const fetchHeuresSup = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/heures-supplementaires`, { signal });

      if (!response.ok) {
        throw new Error(`Erreur serveur (code ${response.status})`);
      }

      const json: ApiListResponse = await response.json();

      if (!json.success) {
        throw new Error('La requête a échoué côté serveur.');
      }

      setHeuresSup(json.data);
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
    fetchHeuresSup(controller.signal);
    return () => controller.abort();
  }, [fetchHeuresSup]);

  // ── Client-side filtering ──
  const filteredHeuresSup = heuresSup.filter((hs) => {
    const fullName = `${hs.employe.utilisateur.prenom} ${hs.employe.utilisateur.nom}`.toLowerCase();
    const matchesSearch = !searchInput.trim() || fullName.includes(searchInput.trim().toLowerCase());
    const matchesStatut = !statutFilter || hs.statut === statutFilter;
    return matchesSearch && matchesStatut;
  });

  // Sum of validated hours in the currently filtered view (small useful stat)
  const totalHeuresValidees = filteredHeuresSup
    .filter((hs) => hs.statut === 'Validee')
    .reduce((sum, hs) => sum + Number(hs.duree || 0), 0);

  return (
    <div className="sc-portal min-h-screen p-6 md:p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/30">
              <Clock className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
                Heures Supplémentaires
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Consultez et validez les déclarations d'heures supplémentaires des employés.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowDeclareModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-soft hover:shadow-soft-hover transition-all whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Déclarer des heures (Simulation)
          </button>
        </header>

        {/* Quick stat */}
        {!loading && filteredHeuresSup.length > 0 && (
          <div className="card p-4 mb-6 flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
              <Hourglass className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total des heures validées (vue actuelle)</p>
              <p className="text-lg font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{totalHeuresValidees} h</p>
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div className="card p-4 mb-6 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher par nom d'employé..."
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

        {/* Error state */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 mb-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 mx-auto mb-2">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/70 dark:divide-slate-800">
              <thead className="bg-surface dark:bg-surface-dark/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Employé
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Date effectuée
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Nombre d'heures
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Motif
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
                          <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-14 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-40 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 w-20 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredHeuresSup.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30 mx-auto mb-2">
                        <Clock className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Aucune déclaration d'heures supplémentaires ne correspond aux critères sélectionnés.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredHeuresSup.map((hs) => {
                    const { nom, prenom } = hs.employe.utilisateur;
                    return (
                      <tr key={hs.id_demande_rh} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-xs font-bold">
                              {prenom?.[0]}
                              {nom?.[0]}
                            </div>
                            <span className="text-sm font-medium text-slate-800 dark:text-white">
                              {prenom} {nom}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 tabular-nums">
                          <span className="flex items-center gap-1.5">
                            <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              <Calendar className="h-3.5 w-3.5" />
                            </div>
                            {formatDateFr(hs.date_debut)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap tabular-nums tracking-tight">
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                            <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              <Hourglass className="h-3.5 w-3.5" />
                            </div>
                            {hs.duree} h
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate" title={hs.motif}>
                          {hs.motif}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatutBadgeClasses(
                              hs.statut
                            )}`}
                          >
                            {formatStatutLabel(hs.statut)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => setSelectedHeureSup(hs)}
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
      {selectedHeureSup && (
        <ProcessHeureSupModal
          heureSup={selectedHeureSup}
          onClose={() => setSelectedHeureSup(null)}
          onSaved={() => fetchHeuresSup()}
          pushToast={pushToast}
        />
      )}

      {/* Declare (Simulation) Modal */}
      {showDeclareModal && (
        <DeclareHeureSupModal
          onClose={() => setShowDeclareModal(false)}
          onCreated={() => fetchHeuresSup()}
          pushToast={pushToast}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}