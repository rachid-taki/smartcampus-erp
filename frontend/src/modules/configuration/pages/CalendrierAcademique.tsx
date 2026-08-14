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
  type: string; // ex: "Semestre 1", "Vacances Printemps"
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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => (
        <div key={toast.id} className={`flex items-start gap-3 rounded-xl shadow-xl border p-4 animate-in slide-in-from-right-8 ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {toast.type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-green-500" /> : <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5 text-red-500" />}
          <p className="text-sm flex-1 font-medium">{toast.message}</p>
          <button onClick={() => onDismiss(toast.id)} className="opacity-60 hover:opacity-100 transition-opacity"><X className="h-4 w-4" /></button>
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
  
  // State du formulaire (Création / Édition)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Calendrier>>({});
  
  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const pushToast = useCallback((type: Toast['type'], message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // Formatage des dates pour affichage
  const formatDate = (isoStr: string) => {
    if (!isoStr) return '';
    return new Date(isoStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Formatage pour les inputs type="date" (YYYY-MM-DD)
  const formatDateForInput = (isoStr: string) => {
    if (!isoStr) return '';
    return isoStr.split('T')[0];
  };

  // Fetch
  const fetchCalendriers = useCallback(async () => {
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

  // Actions Formulaire
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

  // Sauvegarde (Create / Update)
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

  // Suppression
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

  // Fonction BONUS: Définir comme année courante
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

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-indigo-500" /> Calendriers Académiques
            </h1>
            <p className="text-sm text-slate-500 mt-1">Gérez les années scolaires, semestres et périodes de vacances.</p>
          </div>
          {!isFormOpen && (
            <button
              onClick={openCreateForm}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" /> Nouveau Calendrier
            </button>
          )}
        </div>

        {/* Formulaire (Création / Édition) */}
        {isFormOpen ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                {formData.id_calendrier ? 'Modifier le calendrier' : 'Créer un calendrier'}
              </h2>
              <button type="button" onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom du calendrier</label>
                <input required type="text" value={formData.nom || ''} onChange={e => setFormData({ ...formData, nom: e.target.value })} placeholder="ex: Calendrier Principal 2026-2027" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Année Scolaire</label>
                <input required type="text" value={formData.annee_scolaire || ''} onChange={e => setFormData({ ...formData, annee_scolaire: e.target.value })} placeholder="ex: 2026-2027" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date de début</label>
                <input required type="date" value={formData.date_debut || ''} onChange={e => setFormData({ ...formData, date_debut: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date de fin</label>
                <input required type="date" value={formData.date_fin || ''} onChange={e => setFormData({ ...formData, date_fin: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" />
              </div>
            </div>

            {/* Gestion JSON des Périodes */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" /> Périodes (Semestres, Vacances...)
                </h3>
                <button type="button" onClick={addPeriode} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Ajouter une période
                </button>
              </div>

              <div className="space-y-3">
                {(!formData.periodes || formData.periodes.length === 0) && (
                  <div className="text-sm text-slate-400 text-center py-4 border border-dashed rounded-lg bg-slate-50">Aucune période définie.</div>
                )}
                {formData.periodes?.map((periode, index) => (
                  <div key={index} className="flex flex-col md:flex-row gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl items-end md:items-center">
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Type de période</label>
                      <input required type="text" value={periode.type} onChange={e => updatePeriode(index, 'type', e.target.value)} placeholder="ex: Semestre 1" className="w-full border-slate-200 rounded-lg px-3 py-1.5 text-sm" />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Début</label>
                      <input required type="date" value={periode.debut} onChange={e => updatePeriode(index, 'debut', e.target.value)} className="w-full border-slate-200 rounded-lg px-3 py-1.5 text-sm" />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Fin</label>
                      <input required type="date" value={periode.fin} onChange={e => updatePeriode(index, 'fin', e.target.value)} className="w-full border-slate-200 rounded-lg px-3 py-1.5 text-sm" />
                    </div>
                    <button type="button" onClick={() => removePeriode(index)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-70">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 
                {formData.id_calendrier ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </form>
        ) : (
          /* Liste des Calendriers */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {loading && <div className="col-span-full flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-indigo-400" /></div>}
            
            {calendriers.map(cal => (
              <div key={cal.id_calendrier} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{cal.nom}</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 mt-1">
                      {cal.annee_scolaire}
                    </span>
                  </div>
                  {/* MODIFICATION BONUS : Bouton Activer ajouté ici */}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setAsActiveYear(cal.annee_scolaire)} 
                      title="Définir comme année courante"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-emerald-600 hover:bg-emerald-50 bg-white border border-emerald-200 rounded-lg text-xs font-bold transition-colors mr-2"
                    >
                      <PlayCircle className="h-3.5 w-3.5" /> Activer
                    </button>
                    <button onClick={() => openEditForm(cal)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(cal.id_calendrier)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>

                <div className="text-sm text-slate-600 mb-4 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-slate-400" />
                  Du {formatDate(cal.date_debut)} au {formatDate(cal.date_fin)}
                </div>

                {/* Affichage des périodes */}
                <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Périodes</h4>
                  {cal.periodes && cal.periodes.length > 0 ? (
                    cal.periodes.map((p, i) => (
                      <div key={i} className="flex justify-between items-center text-sm p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="font-medium text-slate-700">{p.type}</span>
                        <span className="text-slate-500 text-xs">{formatDate(p.debut)} - {formatDate(p.fin)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">Aucune période définie.</p>
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