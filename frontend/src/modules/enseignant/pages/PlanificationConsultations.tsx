import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Loader2,
  X,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  User,
  Hash,
  MessageSquare,
  CalendarClock,
  Pencil,
  Filter
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

type StatutConsultation =
  | 'Demandee'
  | 'Acceptee'
  | 'Rejetee'
  | 'Planifiee'
  | 'Consultee'
  | 'Cloturee';

interface Utilisateur {
  nom: string;
  prenom: string;
}

interface Etudiant {
  cne: string;
  utilisateur: Utilisateur;
}

interface Consultation {
  id_verification: string;
  date_demande: string;
  motif: string;
  statut: StatutConsultation;
  date_planification: string | null;
  heure_planification: string | null;
  salle_planification: string | null;
  commentaires_prof: string | null;
  etudiant: Etudiant;
}

interface ApiListResponse {
  success: boolean;
  count: number;
  data: Consultation[];
}

interface ApiSingleResponse {
  success: boolean;
  message?: string;
  data: Consultation;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const API_BASE = 'http://localhost:3000/api/enseignant';

const STATUT_OPTIONS: StatutConsultation[] = [
  'Demandee',
  'Acceptee',
  'Rejetee',
  'Planifiee',
  'Consultee',
  'Cloturee',
];

// Statuses for which scheduling fields (date/heure/salle) are relevant
const SCHEDULING_STATUTS: StatutConsultation[] = ['Acceptee', 'Planifiee'];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const formatDateFr = (isoDate: string | null | undefined): string => {
  if (!isoDate) return '—';
  try {
    return new Date(isoDate).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch { return isoDate; }
};

const formatHeureFr = (value: string | null | undefined): string => {
  if (!value) return '—';
  try {
    if (value.includes('T')) {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return value;
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
    }
    const parts = value.split(':');
    if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
    return value;
  } catch { return value; }
};

const toDateInputValue = (value: string | null | undefined): string => {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch { return ''; }
};

const toTimeInputValue = (value: string | null | undefined): string => {
  if (!value) return '';
  try {
    if (value.includes('T')) {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return '';
      const hh = String(d.getUTCHours()).padStart(2, '0');
      const mm = String(d.getUTCMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    const parts = value.split(':');
    if (parts.length >= 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    return '';
  } catch { return ''; }
};

const formatStatutLabel = (statut: StatutConsultation): string => {
  const map: Record<StatutConsultation, string> = {
    Demandee: 'Demandée (À traiter)',
    Acceptee: 'Acceptée (À planifier)',
    Rejetee: 'Rejetée',
    Planifiee: 'Planifiée',
    Consultee: 'Consultée',
    Cloturee: 'Clôturée',
  };
  return map[statut] ?? statut;
};

const getStatutBadgeClasses = (statut: StatutConsultation): string => {
  const map: Record<StatutConsultation, string> = {
    Demandee: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    Acceptee: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
    Planifiee: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    Rejetee: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800',
    Consultee: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
    Cloturee: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  };
  return map[statut] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
};

// ─────────────────────────────────────────────────────────────
// Toast Container
// ─────────────────────────────────────────────────────────────
function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void; }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => (
        <div key={toast.id} className={`flex items-start gap-3 rounded-lg shadow-lg border p-4 animate-fade-in ${toast.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'}`}>
          {toast.type === 'success' ? <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"><CheckCircle className="h-4 w-4" /></div> : <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"><AlertTriangle className="h-4 w-4" /></div>}
          <p className="text-sm flex-1">{toast.message}</p>
          <button onClick={() => onDismiss(toast.id)} className="text-current opacity-60 hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5"><X className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Processing Modal ("Planifier la consultation")
// ─────────────────────────────────────────────────────────────
function PlanifierModal({ consultation, onClose, onSaved, pushToast }: { consultation: Consultation; onClose: () => void; onSaved: () => Promise<void>; pushToast: (type: Toast['type'], message: string) => void; }) {
  const [statut, setStatut] = useState<StatutConsultation>(consultation.statut);
  const [datePlanification, setDatePlanification] = useState(toDateInputValue(consultation.date_planification));
  const [heurePlanification, setHeurePlanification] = useState(toTimeInputValue(consultation.heure_planification));
  const [sallePlanification, setSallePlanification] = useState(consultation.salle_planification || '');
  const [commentairesProf, setCommentairesProf] = useState(consultation.commentaires_prof || '');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const nom = consultation.etudiant?.utilisateur?.nom || 'N/A';
  const prenom = consultation.etudiant?.utilisateur?.prenom || 'N/A';
  const cne = consultation.etudiant?.cne || 'N/A';

  const requiresScheduling = SCHEDULING_STATUTS.includes(statut);

  const handleSubmit = async () => {
    setFormError(null);

    if (requiresScheduling) {
      if (!datePlanification) return setFormError('La date de planification est requise pour ce statut.');
      if (!heurePlanification) return setFormError("L'heure de planification est requise pour ce statut.");
      if (!sallePlanification.trim()) return setFormError('La salle de planification est requise pour ce statut.');
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload: Record<string, unknown> = { statut, commentaires_prof: commentairesProf.trim() || undefined };
      if (datePlanification) payload.date_planification = datePlanification;
      if (heurePlanification) payload.heure_planification = heurePlanification;
      if (sallePlanification.trim()) payload.salle_planification = sallePlanification.trim();

      const response = await fetch(`${API_BASE}/consultations/${consultation.id_verification}/planifier`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const json: ApiSingleResponse = await response.json();
      if (!response.ok || !json.success) throw new Error((json as any).message || `Erreur serveur (code ${response.status})`);

      pushToast('success', json.message || 'Consultation mise à jour avec succès.');
      await onSaved();
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la mise à jour de la consultation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => !saving && onClose()}>
      <div className="card p-0 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200/70 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white tracking-tight">Traiter la demande</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{prenom} {nom} • CNE: <span className="tabular-nums">{cne}</span></p>
          </div>
          <button onClick={onClose} disabled={saving} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-50 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-5 flex-1">
          {formError && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" /><span>{formError}</span>
            </div>
          )}

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5"><div className="flex h-5 w-5 items-center justify-center rounded bg-slate-200 dark:bg-slate-700"><User className="h-3.5 w-3.5" /></div> Étudiant</span><span className="text-sm text-slate-700 dark:text-slate-200 font-bold">{prenom} {nom}</span></div>
            <div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5"><div className="flex h-5 w-5 items-center justify-center rounded bg-slate-200 dark:bg-slate-700"><Hash className="h-3.5 w-3.5" /></div> CNE</span><span className="text-sm text-slate-700 dark:text-slate-200 tabular-nums">{cne}</span></div>
            <div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5"><div className="flex h-5 w-5 items-center justify-center rounded bg-slate-200 dark:bg-slate-700"><Calendar className="h-3.5 w-3.5" /></div> Date de demande</span><span className="text-sm text-slate-700 dark:text-slate-200 tabular-nums">{formatDateFr(consultation.date_demande)}</span></div>
            <div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Statut actuel</span><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getStatutBadgeClasses(consultation.statut)}`}>{formatStatutLabel(consultation.statut)}</span></div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-700"><MessageSquare className="h-3.5 w-3.5" /></div> Motif de la demande</p>
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 rounded-lg p-4">
              <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{consultation.motif}</p>
            </div>
          </div>

          <hr className="border-slate-200/70 dark:border-slate-800" />

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Nouveau statut</label>
              <select value={statut} onChange={(e) => setStatut(e.target.value as StatutConsultation)} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent">
                {STATUT_OPTIONS.map((s) => <option key={s} value={s}>{formatStatutLabel(s)}</option>)}
              </select>
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl p-4 transition-colors ${requiresScheduling ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50' : 'bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800'}`}>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><div className="flex h-5 w-5 items-center justify-center rounded bg-white dark:bg-slate-700 shadow-sm"><Calendar className="h-3.5 w-3.5 text-slate-400" /></div> Date {requiresScheduling && <span className="text-red-500">*</span>}</label>
                <input type="date" value={datePlanification} onChange={(e) => setDatePlanification(e.target.value)} disabled={!requiresScheduling} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><div className="flex h-5 w-5 items-center justify-center rounded bg-white dark:bg-slate-700 shadow-sm"><Clock className="h-3.5 w-3.5 text-slate-400" /></div> Heure {requiresScheduling && <span className="text-red-500">*</span>}</label>
                <input type="time" value={heurePlanification} onChange={(e) => setHeurePlanification(e.target.value)} disabled={!requiresScheduling} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><div className="flex h-5 w-5 items-center justify-center rounded bg-white dark:bg-slate-700 shadow-sm"><MapPin className="h-3.5 w-3.5 text-slate-400" /></div> Salle {requiresScheduling && <span className="text-red-500">*</span>}</label>
                <input type="text" value={sallePlanification} onChange={(e) => setSallePlanification(e.target.value)} disabled={!requiresScheduling} placeholder="Ex: Salle B204" className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Commentaires <span className="normal-case font-normal text-slate-400 dark:text-slate-500">(optionnel)</span></label>
              <textarea value={commentairesProf} onChange={(e) => setCommentairesProf(e.target.value)} rows={3} placeholder="Ajouter une note pour l'étudiant..." className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200/70 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-b-2xl">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50">Annuler</button>
          <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────
export default function PlanificationConsultations() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'Toutes' | 'A_Traiter' | 'Planifiees' | 'Historique'>('Toutes');
  const [searchInput, setSearchInput] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('');

  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((type: Toast['type'], message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => { setToasts((prev) => prev.filter((t) => t.id !== id)); }, 4000);
  }, []);

  const dismissToast = (id: number) => { setToasts((prev) => prev.filter((t) => t.id !== id)); };

  const fetchConsultations = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/consultations`, { 
        signal,
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(`Erreur serveur (code ${response.status})`);
      const json: ApiListResponse = await response.json();
      if (!json.success) throw new Error('La requête a échoué côté serveur.');
      setConsultations(json.data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchConsultations(controller.signal);
    return () => controller.abort();
  }, [fetchConsultations]);

  // Filtrage combiné : Onglets + Barre de recherche + Sélecteur Statut
  const filteredConsultations = consultations.filter((c) => {
    const nom = c.etudiant?.utilisateur?.nom || '';
    const prenom = c.etudiant?.utilisateur?.prenom || '';
    const cne = c.etudiant?.cne || '';
    const searchTarget = `${prenom} ${nom} ${cne}`.toLowerCase();

    const matchesSearch = !searchInput.trim() || searchTarget.includes(searchInput.trim().toLowerCase());
    const matchesStatut = !statutFilter || c.statut === statutFilter;

    let matchesTab = true;
    if (activeTab === 'A_Traiter') matchesTab = c.statut === 'Demandee';
    else if (activeTab === 'Planifiees') matchesTab = ['Acceptee', 'Planifiee'].includes(c.statut);
    else if (activeTab === 'Historique') matchesTab = ['Rejetee', 'Consultee', 'Cloturee'].includes(c.statut);

    return matchesSearch && matchesStatut && matchesTab;
  });

  return (
    <div className="sc-portal min-h-screen p-6 md:p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center gap-4 mb-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-800/50">
            <CalendarClock className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Planification des Consultations</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Traitez et planifiez les demandes de consultation de copies d'examen.</p>
          </div>
        </header>

        {/* Système d'onglets */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar pt-2">
          {(['Toutes', 'A_Traiter', 'Planifiees', 'Historique'] as const).map(tab => {
            const count = consultations.filter(c => {
              if (tab === 'A_Traiter') return c.statut === 'Demandee';
              if (tab === 'Planifiees') return ['Acceptee', 'Planifiee'].includes(c.statut);
              if (tab === 'Historique') return ['Rejetee', 'Consultee', 'Cloturee'].includes(c.statut);
              return true;
            }).length;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab 
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab === 'Toutes' ? 'Toutes' : tab === 'A_Traiter' ? 'À traiter' : tab === 'Planifiees' ? 'Planifiées' : 'Historique'}
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                  activeTab === tab 
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Filter bar */}
        <div className="card p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row flex-wrap gap-3">
          <div className="relative flex-[2] min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Rechercher par nom d'étudiant ou CNE..." className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all" />
          </div>
          <div className="relative flex-1 min-w-[150px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><Filter className="h-4 w-4 text-slate-400" /></div>
            <select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)} className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none transition-all">
              <option value="">Tous les statuts</option>
              {STATUT_OPTIONS.map((s) => <option key={s} value={s}>{formatStatutLabel(s)}</option>)}
            </select>
          </div>
        </div>

        {/* Error Banner */}
        {error && !loading && consultations.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex-shrink-0"><AlertTriangle className="h-4 w-4" /></div>
            <p className="text-sm font-medium text-red-700 dark:text-red-300 flex-1">{error}</p>
            <button onClick={() => fetchConsultations()} className="text-sm font-bold text-red-700 dark:text-red-400 hover:text-red-800 hover:underline">Réessayer</button>
          </div>
        )}

        {/* Table */}
        <div className="card overflow-hidden rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/70 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Étudiant</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Motif</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date demande</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Planification</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-16 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500 mb-3" /><p className="text-slate-500 font-medium">Chargement des consultations...</p></td></tr>
                ) : filteredConsultations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 mx-auto mb-3"><CalendarClock className="h-8 w-8 text-slate-400" /></div>
                      <p className="text-slate-500 font-medium text-base">Aucune consultation trouvée dans cet onglet.</p>
                    </td>
                  </tr>
                ) : (
                  filteredConsultations.map((c) => {
                    const nom = c.etudiant?.utilisateur?.nom || 'N/A';
                    const prenom = c.etudiant?.utilisateur?.prenom || 'N/A';
                    const cne = c.etudiant?.cne || 'N/A';
                    const hasScheduling = Boolean(c.date_planification || c.heure_planification || c.salle_planification);

                    return (
                      <tr key={c.id_verification} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-sm font-bold shadow-sm">
                              {prenom?.[0]}{nom?.[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{prenom} {nom}</p>
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">CNE: {cne}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate" title={c.motif}>
                          {c.motif}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                          {formatDateFr(c.date_demande)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {hasScheduling ? (
                            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1.5 tabular-nums">
                              <span className="flex items-center gap-1.5 font-medium">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                {formatDateFr(c.date_planification)} • {formatHeureFr(c.heure_planification)}
                              </span>
                              {c.salle_planification && (
                                <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                  <MapPin className="h-3.5 w-3.5" /> {c.salle_planification}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md">Non planifiée</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${getStatutBadgeClasses(c.statut)}`}>
                            {formatStatutLabel(c.statut)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => setSelectedConsultation(c)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          >
                            <Pencil className="h-4 w-4" /> Traiter
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

      {selectedConsultation && (
        <PlanifierModal
          consultation={selectedConsultation}
          onClose={() => setSelectedConsultation(null)}
          onSaved={() => fetchConsultations()}
          pushToast={pushToast}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}