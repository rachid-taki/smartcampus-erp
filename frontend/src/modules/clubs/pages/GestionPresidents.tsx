import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield,
  User,
  Calendar,
  Pencil,
  Mail,
  Search,
  Loader2,
  X,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Users,
  ShieldCheck,
  ShieldOff,
  Building2,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

type StatutMandat = 'Actif' | 'Expire';

interface Utilisateur {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
}

interface Etudiant {
  utilisateur?: Utilisateur;
}

interface ClubInfo {
  nom: string;
  statut?: string;
}

interface PresidentClub {
  id_president: string;
  date_designation: string;
  date_fin_mandat: string | null;
  statut: StatutMandat;
  etudiant?: Etudiant;
  club?: ClubInfo;
}

interface ApiListResponse {
  success: boolean;
  count: number;
  data: PresidentClub[];
}

interface ApiSingleResponse {
  success: boolean;
  message?: string;
  data: PresidentClub;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const API_BASE = 'http://localhost:3000/api/presidents';

const STATUT_OPTIONS: StatutMandat[] = ['Actif', 'Expire'];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const formatDateFr = (isoDate: string | null | undefined): string => {
  if (!isoDate) return 'En cours';
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

const getStatutBadgeClasses = (statut: StatutMandat): string => {
  const map: Record<StatutMandat, string> = {
    Actif: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800',
    Expire: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
  };
  return map[statut] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
};

const getInitials = (nom?: string, prenom?: string): string =>
  `${prenom?.[0] || ''}${nom?.[0] || ''}`.toUpperCase() || '?';

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
            {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
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
// Processing Modal ("Gérer le mandat")
// ─────────────────────────────────────────────────────────────

function ManageMandateModal({
  president,
  onClose,
  onSaved,
  pushToast,
}: {
  president: PresidentClub;
  onClose: () => void;
  onSaved: () => Promise<void>;
  pushToast: (type: Toast['type'], message: string) => void;
}) {
  const [statut, setStatut] = useState<StatutMandat>(president.statut);
  const [dateFinMandat, setDateFinMandat] = useState(
    toDateInputValue(president.date_fin_mandat)
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const nom = president.etudiant?.utilisateur?.nom || 'N/A';
  const prenom = president.etudiant?.utilisateur?.prenom || 'N/A';
  const email = president.etudiant?.utilisateur?.email || 'N/A';
  const clubNom = president.club?.nom || 'N/A';

  const handleSubmit = async () => {
    setFormError(null);
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        statut,
        date_fin_mandat: dateFinMandat || null,
      };

      const response = await fetch(`${API_BASE}/${president.id_president}`, {
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

      pushToast('success', json.message || 'Mandat mis à jour avec succès.');
      await onSaved();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de la mise à jour du mandat.';
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
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white tracking-tight">Gérer le mandat</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {prenom} {nom} • {clubNom}
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

          {/* Context: read-only info */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3 border border-slate-200/70 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-700">
                  <User className="h-3.5 w-3.5" />
                </div>
                Président
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-200">
                {prenom} {nom}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-700">
                  <Mail className="h-3.5 w-3.5" />
                </div>
                Email
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-200 truncate max-w-[200px]">{email}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-700">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                Club
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-200">{clubNom}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-700">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
                Date de début
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-200 tabular-nums">
                {formatDateFr(president.date_designation)}
              </span>
            </div>
          </div>

          <hr className="border-slate-200/70 dark:border-slate-800" />

          {/* Mandate update form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Statut
              </label>
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value as StatutMandat)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              >
                {STATUT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === 'Actif' ? 'Actif' : 'Expiré'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Date de fin de mandat
              </label>
              <input
                type="date"
                value={dateFinMandat}
                onChange={(e) => setDateFinMandat(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              />
            </div>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            Laissez la date de fin vide pour un mandat toujours en cours.
          </p>
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

export default function GestionPresidents() {
  const [presidents, setPresidents] = useState<PresidentClub[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('');

  const [selectedPresident, setSelectedPresident] = useState<PresidentClub | null>(null);

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

  // ── Fetch presidents ──
  const fetchPresidents = useCallback(async (signal?: AbortSignal) => {
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

      setPresidents(json.data);
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
    fetchPresidents(controller.signal);
    return () => controller.abort();
  }, [fetchPresidents]);

  // ── Client-side filtering ──
  const filteredPresidents = presidents.filter((p) => {
    const nom = p.etudiant?.utilisateur?.nom || '';
    const prenom = p.etudiant?.utilisateur?.prenom || '';
    const clubNom = p.club?.nom || '';
    const searchTarget = `${prenom} ${nom} ${clubNom}`.toLowerCase();

    const matchesSearch =
      !searchInput.trim() || searchTarget.includes(searchInput.trim().toLowerCase());
    const matchesStatut = !statutFilter || p.statut === statutFilter;

    return matchesSearch && matchesStatut;
  });

  // ── KPI calculations ──
  const totalPresidents = presidents.length;
  const mandatsActifs = presidents.filter((p) => p.statut === 'Actif').length;
  const mandatsExpires = presidents.filter((p) => p.statut === 'Expire').length;

  // ───────────────────────────────────────────────────────────
  // Error State
  // ───────────────────────────────────────────────────────────

  if (error && !loading && presidents.length === 0) {
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
            onClick={() => fetchPresidents()}
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
            <Shield className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
              Présidents de Club
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Suivez et gérez les mandats des présidents des clubs étudiants.
            </p>
          </div>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <KpiCard
            label="Total Présidents"
            value={String(totalPresidents)}
            icon={<Users className="h-5 w-5" />}
            iconBg="bg-primary-50 dark:bg-primary-900/30"
            iconColor="text-primary-600 dark:text-primary-400"
          />
          <KpiCard
            label="Mandats Actifs"
            value={String(mandatsActifs)}
            icon={<ShieldCheck className="h-5 w-5" />}
            iconBg="bg-emerald-50 dark:bg-emerald-900/30"
            iconColor="text-emerald-600 dark:text-emerald-400"
          />
          <KpiCard
            label="Mandats Expirés"
            value={String(mandatsExpires)}
            icon={<ShieldOff className="h-5 w-5" />}
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
              placeholder="Rechercher par nom d'étudiant ou de club..."
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
                {s === 'Actif' ? 'Actif' : 'Expiré'}
              </option>
            ))}
          </select>
        </div>

        {/* Inline error banner */}
        {error && !loading && presidents.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex-shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <p className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</p>
            <button
              onClick={() => fetchPresidents()}
              className="text-sm font-medium text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline flex-shrink-0"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Table (Trombinoscope vibe) */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/70 dark:divide-slate-800">
              <thead className="bg-surface dark:bg-surface-dark/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Président
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Club
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Date de début
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Date de fin
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
                          <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
                          <div className="space-y-1.5">
                            <div className="h-3.5 w-28 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                            <div className="h-3 w-36 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
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
                        <div className="h-4 w-28 bg-slate-100 dark:bg-slate-800 rounded animate-pulse ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredPresidents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30 mx-auto mb-2">
                        <Shield className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Aucun président ne correspond aux critères sélectionnés.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredPresidents.map((p) => {
                    const nom = p.etudiant?.utilisateur?.nom || 'N/A';
                    const prenom = p.etudiant?.utilisateur?.prenom || 'N/A';
                    const email = p.etudiant?.utilisateur?.email || 'N/A';
                    const clubNom = p.club?.nom || 'N/A';

                    return (
                      <tr key={p.id_president} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${getAvatarColor(
                                p.id_president
                              )}`}
                            >
                              {getInitials(nom, prenom)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                                {prenom} {nom}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                                <div className="flex h-4 w-4 items-center justify-center rounded bg-slate-100 dark:bg-slate-800">
                                  <Mail className="h-2.5 w-2.5 flex-shrink-0" />
                                </div>
                                {email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                            <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              <Building2 className="h-3.5 w-3.5" />
                            </div>
                            {clubNom}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                          {formatDateFr(p.date_designation)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                          {p.date_fin_mandat ? (
                            formatDateFr(p.date_fin_mandat)
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 italic">En cours</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatutBadgeClasses(
                              p.statut
                            )}`}
                          >
                            {p.statut === 'Actif' ? 'Actif' : 'Expiré'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => setSelectedPresident(p)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                            Gérer le mandat
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
      {selectedPresident && (
        <ManageMandateModal
          president={selectedPresident}
          onClose={() => setSelectedPresident(null)}
          onSaved={() => fetchPresidents()}
          pushToast={pushToast}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}