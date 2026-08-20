import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  Activity,
  DollarSign,
  X,
  Loader2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  UserCircle2,
  Calendar,
  Building2,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

type StatutClub = 'Actif' | 'Inactif' | 'Suspendu';

interface Utilisateur {
  nom: string;
  prenom: string;
}

interface Etudiant {
  id_etudiant: string;
  cne?: string;
  utilisateur: Utilisateur;
}

interface PresidentClub {
  id_president?: string;
  id_etudiant?: string;
  etudiant?: Etudiant;
}

interface Club {
  id_club: string;
  nom: string;
  description: string | null;
  date_creation: string;
  statut: StatutClub;
  budget: string | number;
  president?: PresidentClub | null;
}

interface ApiListResponse {
  success: boolean;
  count: number;
  data: Club[];
}

interface ApiSingleResponse {
  success: boolean;
  message?: string;
  data: Club;
}

interface ApiDeleteResponse {
  success: boolean;
  message: string;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

interface ClubFormState {
  nom: string;
  description: string;
  budget: string;
  statut: StatutClub;
  id_etudiant: string;
}

const API_BASE = 'http://localhost:3000/api/clubs';
// Assurez-vous que cette URL permet de chercher par CNE (ex: ?cne=R123456)
const API_ETUDIANTS = 'http://localhost:3000/api/clubs/etudiants';

const STATUT_OPTIONS: StatutClub[] = ['Actif', 'Inactif', 'Suspendu'];

const emptyForm = (): ClubFormState => ({
  nom: '',
  description: '',
  budget: '',
  statut: 'Actif',
  id_etudiant: '',
});

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

const toNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
};

const formatCurrencyMAD = (value: string | number | null | undefined): string => {
  const n = toNumber(value);
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;
};

const getStatutBadgeClasses = (statut: StatutClub): string => {
  const map: Record<StatutClub, string> = {
    Actif: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800',
    Inactif: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    Suspendu: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800',
  };
  return map[statut] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
};

const getPresidentName = (club: Club): string => {
  const nom = club.president?.etudiant?.utilisateur?.nom;
  const prenom = club.president?.etudiant?.utilisateur?.prenom;
  if (!nom && !prenom) return 'Non assigné';
  return `${prenom || ''} ${nom || ''}`.trim();
};

const avatarPalette = [
  'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300',
  'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',
  'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
  'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300',
];

const getAvatarColor = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return avatarPalette[Math.abs(hash) % avatarPalette.length];
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
          <div className={`flex h-6 w-6 items-center justify-center rounded-full flex-shrink-0 mt-0.5 ${
            toast.type === 'success' 
              ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' 
              : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
          </div>
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
// KPI Card
// ─────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {label}
        </p>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Create/Edit Modal
// ─────────────────────────────────────────────────────────────

function ClubFormModal({
  mode,
  initialData,
  onClose,
  onSaved,
  pushToast,
}: {
  mode: 'create' | 'edit';
  initialData: Club | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
  pushToast: (type: Toast['type'], message: string) => void;
}) {
  const [form, setForm] = useState<ClubFormState>(() => {
    if (mode === 'edit' && initialData) {
      return {
        nom: initialData.nom,
        description: initialData.description || '',
        budget: String(toNumber(initialData.budget)),
        statut: initialData.statut,
        id_etudiant: initialData.president?.id_etudiant || initialData.president?.etudiant?.id_etudiant || '',
      };
    }
    return emptyForm();
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // States pour la recherche par CNE
  const [cneInput, setCneInput] = useState('');
  const [searchingCne, setSearchingCne] = useState(false);
  const [cneError, setCneError] = useState<string | null>(null);
  
  // Si on est en mode édition et qu'il y a un président, on le pré-charge visuellement
  const [verifiedEtudiant, setVerifiedEtudiant] = useState<Etudiant | null>(() => {
    if (mode === 'edit' && initialData?.president?.etudiant) {
      return initialData.president.etudiant;
    }
    return null;
  });

  const updateField = (field: keyof ClubFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ── Recherche d'un étudiant par CNE ──
  const handleSearchCne = async () => {
    if (!cneInput.trim()) return;
    setSearchingCne(true);
    setCneError(null);
    setVerifiedEtudiant(null);
    updateField('id_etudiant', '');

    try {
      // Ajustez cette URL selon votre configuration backend réelle
      const response = await fetch(`${API_ETUDIANTS}?cne=${cneInput.trim()}`);
      const json = await response.json();

      if (response.ok && json.success && json.data) {
        // Gère le cas où l'API renvoie un tableau ou un objet direct
        const studentData = Array.isArray(json.data) ? json.data[0] : json.data;
        
        if (studentData && studentData.id_etudiant) {
          setVerifiedEtudiant(studentData);
          updateField('id_etudiant', studentData.id_etudiant);
          setCneError(null);
        } else {
          setCneError("Aucun étudiant trouvé avec ce CNE.");
        }
      } else {
        setCneError(json.message || "Aucun étudiant trouvé avec ce CNE.");
      }
    } catch (err) {
      setCneError("Erreur de connexion lors de la recherche.");
    } finally {
      setSearchingCne(false);
    }
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (!form.nom.trim()) {
      setFormError('Le nom du club est requis.');
      return;
    }

    const budgetNum = Number(form.budget);
    if (form.budget === '' || Number.isNaN(budgetNum) || budgetNum < 0) {
      setFormError('Le budget doit être un nombre positif ou nul.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        nom: form.nom.trim(),
        description: form.description.trim() || undefined,
        budget: budgetNum,
        statut: form.statut,
        id_etudiant: form.id_etudiant || undefined,
      };

      const url = mode === 'create' ? API_BASE : `${API_BASE}/${initialData?.id_club}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json: ApiSingleResponse = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(
          (json as any).message || `Erreur serveur (code ${response.status})`
        );
      }

      pushToast(
        'success',
        mode === 'create' ? 'Club créé avec succès.' : 'Club mis à jour avec succès.'
      );
      await onSaved();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de l'enregistrement.";
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
              {mode === 'create' ? 'Nouveau Club' : 'Modifier le Club'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {mode === 'create'
                ? 'Renseignez les informations pour créer un nouveau club.'
                : 'Mettez à jour les informations du club.'}
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

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Nom du club <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nom}
              onChange={(e) => updateField('nom', e.target.value)}
              placeholder="Ex: Club Robotique"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              placeholder="Décrivez la mission et les activités du club..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Budget (DH) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.budget}
                onChange={(e) => updateField('budget', e.target.value)}
                placeholder="Ex: 5000"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Statut
              </label>
              <select
                value={form.statut}
                onChange={(e) => updateField('statut', e.target.value as StatutClub)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              >
                {STATUT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* NOUVEAU BLOC : Assignation du Président par CNE                 */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Président du Club (Recherche par CNE)
            </label>

            {!verifiedEtudiant ? (
              // Affichage du champ de recherche si aucun étudiant n'est vérifié
              <div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cneInput}
                    onChange={(e) => setCneInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearchCne(); }}
                    placeholder="Saisissez le CNE (ex: R123456789)"
                    className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                  <button
                    type="button"
                    onClick={handleSearchCne}
                    disabled={searchingCne || !cneInput.trim()}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {searchingCne ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </button>
                </div>
                {cneError && <p className="text-xs text-red-500 mt-1.5">{cneError}</p>}
                <p className="text-[11px] text-slate-400 mt-1.5">
                  L'étudiant sera automatiquement défini comme président si le CNE est valide.
                </p>
              </div>
            ) : (
              // Affichage de l'étudiant vérifié avec possibilité d'annuler
              <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                      {verifiedEtudiant.utilisateur.prenom} {verifiedEtudiant.utilisateur.nom}
                    </p>
                    <p className="text-[11px] text-green-600 dark:text-green-400">Président assigné</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setVerifiedEtudiant(null);
                    updateField('id_etudiant', '');
                    setCneInput('');
                  }}
                  title="Changer de président"
                  className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 p-1.5 rounded-md hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
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
            {mode === 'create' ? 'Créer le club' : 'Enregistrer les modifications'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Delete Confirmation Modal
// ─────────────────────────────────────────────────────────────

function DeleteConfirmModal({
  club,
  onClose,
  onDeleted,
  pushToast,
}: {
  club: Club;
  onClose: () => void;
  onDeleted: () => Promise<void>;
  pushToast: (type: Toast['type'], message: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleteError(null);
    setDeleting(true);

    try {
      const response = await fetch(`${API_BASE}/${club.id_club}`, {
        method: 'DELETE',
      });

      const json: ApiDeleteResponse = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || `Erreur serveur (code ${response.status})`);
      }

      pushToast('success', json.message || 'Club supprimé avec succès.');
      await onDeleted();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de la suppression du club.';
      setDeleteError(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-surface-dark/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={() => !deleting && onClose()}
    >
      <div
        className="card p-0 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400">
            <Trash2 className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-2 tracking-tight">
            Supprimer le club ?
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
            Vous êtes sur le point de supprimer définitivement :
          </p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white mb-4">"{club.nom}"</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Cette action est irréversible et ne peut pas être annulée.
          </p>

          {deleteError && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400 text-left">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5">
                <AlertTriangle className="h-3 w-3" />
              </div>
              <span>{deleteError}</span>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-3 px-6 py-4 border-t border-slate-200/70 dark:border-slate-800 bg-surface dark:bg-surface-dark/50 rounded-b-card">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-soft transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────

export default function GestionClubs() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('');

  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [clubToDelete, setClubToDelete] = useState<Club | null>(null);

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

  // ── Fetch clubs ──
  const fetchClubs = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_BASE, { signal });

      if (!response.ok) {
        throw new Error(`Erreur serveur (code ${response.status})`);
      }

      const json: ApiListResponse = await response.json();

      if (!json.success) {
        throw new Error('La requête a échoué côté serveur.');
      }

      setClubs(json.data);
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
    fetchClubs(controller.signal);
    return () => controller.abort();
  }, [fetchClubs]);

  // ── Modal open helpers ──
  const handleOpenCreate = () => {
    setFormMode('create');
    setSelectedClub(null);
    setShowFormModal(true);
  };

  const handleOpenEdit = (club: Club) => {
    setFormMode('edit');
    setSelectedClub(club);
    setShowFormModal(true);
  };

  // ── Client-side filtering ──
  const filteredClubs = clubs.filter((club) => {
    const matchesSearch =
      !searchInput.trim() || club.nom.toLowerCase().includes(searchInput.trim().toLowerCase());
    const matchesStatut = !statutFilter || club.statut === statutFilter;
    return matchesSearch && matchesStatut;
  });

  // ── KPI calculations ──
  const totalClubs = clubs.length;
  const clubsActifs = clubs.filter((c) => c.statut === 'Actif').length;
  const budgetTotal = clubs.reduce((sum, c) => sum + toNumber(c.budget), 0);

  // ───────────────────────────────────────────────────────────
  // Error State
  // ───────────────────────────────────────────────────────────

  if (error && !loading && clubs.length === 0) {
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
            onClick={() => fetchClubs()}
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
            <Building2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
              Gestion des Clubs
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Créez, gérez et suivez les clubs étudiants du campus.
            </p>
          </div>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <KpiCard
            label="Total Clubs"
            value={String(totalClubs)}
            icon={<Users className="h-5 w-5" />}
            iconBg="bg-primary-50 dark:bg-primary-900/30"
            iconColor="text-primary-600 dark:text-primary-400"
          />
          <KpiCard
            label="Clubs Actifs"
            value={String(clubsActifs)}
            icon={<Activity className="h-5 w-5" />}
            iconBg="bg-emerald-50 dark:bg-emerald-900/30"
            iconColor="text-emerald-600 dark:text-emerald-400"
          />
          <KpiCard
            label="Budget Total Alloué"
            value={formatCurrencyMAD(budgetTotal)}
            icon={<DollarSign className="h-5 w-5" />}
            iconBg="bg-amber-50 dark:bg-amber-900/30"
            iconColor="text-amber-600 dark:text-amber-400"
          />
        </div>

        {/* Filter bar */}
        <div className="card p-4 mb-6 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher par nom de club..."
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
                {s}
              </option>
            ))}
          </select>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-soft hover:shadow-soft-hover transition-all whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Nouveau Club
          </button>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/70 dark:divide-slate-800">
              <thead className="bg-surface dark:bg-surface-dark/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Nom du Club
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Président
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Date de création
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Budget
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
                        <div className="h-4 w-28 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 w-16 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredClubs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30 mx-auto mb-2">
                        <Building2 className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Aucun club ne correspond aux critères sélectionnés.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredClubs.map((club) => {
                    const presidentName = getPresidentName(club);
                    const hasPresident = presidentName !== 'Non assigné';

                    return (
                      <tr key={club.id_club} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${getAvatarColor(
                                club.id_club
                              )}`}
                            >
                              {club.nom?.[0]?.toUpperCase() || '?'}
                            </div>
                            <span className="text-sm font-medium text-slate-800 dark:text-white">
                              {club.nom}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {hasPresident ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                              <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                <UserCircle2 className="h-3.5 w-3.5" />
                              </div>
                              {presidentName}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-500 dark:text-slate-400 italic">Non assigné</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                          <span className="inline-flex items-center gap-1.5">
                            <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              <Calendar className="h-3.5 w-3.5" />
                            </div>
                            {formatDateFr(club.date_creation)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-200 tabular-nums tracking-tight">
                          {formatCurrencyMAD(club.budget)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatutBadgeClasses(
                              club.statut
                            )}`}
                          >
                            {club.statut}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(club)}
                              title="Modifier le club"
                              aria-label="Modifier le club"
                              className="p-2 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setClubToDelete(club)}
                              title="Supprimer le club"
                              aria-label="Supprimer le club"
                              className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
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

      {/* Create/Edit Modal */}
      {showFormModal && (
        <ClubFormModal
          mode={formMode}
          initialData={selectedClub}
          onClose={() => setShowFormModal(false)}
          onSaved={() => fetchClubs()}
          pushToast={pushToast}
        />
      )}

      {/* Delete Confirmation Modal */}
      {clubToDelete && (
        <DeleteConfirmModal
          club={clubToDelete}
          onClose={() => setClubToDelete(null)}
          onDeleted={() => fetchClubs()}
          pushToast={pushToast}
        />
      )}

      {/* Toasts */}
      <div className="z-[9999] relative">
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </div>
  );
}