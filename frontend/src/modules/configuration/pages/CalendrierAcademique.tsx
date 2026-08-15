import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  Clock, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  CalendarDays,
  PlayCircle
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface Periode {
  type: string;
  debut: string;
  fin: string;
}

interface Calendrier {
  id_calendrier: string;
  nom: string;
  annee_scolaire: string;
  date_debut: string;
  date_fin: string;
  periodes: Periode[];
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const API_BASE = 'http://localhost:3000/api/calendriers';

// ─────────────────────────────────────────────────────────────
// Toast Component
// ─────────────────────────────────────────────────────────────
function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => (
        <div key={toast.id} className={`flex items-start gap-3 rounded-lg shadow-lg border p-4 animate-fade-in ${
          toast.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' 
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
        }`}>
          <div className={`flex h-6 w-6 items-center justify-center rounded-full flex-shrink-0 mt-0.5 ${
            toast.type === 'success' 
              ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' 
              : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
          }`}>
            {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          </div>
          <p className="text-sm flex-1 font-medium">{toast.message}</p>
          <button onClick={() => onDismiss(toast.id)} className="opacity-60 hover:opacity-100 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function CalendrierAcademique() {
  const [calendriers, setCalendriers] = useState<Calendrier[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Calendrier>>({});
  
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const pushToast = useCallback((type: Toast['type'], message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const formatDate = (isoStr: string) => {
    if (!isoStr) return '';
    return new Date(isoStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateForInput = (isoStr: string) => {
    if (!isoStr) return '';
    return isoStr.split('T')[0];
  };

  const fetchCalendriers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE);
      const json = await res.json();
      if (json.success) setCalendriers(json.data);
    } catch (err) {
      pushToast('error', 'Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => { fetchCalendriers(); }, [fetchCalendriers]);

  const openCreateForm = () => {
    setFormData({
      nom: '',
      annee_scolaire: '',
      date_debut: '',
      date_fin: '',
      periodes: []
    });
    setIsFormOpen(true);
  };

  const openEditForm = (cal: Calendrier) => {
    setFormData({
      ...cal,
      date_debut: formatDateForInput(cal.date_debut),
      date_fin: formatDateForInput(cal.date_fin),
      periodes: cal.periodes || []
    });
    setIsFormOpen(true);
  };

  const addPeriode = () => {
    setFormData(prev => ({
      ...prev,
      periodes: [...(prev.periodes || []), { type: '', debut: '', fin: '' }]
    }));
  };

  const updatePeriode = (index: number, field: keyof Periode, value: string) => {
    setFormData(prev => {
      const newPeriodes = [...(prev.periodes || [])];
      newPeriodes[index] = { ...newPeriodes[index], [field]: value };
      return { ...prev, periodes: newPeriodes };
    });
  };

  const removePeriode = (index: number) => {
    setFormData(prev => ({
      ...prev,
      periodes: (prev.periodes || []).filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const url = formData.id_calendrier ? `${API_BASE}/${formData.id_calendrier}` : API_BASE;
      const method = formData.id_calendrier ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.message || 'Erreur de sauvegarde.');

      pushToast('success', 'Calendrier sauvegardé avec succès.');
      setIsFormOpen(false);
      fetchCalendriers();
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Erreur.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce calendrier ?')) return;
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erreur lors de la suppression.');
      pushToast('success', 'Calendrier supprimé.');
      fetchCalendriers();
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Erreur.');
    }
  };

  const setAsActiveYear = async (annee: string) => {
    try {
      const res = await fetch('http://localhost:3000/api/parametres/ANNEE_UNIVERSITAIRE', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valeur: annee })
      });
      if (!res.ok) throw new Error();
      pushToast('success', `L'année ${annee} est maintenant active dans tout l'ERP.`);
    } catch (err) {
      pushToast('error', 'Erreur lors de l\'activation.');
    }
  };

  const inputClasses = "w-full border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all";

  return (
    <div className="sc-portal min-h-screen bg-surface dark:bg-surface-dark p-6 md:p-8 animate-fade-in">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="card p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/30">
              <CalendarDays className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Calendriers Académiques</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Gérez les années scolaires, semestres et périodes de vacances.</p>
            </div>
          </div>
          {!isFormOpen && (
            <button
              onClick={openCreateForm}
              className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-soft hover:shadow-soft-hover transition-all whitespace-nowrap"
            >
              <Plus className="h-4 w-4" /> Nouveau Calendrier
            </button>
          )}
        </header>

        {/* Formulaire (Création / Édition) */}
        {isFormOpen ? (
          <form onSubmit={handleSubmit} className="card p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200/70 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">
                {formData.id_calendrier ? 'Modifier le calendrier' : 'Créer un calendrier'}
              </h2>
              <button type="button" onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Nom du calendrier</label>
                <input required type="text" value={formData.nom || ''} onChange={e => setFormData({ ...formData, nom: e.target.value })} placeholder="ex: Calendrier Principal 2026-2027" className={inputClasses} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Année Scolaire</label>
                <input required type="text" value={formData.annee_scolaire || ''} onChange={e => setFormData({ ...formData, annee_scolaire: e.target.value })} placeholder="ex: 2026-2027" className={`${inputClasses} tabular-nums`} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Date de début</label>
                <input required type="date" value={formData.date_debut || ''} onChange={e => setFormData({ ...formData, date_debut: e.target.value })} className={`${inputClasses} tabular-nums`} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Date de fin</label>
                <input required type="date" value={formData.date_fin || ''} onChange={e => setFormData({ ...formData, date_fin: e.target.value })} className={`${inputClasses} tabular-nums`} />
              </div>
            </div>

            {/* Gestion JSON des Périodes */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold text-slate-800 dark:text-white flex items-center gap-2 tracking-tight">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
                    <Clock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  </div>
                  Périodes (Semestres, Vacances...)
                </h3>
                <button type="button" onClick={addPeriode} className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 border border-primary-200 dark:border-primary-800">
                  <Plus className="h-3 w-3" /> Ajouter une période
                </button>
              </div>

              <div className="space-y-3">
                {(!formData.periodes || formData.periodes.length === 0) && (
                  <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-6 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                    Aucune période définie.
                  </div>
                )}
                {formData.periodes?.map((periode, index) => (
                  <div key={index} className="flex flex-col md:flex-row gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl items-end md:items-center">
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Type de période</label>
                      <input required type="text" value={periode.type} onChange={e => updatePeriode(index, 'type', e.target.value)} placeholder="ex: Semestre 1" className={inputClasses} />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Début</label>
                      <input required type="date" value={periode.debut} onChange={e => updatePeriode(index, 'debut', e.target.value)} className={`${inputClasses} tabular-nums`} />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Fin</label>
                      <input required type="date" value={periode.fin} onChange={e => updatePeriode(index, 'fin', e.target.value)} className={`${inputClasses} tabular-nums`} />
                    </div>
                    <button type="button" onClick={() => removePeriode(index)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors mb-0.5 md:mb-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/70 dark:border-slate-800">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-soft hover:shadow-soft-hover transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 
                {formData.id_calendrier ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </form>
        ) : (
          /* Liste des Calendriers */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {loading && (
              <div className="col-span-full flex justify-center py-12">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30">
                  <Loader2 className="h-6 w-6 animate-spin text-primary-600 dark:text-primary-400" />
                </div>
              </div>
            )}
            
            {!loading && calendriers.length === 0 && (
              <div className="col-span-full card p-12 flex flex-col items-center justify-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30 mb-3">
                  <CalendarDays className="h-7 w-7 text-primary-600 dark:text-primary-400" />
                </div>
                <p className="text-lg font-medium text-slate-800 dark:text-white tracking-tight">Aucun calendrier</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Créez votre premier calendrier académique pour commencer.</p>
              </div>
            )}

            {calendriers.map(cal => (
              <div key={cal.id_calendrier} className="card p-6">
                <div className="flex justify-between items-start mb-4 gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">{cal.nom}</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 mt-1.5 tabular-nums">
                      {cal.annee_scolaire}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => setAsActiveYear(cal.annee_scolaire)} 
                      title="Définir comme année courante"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 bg-card dark:bg-card-dark border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold transition-colors"
                    >
                      <div className="flex h-4 w-4 items-center justify-center rounded bg-emerald-50 dark:bg-emerald-900/30">
                        <PlayCircle className="h-3 w-3" />
                      </div>
                      Activer
                    </button>
                    <button onClick={() => openEditForm(cal)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors" title="Modifier">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(cal.id_calendrier)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="text-sm text-slate-600 dark:text-slate-300 mb-4 flex items-center gap-2 tabular-nums">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
                    <CalendarIcon className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  </div>
                  Du {formatDate(cal.date_debut)} au {formatDate(cal.date_fin)}
                </div>

                <div className="space-y-2 mt-4 pt-4 border-t border-slate-200/70 dark:border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Périodes</h4>
                  {cal.periodes && cal.periodes.length > 0 ? (
                    <div className="space-y-1.5">
                      {cal.periodes.map((p, i) => (
                        <div key={i} className="flex justify-between items-center text-sm p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700">
                          <span className="font-medium text-slate-700 dark:text-slate-200">{p.type}</span>
                          <span className="text-slate-500 dark:text-slate-400 text-xs tabular-nums">{formatDate(p.debut)} - {formatDate(p.fin)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">Aucune période définie.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ToastContainer toasts={toasts} onDismiss={id => setToasts(t => t.filter(x => x.id !== id))} />
    </div>
  );
}