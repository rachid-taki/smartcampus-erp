import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Briefcase,
  Mail,
  Phone,
  Building2,
  BadgeCheck,
  Calendar,
  UserCircle2,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

type StatutEmploye = 'Actif' | 'Inactif' | 'Conge';

interface Utilisateur {
  id_utilisateur: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  actif: boolean;
}

interface Employe {
  id_employe: string;
  matricule: string;
  fonction: string;
  departement: string;
  date_embauche: string;
  statut: StatutEmploye;
  grade: string | null;
  utilisateur: Utilisateur;
}

interface ApiListResponse {
  success: boolean;
  count: number;
  data: Employe[];
}

interface ApiSingleResponse {
  success: boolean;
  message?: string;
  data: Employe;
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

interface EmployeFormState {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  matricule: string;
  fonction: string;
  departement: string;
  grade: string;
  date_embauche: string;
  statut: StatutEmploye;
}

const API_BASE = 'http://localhost:3000/api/rh';

const STATUT_OPTIONS: StatutEmploye[] = ['Actif', 'Inactif', 'Conge'];

const emptyForm = (): EmployeFormState => ({
  nom: '',
  prenom: '',
  email: '',
  telephone: '',
  matricule: '',
  fonction: '',
  departement: '',
  grade: '',
  date_embauche: '',
  statut: 'Actif',
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

const getInitials = (nom: string, prenom: string): string =>
  `${prenom?.[0] || ''}${nom?.[0] || ''}`.toUpperCase();

const getStatutBadgeClasses = (statut: StatutEmploye): string => {
  const map: Record<StatutEmploye, string> = {
    Actif: 'bg-green-100 text-green-700 border border-green-200',
    Conge: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    Inactif: 'bg-gray-100 text-gray-600 border border-gray-200',
  };
  return map[statut] ?? 'bg-gray-100 text-gray-600 border border-gray-200';
};

const getStatutLabel = (statut: StatutEmploye): string => {
  const map: Record<StatutEmploye, string> = {
    Actif: 'Actif',
    Conge: 'En congé',
    Inactif: 'Inactif',
  };
  return map[statut] ?? statut;
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
// Employe Form Modal (used for both Create and Edit)
// ─────────────────────────────────────────────────────────────

function EmployeFormModal({
  mode,
  initialData,
  onClose,
  onSaved,
  pushToast,
}: {
  mode: 'create' | 'edit';
  initialData: Employe | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
  pushToast: (type: Toast['type'], message: string) => void;
}) {
  const [form, setForm] = useState<EmployeFormState>(() => {
    if (mode === 'edit' && initialData) {
      return {
        nom: initialData.utilisateur.nom,
        prenom: initialData.utilisateur.prenom,
        email: initialData.utilisateur.email,
        telephone: initialData.utilisateur.telephone || '',
        matricule: initialData.matricule,
        fonction: initialData.fonction,
        departement: initialData.departement,
        grade: initialData.grade || '',
        date_embauche: initialData.date_embauche
          ? new Date(initialData.date_embauche).toISOString().slice(0, 10)
          : '',
        statut: initialData.statut,
      };
    }
    return emptyForm();
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const updateField = (field: keyof EmployeFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setFormError(null);

    // --- Client-side validation ---
    if (!form.nom.trim()) return setFormError('Le nom est requis.');
    if (!form.prenom.trim()) return setFormError('Le prénom est requis.');
    if (!form.email.trim()) return setFormError("L'email est requis.");
    if (mode === 'create' && !form.matricule.trim())
      return setFormError('Le matricule est requis.');
    if (!form.fonction.trim()) return setFormError('La fonction est requise.');
    if (!form.departement.trim()) return setFormError('Le département est requis.');

    setSaving(true);

    try {
      if (mode === 'create') {
        const payload = {
          nom: form.nom.trim(),
          prenom: form.prenom.trim(),
          email: form.email.trim(),
          telephone: form.telephone.trim() || undefined,
          matricule: form.matricule.trim(),
          fonction: form.fonction.trim(),
          departement: form.departement.trim(),
          grade: form.grade.trim() || undefined,
          date_embauche: form.date_embauche || undefined,
          statut: form.statut,
          // NOTE: id_role is required by the backend but not collected in
          // this form. Adjust once role assignment UI/logic is defined —
          // hardcoding a placeholder here so the request has a shape.
          id_role: (initialData as any)?.utilisateur?.id_role || undefined,
        };

        const response = await fetch(`${API_BASE}/employes`, {
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

        pushToast('success', 'Employé créé avec succès.');
      } else if (initialData) {
        const payload = {
          nom: form.nom.trim(),
          prenom: form.prenom.trim(),
          telephone: form.telephone.trim() || null,
          fonction: form.fonction.trim(),
          departement: form.departement.trim(),
          grade: form.grade.trim() || null,
          statut: form.statut,
        };

        const response = await fetch(`${API_BASE}/employes/${initialData.id_employe}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json: ApiSingleResponse = await response.json();

        if (!response.ok || !json.success) {
          throw new Error(
            (json as any).message || `Erreur serveur (code ${response.status})`
          );
        }

        pushToast('success', 'Employé mis à jour avec succès.');
      }

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
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-xl z-10">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {mode === 'create' ? 'Ajouter un employé' : "Modifier l'employé"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {mode === 'create'
                ? 'Renseignez les informations pour onboarder un nouvel employé.'
                : "Mettez à jour les informations de l'employé."}
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
        <div className="px-6 py-5 space-y-6">
          {formError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section: Informations Personnelles */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <UserCircle2 className="h-4 w-4 text-indigo-600" />
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Informations Personnelles
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={(e) => updateField('nom', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Prénom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.prenom}
                  onChange={(e) => updateField('prenom', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  disabled={mode === 'edit'}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={form.telephone}
                  onChange={(e) => updateField('telephone', e.target.value)}
                  placeholder="+212 6XX XXX XXX"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Section: Informations Professionnelles */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="h-4 w-4 text-indigo-600" />
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Informations Professionnelles
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Matricule {mode === 'create' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={form.matricule}
                  disabled={mode === 'edit'}
                  onChange={(e) => updateField('matricule', e.target.value)}
                  placeholder="Ex: EMP-2026-001"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Fonction <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.fonction}
                  onChange={(e) => updateField('fonction', e.target.value)}
                  placeholder="Ex: Chargé de scolarité"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Département <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.departement}
                  onChange={(e) => updateField('departement', e.target.value)}
                  placeholder="Ex: Scolarité"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Grade
                </label>
                <input
                  type="text"
                  value={form.grade}
                  onChange={(e) => updateField('grade', e.target.value)}
                  placeholder="Ex: Cadre"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Date d'embauche
                </label>
                <input
                  type="date"
                  value={form.date_embauche}
                  disabled={mode === 'edit'}
                  onChange={(e) => updateField('date_embauche', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Statut
                </label>
                <select
                  value={form.statut}
                  onChange={(e) => updateField('statut', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white"
                >
                  {STATUT_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {getStatutLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
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
            {mode === 'create' ? 'Créer' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Employee Table Row
// ─────────────────────────────────────────────────────────────

function EmployeRow({
  employe,
  onEdit,
  onRequestDelete,
  onCancelDelete,
  onDelete,
  confirmingId,
  deletingId,
}: {
  employe: Employe;
  onEdit: (employe: Employe) => void;
  onRequestDelete: (id: string) => void;
  onCancelDelete: () => void;
  onDelete: (id: string) => void;
  confirmingId: string | null;
  deletingId: string | null;
}) {
  const isConfirming = confirmingId === employe.id_employe;
  const isDeleting = deletingId === employe.id_employe;
  const { nom, prenom, email } = employe.utilisateur;

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${getAvatarColor(
              employe.id_employe
            )}`}
          >
            {getInitials(nom, prenom)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">
              {prenom} {nom}
            </p>
            <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
              <Mail className="h-3 w-3 flex-shrink-0" />
              {email}
            </p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-700">
          <BadgeCheck className="h-3.5 w-3.5 text-gray-400" />
          {employe.matricule}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <p className="text-sm text-gray-700">{employe.fonction}</p>
        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
          <Building2 className="h-3 w-3" />
          {employe.departement}
        </p>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatutBadgeClasses(
            employe.statut
          )}`}
        >
          {getStatutLabel(employe.statut)}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        {isConfirming ? (
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-gray-500">Confirmer ?</span>
            <button
              onClick={() => onDelete(employe.id_employe)}
              disabled={isDeleting}
              className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-60"
            >
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Oui'}
            </button>
            <button
              onClick={onCancelDelete}
              disabled={isDeleting}
              className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              Non
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => onEdit(employe)}
              title="Modifier l'employé"
              aria-label="Modifier l'employé"
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => onRequestDelete(employe.id_employe)}
              title="Désactiver l'employé"
              aria-label="Désactiver l'employé"
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────

export default function GestionEmployes() {
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('');

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedEmploye, setSelectedEmploye] = useState<Employe | null>(null);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  // ── Fetch employees ──
  const fetchEmployes = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/employes`, { signal });

      if (!response.ok) {
        throw new Error(`Erreur serveur (code ${response.status})`);
      }

      const json: ApiListResponse = await response.json();

      if (!json.success) {
        throw new Error('La requête a échoué côté serveur.');
      }

      setEmployes(json.data);
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
    fetchEmployes(controller.signal);
    return () => controller.abort();
  }, [fetchEmployes]);

  // ── Modal open helpers ──
  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedEmploye(null);
    setShowModal(true);
  };

  const handleOpenEdit = (employe: Employe) => {
    setModalMode('edit');
    setSelectedEmploye(employe);
    setShowModal(true);
  };

  // ── Delete flow ──
  const handleRequestDelete = (id: string) => setConfirmingId(id);
  const handleCancelDelete = () => setConfirmingId(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);

    try {
      const response = await fetch(`${API_BASE}/employes/${id}`, {
        method: 'DELETE',
      });

      const json: ApiDeleteResponse = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || `Erreur serveur (code ${response.status})`);
      }

      // Reflect the soft-delete locally rather than removing the row,
      // since the employee record still exists (statut -> Inactif).
      await fetchEmployes();
      pushToast('success', json.message || 'Employé désactivé avec succès.');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de la désactivation.';
      pushToast('error', message);
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  };

  // ── Client-side filtering ──
  const filteredEmployes = employes.filter((emp) => {
    const fullName = `${emp.utilisateur.prenom} ${emp.utilisateur.nom}`.toLowerCase();
    const matchesSearch =
      !searchInput.trim() ||
      fullName.includes(searchInput.trim().toLowerCase()) ||
      emp.matricule.toLowerCase().includes(searchInput.trim().toLowerCase());

    const matchesStatut = !statutFilter || emp.statut === statutFilter;

    return matchesSearch && matchesStatut;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                Gestion des Employés
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Gérez les profils, fonctions et statuts du personnel.
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Ajouter un employé
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
              placeholder="Rechercher par nom ou matricule..."
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
                {getStatutLabel(s)}
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
                    Matricule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Fonction &amp; Département
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
                          <div className="h-10 w-10 bg-gray-100 rounded-full animate-pulse" />
                          <div className="space-y-1.5">
                            <div className="h-3.5 w-32 bg-gray-100 rounded animate-pulse" />
                            <div className="h-3 w-40 bg-gray-100 rounded animate-pulse" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-3.5 w-28 bg-gray-100 rounded animate-pulse mb-1.5" />
                        <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-16 bg-gray-100 rounded animate-pulse ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredEmployes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">
                        Aucun employé ne correspond aux critères sélectionnés.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredEmployes.map((employe) => (
                    <EmployeRow
                      key={employe.id_employe}
                      employe={employe}
                      onEdit={handleOpenEdit}
                      onRequestDelete={handleRequestDelete}
                      onCancelDelete={handleCancelDelete}
                      onDelete={handleDelete}
                      confirmingId={confirmingId}
                      deletingId={deletingId}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <EmployeFormModal
          mode={modalMode}
          initialData={selectedEmploye}
          onClose={() => setShowModal(false)}
          onSaved={() => fetchEmployes()}
          pushToast={pushToast}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}