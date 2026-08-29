import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Plus,
  Mail,
  Phone,
  Briefcase,
  Building2,
  BadgeCheck,
  X,
  Loader2,
  AlertTriangle,
  Users,
  MoreHorizontal,
  ChevronRight
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

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
  grade: string | null;
  statut: 'Actif' | 'Inactif' | 'Conge';
  utilisateur: Utilisateur;
}

interface ApiListResponse {
  success: boolean;
  count: number;
  data: Employe[];
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const API_BASE = 'http://localhost:3000/api/rh';

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
          {toast.type === 'success' ? (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5">
              <BadgeCheck className="h-4 w-4" />
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
// Main Page Component
// ─────────────────────────────────────────────────────────────

export default function GestionEmployes() {
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmploye, setSelectedEmploye] = useState<Employe | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nom: '', prenom: '', email: '', telephone: '',
    matricule: '', fonction: '', departement: '', grade: ''
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Toasts
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
      const message = err instanceof Error ? err.message : 'Impossible de contacter le serveur.';
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

  // ── Create employee ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      const response = await fetch(`${API_BASE}/employes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || `Erreur serveur (code ${response.status})`);
      }

      pushToast('success', 'Employé intégré avec succès.');
      setShowAddModal(false);
      setFormData({ nom: '', prenom: '', email: '', telephone: '', matricule: '', fonction: '', departement: '', grade: '' });
      fetchEmployes();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  };

  // ── Client-side filtering ──
  const filteredEmployes = employes.filter((emp) => {
    const term = searchInput.trim().toLowerCase();
    if (!term) return true;
    
    const fullName = `${emp.utilisateur.prenom} ${emp.utilisateur.nom}`.toLowerCase();
    const matricule = emp.matricule.toLowerCase();
    return fullName.includes(term) || matricule.includes(term);
  });

  return (
    <div className="sc-portal min-h-screen p-6 md:p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
              <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
                Gestion des Employés
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Annuaire, intégration et gestion du personnel.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-soft hover:shadow-soft-hover transition-all whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Nouvel Employé
          </button>
        </header>

        {/* Filter bar */}
        <div className="card p-4 mb-6 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher par nom, prénom ou matricule..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark text-slate-800 dark:text-white placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Employé</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Matricule</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Département</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fonction</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" /><div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" /></div></td>
                      <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" /></td>
                      <td className="px-6 py-4"><div className="h-6 w-16 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-8 bg-slate-100 dark:bg-slate-800 rounded animate-pulse ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredEmployes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 mx-auto mb-2">
                        <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Aucun employé trouvé.</p>
                    </td>
                  </tr>
                ) : (
                  filteredEmployes.map((emp) => {
                    const { nom, prenom, email } = emp.utilisateur;
                    return (
                      <tr 
                        key={emp.id_employe} 
                        onClick={() => setSelectedEmploye(emp)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white text-xs font-bold shadow-sm">
                              {prenom?.[0]}{nom?.[0]}
                            </div>
                            <div>
                              <span className="text-sm font-medium text-slate-800 dark:text-white block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {prenom} {nom}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 font-mono">
                          {emp.matricule}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            {emp.departement}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-slate-400" />
                            {emp.fonction}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wide
                            ${emp.statut === 'Actif' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                              emp.statut === 'Conge' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 
                              'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}
                          >
                            {emp.statut}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            <ChevronRight className="h-5 w-5" />
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

      {/* ── Modal d'affichage du profil de l'employé ── */}
      {selectedEmploye && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSelectedEmploye(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Détails de l'employé</h2>
              <button onClick={() => setSelectedEmploye(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {/* En-tête Profil */}
              <div className="flex items-center gap-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white text-2xl font-bold shadow-md">
                  {selectedEmploye.utilisateur.prenom[0]}{selectedEmploye.utilisateur.nom[0]}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                    {selectedEmploye.utilisateur.prenom} {selectedEmploye.utilisateur.nom}
                  </h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">
                    {selectedEmploye.fonction} • {selectedEmploye.departement}
                  </p>
                  <span className={`inline-flex mt-2 items-center px-2.5 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wide ${
                    selectedEmploye.statut === 'Actif' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                    selectedEmploye.statut === 'Conge' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 
                    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {selectedEmploye.statut}
                  </span>
                </div>
              </div>

              {/* Infos Contact */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Contact</h4>
                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <Mail className="h-4 w-4 text-slate-400" /> {selectedEmploye.utilisateur.email}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <Phone className="h-4 w-4 text-slate-400" /> {selectedEmploye.utilisateur.telephone || <span className="text-slate-400 italic">Non renseigné</span>}
                  </div>
                </div>
              </div>

              {/* Infos Pro */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Informations Professionnelles</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">Matricule</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white font-mono">{selectedEmploye.matricule}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">Grade</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{selectedEmploye.grade || <span className="text-slate-400 font-normal italic">Non spécifié</span>}</p>
                  </div>
                </div>
              </div>

              {/* Info Système */}
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-lg">
                <Users className="h-4 w-4" /> 
                Compte système {selectedEmploye.utilisateur.actif ? 'actif' : 'désactivé'}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button className="px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors">
                Modifier
              </button>
              <button onClick={() => setSelectedEmploye(null)} className="px-4 py-2 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-colors">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal d'ajout d'employé ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => !saving && setShowAddModal(false)}>
          <div className="card p-0 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/70 dark:border-slate-800 sticky top-0 bg-card dark:bg-card-dark z-10">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white tracking-tight">Intégrer un employé</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Le profil utilisateur sera généré automatiquement.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} disabled={saving} className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded-md transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
              {formError && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2"><p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Identité & Contact</p></div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Prénom *</label>
                  <input required value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Nom *</label>
                  <input required value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Email Professionnel *</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Téléphone</label>
                  <input value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>

                <div className="col-span-1 md:col-span-2 mt-2"><p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Informations Professionnelles</p></div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Matricule *</label>
                  <input required value={formData.matricule} onChange={e => setFormData({...formData, matricule: e.target.value})} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Département *</label>
                  <input required value={formData.departement} onChange={e => setFormData({...formData, departement: e.target.value})} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Fonction *</label>
                  <input required value={formData.fonction} onChange={e => setFormData({...formData, fonction: e.target.value})} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Grade (Optionnel)</label>
                  <input value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 text-indigo-800 dark:text-indigo-300 text-xs p-3 rounded-lg flex gap-3 mt-4">
                <BadgeCheck className="h-5 w-5 shrink-0 text-indigo-500" />
                <p>Le mot de passe par défaut <b>ChangeMe123!</b> sera assigné au compte de l'employé. Les permissions exactes de la plateforme seront assignées ultérieurement par l'administrateur système.</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/70 dark:border-slate-800 mt-6 sticky bottom-0 bg-card dark:bg-card-dark">
                <button type="button" onClick={() => setShowAddModal(false)} disabled={saving} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-soft hover:shadow-soft-hover transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Intégrer l'employé
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}