import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CalendarDays,
  Clock,
  CheckCircle,
  X,
  AlertTriangle,
  RefreshCw,
  Search,
  Plus,
  Shield,
  Loader2,
  FileText,
  User,
  Tent,
  DollarSign,
  Tag
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

type TypeDemande = 'Evenement' | 'Salle' | 'Materiel' | 'Budget' | 'Communication' | 'Sponsoring';
type StatutDemande = 'Soumise' | 'En_Revue' | 'Approuvee' | 'Rejetee';

interface Utilisateur {
  nom: string;
  prenom: string;
}

interface Etudiant {
  utilisateur: Utilisateur;
}

interface President {
  etudiant?: Etudiant;
}

interface Club {
  id_club?: string;
  nom: string;
}

interface DemandeClub {
  id_demande_club: string;
  id_club: string;
  id_president: string;
  type: TypeDemande;
  objet: string;
  description?: string | null;
  date_demande: string;
  statut: StatutDemande;
  date_evenement?: string | null;
  heure_debut?: string | null;
  heure_fin?: string | null;
  budget_demande?: string | number | null;
  club?: Club;
  president?: President;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const API_BASE = 'http://localhost:3000/api/evenements';
const API_CLUBS = 'http://localhost:3000/api/clubs';

const TYPE_OPTIONS: TypeDemande[] = ['Evenement', 'Salle', 'Materiel', 'Budget', 'Communication', 'Sponsoring'];
const STATUT_OPTIONS: StatutDemande[] = ['Soumise', 'En_Revue', 'Approuvee', 'Rejetee'];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const formatDateFr = (isoDate: string | null | undefined): string => {
  if (!isoDate) return 'Non définie';
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

const formatTimeFr = (isoTime: string | null | undefined): string => {
  if (!isoTime) return '';
  try {
    return new Date(isoTime).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    });
  } catch {
    return isoTime;
  }
};

const formatCurrencyMAD = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return '-';
  const n = Number(value);
  if (Number.isNaN(n) || n === 0) return '-';
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;
};

const getStatutBadgeClasses = (statut: StatutDemande): string => {
  const map: Record<StatutDemande, string> = {
    Soumise: 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800',
    En_Revue: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    Approuvee: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800',
    Rejetee: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800',
  };
  return map[statut] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
};

const getTypeBadgeClasses = (type: TypeDemande): string => {
  const map: Record<TypeDemande, string> = {
    Evenement: 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800',
    Salle: 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800',
    Materiel: 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800',
    Budget: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    Communication: 'bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800',
    Sponsoring: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800',
  };
  return map[type] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
};

// ─────────────────────────────────────────────────────────────
// Toast Container
// ─────────────────────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
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
          <button onClick={() => onDismiss(toast.id)} className="opacity-60 hover:opacity-100 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Create Demande Modal
// ─────────────────────────────────────────────────────────────

function CreateDemandeModal({
  onClose,
  onSaved,
  pushToast,
}: {
  onClose: () => void;
  onSaved: () => Promise<void>;
  pushToast: (type: Toast['type'], message: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // États pour les listes déroulantes
  const [clubs, setClubs] = useState<{ id_club: string; nom: string }[]>([]);
  const [presidents, setPresidents] = useState<any[]>([]);
  const [loadingPresidents, setLoadingPresidents] = useState(true);

  const [form, setForm] = useState({
    id_club: '',
    id_president: '',
    type: 'Evenement' as TypeDemande,
    objet: '',
    description: '',
    date_evenement: '',
    heure_debut: '',
    heure_fin: '',
    budget_demande: '',
  });

  useEffect(() => {
    // 1. Charger les clubs
    fetch(API_CLUBS)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setClubs(json.data);
      })
      .catch((err) => console.error('Erreur chargement clubs:', err));

    // 2. Charger les présidents
    setLoadingPresidents(true);
    fetch('http://localhost:3000/api/presidents')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setPresidents(json.data);
        }
      })
      .catch((err) => {
        console.error('Erreur chargement présidents:', err);
        setFormError("Impossible de charger la liste des présidents.");
      })
      .finally(() => setLoadingPresidents(false));
  }, []);

  const handleSubmit = async () => {
    setFormError(null);

    if (!form.id_club || !form.id_president || !form.objet || !form.type) {
      setFormError('Les champs Club, Président, Type et Objet sont obligatoires.');
      return;
    }

    if (form.heure_debut && form.heure_fin && form.heure_fin <= form.heure_debut) {
      setFormError("L'heure de fin doit être postérieure à l'heure de début.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        budget_demande: form.budget_demande ? Number(form.budget_demande) : undefined,
        date_evenement: form.date_evenement || undefined,
        heure_debut: form.heure_debut || undefined,
        heure_fin: form.heure_fin || undefined,
      };

      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Erreur serveur');
      }

      pushToast('success', 'Demande soumise avec succès.');
      await onSaved();
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-surface-dark/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => !saving && onClose()}>
      <div className="card p-0 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/70 dark:border-slate-800 sticky top-0 bg-card dark:bg-card-dark rounded-t-card z-10">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white tracking-tight">Soumettre une demande de club</h2>
          <button onClick={onClose} disabled={saving} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {formError && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5">
                <AlertTriangle className="h-3 w-3" />
              </div>
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Club demandeur <span className="text-red-500">*</span></label>
              <select
                value={form.id_club}
                onChange={(e) => setForm({ ...form, id_club: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              >
                <option value="">-- Sélectionner un club --</option>
                {clubs.map((c) => (
                  <option key={c.id_club} value={c.id_club}>{c.nom}</option>
                ))}
              </select>
            </div>
            
            {/* Menu déroulant dynamique pour le Président */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Président <span className="text-red-500">*</span></label>
              {loadingPresidents ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement...
                </div>
              ) : (
                <select
                  value={form.id_president}
                  onChange={(e) => setForm({ ...form, id_president: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                >
                  <option value="" disabled>-- Sélectionner un président --</option>
                  {presidents.map((p) => (
                    <option key={p.id_president} value={p.id_president}>
                      {p.etudiant?.utilisateur?.prenom} {p.etudiant?.utilisateur?.nom} {p.club?.nom ? `(${p.club.nom})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Type de demande <span className="text-red-500">*</span></label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as TypeDemande })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              >
                {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Objet <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.objet}
                onChange={(e) => setForm({ ...form, objet: e.target.value })}
                placeholder="Ex: Soirée d'intégration"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Détails de la demande..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/70 dark:border-slate-800">
            <div className="sm:col-span-3">
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Informations optionnelles (selon le type de demande) :</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Date prévue</label>
              <input
                type="date"
                value={form.date_evenement}
                onChange={(e) => setForm({ ...form, date_evenement: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Heure début</label>
              <input
                type="time"
                value={form.heure_debut}
                onChange={(e) => setForm({ ...form, heure_debut: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Heure fin</label>
              <input
                type="time"
                value={form.heure_fin}
                onChange={(e) => setForm({ ...form, heure_fin: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              />
            </div>
            <div className="sm:col-span-3 mt-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Budget demandé (MAD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.budget_demande}
                onChange={(e) => setForm({ ...form, budget_demande: e.target.value })}
                placeholder="Ex: 1500"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent tabular-nums"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200/70 dark:border-slate-800 sticky bottom-0 bg-card dark:bg-card-dark rounded-b-card">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-soft hover:shadow-soft-hover transition-all disabled:opacity-60 disabled:cursor-not-allowed">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Soumettre
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function GestionEvenements() {
  const [demandes, setDemandes] = useState<DemandeClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [demandeToProcess, setDemandeToProcess] = useState<DemandeClub | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((type: Toast['type'], message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(API_BASE);
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || 'Erreur de récupération');
      setDemandes(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredDemandes = demandes.filter((d) => {
    const searchStr = `${d.objet} ${d.club?.nom}`.toLowerCase();
    const matchesSearch = !searchInput.trim() || searchStr.includes(searchInput.toLowerCase());
    const matchesStatut = !statutFilter || d.statut === statutFilter;
    const matchesType = !typeFilter || d.type === typeFilter;
    return matchesSearch && matchesStatut && matchesType;
  });

  const enAttente = demandes.filter(d => d.statut === 'Soumise' || d.statut === 'En_Revue').length;
  const approuvees = demandes.filter(d => d.statut === 'Approuvee').length;

  return (
    <div className="sc-portal min-h-screen p-6 md:p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="flex items-center gap-3 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/30">
            <CalendarDays className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Événements & Demandes</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Gérez les initiatives et requêtes des clubs étudiants.</p>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card p-5">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Toutes les demandes</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/30">
                <FileText className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{demandes.length}</p>
          </div>
          <div className="card p-5">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">À traiter (En attente/Revue)</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{enAttente}</p>
          </div>
          <div className="card p-5">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Approuvées</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{approuvees}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher par objet ou club..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark text-slate-800 dark:text-white placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            />
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="md:w-48 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark text-slate-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          >
            <option value="">Tous les types</option>
            {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value)}
            className="md:w-48 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark text-slate-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          >
            <option value="">Tous les statuts</option>
            {STATUT_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-soft hover:shadow-soft-hover transition-all whitespace-nowrap"
          >
            <Plus className="h-4 w-4" /> Nouvelle Demande
          </button>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/70 dark:divide-slate-800">
              <thead className="bg-surface dark:bg-surface-dark/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Objet & Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Club / Demandeur</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date & Heure (Prévues)</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Budget</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary-500 dark:text-primary-400" /></td></tr>
                ) : filteredDemandes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30 mx-auto mb-2">
                        <CalendarDays className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Aucune demande trouvée.</p>
                    </td>
                  </tr>
                ) : (
                  filteredDemandes.map((d) => (
                    <tr key={d.id_demande_club} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-800 dark:text-white">{d.objet}</div>
                        <div className="mt-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getTypeBadgeClasses(d.type)}`}>
                            {d.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-primary-700 dark:text-primary-300">
                          <div className="flex h-5 w-5 items-center justify-center rounded bg-primary-50 dark:bg-primary-900/30">
                            <Tent className="h-3 w-3" />
                          </div>
                          {d.club?.nom}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          <div className="flex h-4 w-4 items-center justify-center rounded bg-slate-100 dark:bg-slate-800">
                            <User className="h-2.5 w-2.5" />
                          </div>
                          {d.president?.etudiant?.utilisateur?.prenom} {d.president?.etudiant?.utilisateur?.nom}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                        {d.date_evenement ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                <CalendarDays className="h-3.5 w-3.5" />
                              </div>
                              {formatDateFr(d.date_evenement)}
                            </div>
                            {(d.heure_debut || d.heure_fin) && (
                              <div className="flex items-center gap-1.5 mt-1 text-xs">
                                <div className="flex h-4 w-4 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                  <Clock className="h-3 w-3" />
                                </div>
                                {formatTimeFr(d.heure_debut)} {d.heure_fin ? `- ${formatTimeFr(d.heure_fin)}` : ''}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="italic text-slate-400 dark:text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-200 tabular-nums tracking-tight">
                        {d.budget_demande ? (
                          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                            <div className="flex h-5 w-5 items-center justify-center rounded bg-amber-50 dark:bg-amber-900/30">
                              <DollarSign className="h-3.5 w-3.5" />
                            </div>
                            {formatCurrencyMAD(d.budget_demande)}
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatutBadgeClasses(d.statut)}`}>
                          {d.statut.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setDemandeToProcess(d)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                        >
                          <Shield className="h-4 w-4" /> Traiter
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateDemandeModal onClose={() => setShowCreateModal(false)} onSaved={fetchData} pushToast={pushToast} />
      )}

      {demandeToProcess && (
        <ProcessDemandeModal demande={demandeToProcess} onClose={() => setDemandeToProcess(null)} onSaved={fetchData} pushToast={pushToast} />
      )}

      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts(t => t.filter(x => x.id !== id))} />
    </div>
  );
}