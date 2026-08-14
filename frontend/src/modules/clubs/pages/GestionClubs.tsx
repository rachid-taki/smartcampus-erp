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
  id_etudiant: string; // Ajout de l'ID étudiant
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
  id_etudiant: string; // NOUVEAU: Pour assigner le président
}

const API_BASE = 'http://localhost:3000/api/clubs';
// Assumons qu'une route permet de récupérer les étudiants pour le menu déroulant
const API_ETUDIANTS = 'http://localhost:3000/api/scolarite/etudiants'; 

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
    Actif: 'bg-green-100 text-green-700 border border-green-200',
    Inactif: 'bg-gray-100 text-gray-600 border border-gray-200',
    Suspendu: 'bg-red-100 text-red-700 border border-red-200',
  };
  return map[statut] ?? 'bg-gray-100 text-gray-600 border border-gray-200';
};

const getPresidentName = (club: Club): string => {
  const nom = club.president?.etudiant?.utilisateur?.nom;
  const prenom = club.president?.etudiant?.utilisateur?.prenom;
  if (!nom && !prenom) return 'Non assigné';
  return `${prenom || ''} ${nom || ''}`.trim();
};

const avatarPalette = [
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {label}
        </p>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
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
  const [etudiants, setEtudiants] = useState<Etudiant[]>([]);
  const [loadingEtudiants, setLoadingEtudiants] = useState(false);

  // Charger la liste des étudiants pour le selecteur de président
  useEffect(() => {
    setLoadingEtudiants(true);
    fetch(API_ETUDIANTS)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setEtudiants(json.data);
        }
      })
      .catch((err) => console.error('Erreur chargement étudiants:', err))
      .finally(() => setLoadingEtudiants(false));
  }, []);

  const updateField = (field: keyof ClubFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
        id_etudiant: form.id_etudiant || undefined, // Envoi de l'ID du président
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
              {mode === 'create' ? 'Nouveau Club' : 'Modifier le Club'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {mode === 'create'
                ? 'Renseignez les informations pour créer un nouveau club.'
                : 'Mettez à jour les informations du club.'}
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
              Nom du club <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nom}
              onChange={(e) => updateField('nom', e.target.value)}
              placeholder="Ex: Club Robotique"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              placeholder="Décrivez la mission et les activités du club..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Budget (DH) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.budget}
                onChange={(e) => updateField('budget', e.target.value)}
                placeholder="Ex: 5000"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Statut
              </label>
              <select
                value={form.statut}
                onChange={(e) => updateField('statut', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white"
              >
                {STATUT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SÉLECTEUR DE PRÉSIDENT */}
          <div className="pt-2 border-t border-gray-100">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Président du Club (Optionnel)
            </label>
            {loadingEtudiants ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement des étudiants...
              </div>
            ) : (
              <select
                value={form.id_etudiant}
                onChange={(e) => updateField('id_etudiant', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white"
              >
                <option value="">-- Aucun président assigné --</option>
                {etudiants.map((etu) => (
                  <option key={etu.id_etudiant} value={etu.id_etudiant}>
                    {etu.utilisateur.prenom} {etu.utilisateur.nom}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Sélectionnez un étudiant pour lui attribuer le rôle de président.
            </p>
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
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !deleting && onClose()}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <Trash2 className="h-7 w-7 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Supprimer le club ?
          </h2>
          <p className="text-sm text-gray-500 mb-1">
            Vous êtes sur le point de supprimer définitivement :
          </p>
          <p className="text-sm font-semibold text-gray-800 mb-4">"{club.nom}"</p>
          <p className="text-xs text-gray-400">
            Cette action est irréversible et ne peut pas être annulée.
          </p>

          {deleteError && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700 text-left">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{deleteError}</span>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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

  // ── KPI calculations (based on the full unfiltered list) ──
  const totalClubs = clubs.length;
  const clubsActifs = clubs.filter((c) => c.statut === 'Actif').length;
  const budgetTotal = clubs.reduce((sum, c) => sum + toNumber(c.budget), 0);

  // ───────────────────────────────────────────────────────────
  // Error State (full page, only when nothing has loaded yet)
  // ───────────────────────────────────────────────────────────

  if (error && !loading && clubs.length === 0) {
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
            onClick={() => fetchClubs()}
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
            <Building2 className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Gestion des Clubs
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
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
            iconBg="bg-indigo-100"
            iconColor="text-indigo-600"
          />
          <KpiCard
            label="Clubs Actifs"
            value={String(clubsActifs)}
            icon={<Activity className="h-5 w-5" />}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
          />
          <KpiCard
            label="Budget Total Alloué"
            value={formatCurrencyMAD(budgetTotal)}
            icon={<DollarSign className="h-5 w-5" />}
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
          />
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher par nom de club..."
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
                {s}
              </option>
            ))}
          </select>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Nouveau Club
          </button>
        </div>

        {/* Inline error banner (shown if a retry fails but stale data remains) */}
        {error && !loading && clubs.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 flex-1">{error}</p>
            <button
              onClick={() => fetchClubs()}
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
                    Nom du Club
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Président
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date de création
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Budget
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
                        <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-16 bg-gray-100 rounded animate-pulse ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredClubs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Building2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">
                        Aucun club ne correspond aux critères sélectionnés.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredClubs.map((club) => {
                    const presidentName = getPresidentName(club);
                    const hasPresident = presidentName !== 'Non assigné';

                    return (
                      <tr key={club.id_club} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${getAvatarColor(
                                club.id_club
                              )}`}
                            >
                              {club.nom?.[0]?.toUpperCase() || '?'}
                            </div>
                            <span className="text-sm font-medium text-gray-800">
                              {club.nom}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {hasPresident ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                              <UserCircle2 className="h-3.5 w-3.5 text-gray-400" />
                              {presidentName}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400 italic">Non assigné</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            {formatDateFr(club.date_creation)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
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
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setClubToDelete(club)}
                              title="Supprimer le club"
                              aria-label="Supprimer le club"
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}