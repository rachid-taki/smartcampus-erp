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
const API_CLUBS = 'http://localhost:3000/api/clubs'; // Pour récupérer la liste des clubs dans le formulaire

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
    Soumise: 'bg-blue-100 text-blue-700 border border-blue-200',
    En_Revue: 'bg-amber-100 text-amber-700 border border-amber-200',
    Approuvee: 'bg-green-100 text-green-700 border border-green-200',
    Rejetee: 'bg-red-100 text-red-700 border border-red-200',
  };
  return map[statut] ?? 'bg-gray-100 text-gray-600 border border-gray-200';
};

const getTypeBadgeClasses = (type: TypeDemande): string => {
  const map: Record<TypeDemande, string> = {
    Evenement: 'bg-violet-100 text-violet-700',
    Salle: 'bg-indigo-100 text-indigo-700',
    Materiel: 'bg-sky-100 text-sky-700',
    Budget: 'bg-emerald-100 text-emerald-700',
    Communication: 'bg-pink-100 text-pink-700',
    Sponsoring: 'bg-orange-100 text-orange-700',
  };
  return map[type] ?? 'bg-gray-100 text-gray-700';
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
          <button onClick={() => onDismiss(toast.id)} className="opacity-60 hover:opacity-100">
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
  const [clubs, setClubs] = useState<{ id_club: string; nom: string }[]>([]);

  const [form, setForm] = useState({
    id_club: '',
    id_president: '', // UUID temporaire en attendant le contexte d'authentification
    type: 'Evenement' as TypeDemande,
    objet: '',
    description: '',
    date_evenement: '',
    heure_debut: '',
    heure_fin: '',
    budget_demande: '',
  });

  useEffect(() => {
    fetch(API_CLUBS)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setClubs(json.data);
      })
      .catch((err) => console.error('Erreur chargement clubs:', err));
  }, []);

  const handleSubmit = async () => {
    setFormError(null);

    if (!form.id_club || !form.id_president || !form.objet || !form.type) {
      setFormError('Les champs Club, ID Président, Type et Objet sont obligatoires.');
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && onClose()}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-800">Soumettre une demande de club</h2>
          <button onClick={onClose} disabled={saving} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {formError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Club demandeur <span className="text-red-500">*</span></label>
              <select
                value={form.id_club}
                onChange={(e) => setForm({ ...form, id_club: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">-- Sélectionner un club --</option>
                {clubs.map((c) => (
                  <option key={c.id_club} value={c.id_club}>{c.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">ID Président (Temporaire) <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.id_president}
                onChange={(e) => setForm({ ...form, id_president: e.target.value })}
                placeholder="UUID du président..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Type de demande <span className="text-red-500">*</span></label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as TypeDemande })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
              >
                {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Objet <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.objet}
                onChange={(e) => setForm({ ...form, objet: e.target.value })}
                placeholder="Ex: Soirée d'intégration"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Détails de la demande..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
            <div className="sm:col-span-3">
              <p className="text-xs text-gray-400 mb-2">Informations optionnelles (selon le type de demande) :</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date prévue</label>
              <input
                type="date"
                value={form.date_evenement}
                onChange={(e) => setForm({ ...form, date_evenement: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Heure début</label>
              <input
                type="time"
                value={form.heure_debut}
                onChange={(e) => setForm({ ...form, heure_debut: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Heure fin</label>
              <input
                type="time"
                value={form.heure_fin}
                onChange={(e) => setForm({ ...form, heure_fin: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-3 mt-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Budget demandé (MAD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.budget_demande}
                onChange={(e) => setForm({ ...form, budget_demande: e.target.value })}
                placeholder="Ex: 1500"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Soumettre
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Process Demande Modal (Validation)
// ─────────────────────────────────────────────────────────────

function ProcessDemandeModal({
  demande,
  onClose,
  onSaved,
  pushToast,
}: {
  demande: DemandeClub;
  onClose: () => void;
  onSaved: () => Promise<void>;
  pushToast: (type: Toast['type'], message: string) => void;
}) {
  const [statut, setStatut] = useState<StatutDemande>(demande.statut === 'Soumise' ? 'En_Revue' : demande.statut);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/${demande.id_demande_club}/statut`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message);

      pushToast('success', 'Statut mis à jour avec succès.');
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && onClose()}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Traiter la demande</h2>
          
          {error && (
            <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Club:</span>
              <span className="font-medium text-gray-800">{demande.club?.nom}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Objet:</span>
              <span className="font-medium text-gray-800">{demande.objet}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Type:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getTypeBadgeClasses(demande.type)}`}>
                {demande.type}
              </span>
            </div>
            
            {(demande.date_evenement || demande.budget_demande) && (
              <div className="pt-2 border-t border-gray-200 space-y-2 mt-2">
                {demande.date_evenement && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Date prévue:</span>
                    <span className="text-gray-800">{formatDateFr(demande.date_evenement)}</span>
                  </div>
                )}
                {demande.budget_demande && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Budget demandé:</span>
                    <span className="text-gray-800 font-semibold">{formatCurrencyMAD(demande.budget_demande)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Décision (Statut)</label>
            <select
              value={statut}
              onChange={(e) => setStatut(e.target.value as StatutDemande)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            >
              {STATUT_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Annuler</button>
          <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
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

  // Client filtering
  const filteredDemandes = demandes.filter((d) => {
    const searchStr = `${d.objet} ${d.club?.nom}`.toLowerCase();
    const matchesSearch = !searchInput.trim() || searchStr.includes(searchInput.toLowerCase());
    const matchesStatut = !statutFilter || d.statut === statutFilter;
    const matchesType = !typeFilter || d.type === typeFilter;
    return matchesSearch && matchesStatut && matchesType;
  });

  // KPIs
  const enAttente = demandes.filter(d => d.statut === 'Soumise' || d.statut === 'En_Revue').length;
  const approuvees = demandes.filter(d => d.statut === 'Approuvee').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="flex items-center gap-3 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100">
            <CalendarDays className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Événements & Demandes</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gérez les initiatives et requêtes des clubs étudiants.</p>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Toutes les demandes</p>
              <FileText className="h-5 w-5 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{demandes.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">À traiter (En attente/Revue)</p>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{enAttente}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Approuvées</p>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{approuvees}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher par objet ou club..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="md:w-40 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
          >
            <option value="">Tous les types</option>
            {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value)}
            className="md:w-40 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
          >
            <option value="">Tous les statuts</option>
            {STATUT_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" /> Nouvelle Demande
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Objet & Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Club / Demandeur</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Heure (Prévues)</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Budget</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></td></tr>
                ) : filteredDemandes.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Aucune demande trouvée.</td></tr>
                ) : (
                  filteredDemandes.map((d) => (
                    <tr key={d.id_demande_club} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-800">{d.objet}</div>
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getTypeBadgeClasses(d.type)}`}>
                            {d.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-indigo-700">
                          <Tent className="h-3.5 w-3.5" /> {d.club?.nom}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                          <User className="h-3 w-3" /> {d.president?.etudiant?.utilisateur?.prenom} {d.president?.etudiant?.utilisateur?.nom}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {d.date_evenement ? (
                          <>
                            <div className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-gray-400" /> {formatDateFr(d.date_evenement)}</div>
                            {(d.heure_debut || d.heure_fin) && (
                              <div className="flex items-center gap-1.5 mt-1 text-xs">
                                <Clock className="h-3 w-3 text-gray-400" /> 
                                {formatTimeFr(d.heure_debut)} {d.heure_fin ? `- ${formatTimeFr(d.heure_fin)}` : ''}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="italic text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                        {d.budget_demande ? (
                          <div className="flex items-center gap-1 text-amber-600">
                            <DollarSign className="h-3.5 w-3.5" /> {formatCurrencyMAD(d.budget_demande)}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatutBadgeClasses(d.statut)}`}>
                          {d.statut.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setDemandeToProcess(d)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
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