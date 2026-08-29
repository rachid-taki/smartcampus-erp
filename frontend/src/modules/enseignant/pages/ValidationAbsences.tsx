import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Loader2,
  X,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Pencil,
  Paperclip,
  FileText,
  Calendar,
  Clock,
  User,
  Hash,
  BookOpen,
  ClipboardCheck,
  Trash2,
  Filter,
  MapPin,
  GraduationCap
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

type StatutAbsence =
  | 'Non_Justifiee'
  | 'Justifiee'
  | 'En_Attente_Validation'
  | 'Signalee_Par_Erreur';

interface Utilisateur {
  nom: string;
  prenom: string;
  CNE: string;
}

interface Etudiant {
  utilisateur: Utilisateur;
}

interface Cours {
  nom_cours?: string;
  nom?: string;
}

interface Filiere {
  nom_filiere?: string;
  nom?: string;
}

interface Salle {
  nom_salle?: string;
  numero?: string;
}

interface SessionSalle {
  cours?: Cours;
  filiere?: Filiere;
  salle?: Salle;
}

interface Absence {
  id_absence: string;
  date_heure: string;
  statut: StatutAbsence;
  justificatif: string | null;
  remarques: string | null;
  etudiant: Etudiant;
  session_salle?: SessionSalle;
}

interface ApiListResponse {
  success: boolean;
  count: number;
  data: Absence[];
}

interface ApiSingleResponse {
  success: boolean;
  message?: string;
  data: Absence;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const API_BASE = 'http://localhost:3000/api/enseignant';

const STATUT_OPTIONS: StatutAbsence[] = [
  'Non_Justifiee',
  'Justifiee',
  'En_Attente_Validation',
  'Signalee_Par_Erreur',
];

const DECISION_STATUT_OPTIONS: StatutAbsence[] = [
  'Justifiee',
  'Non_Justifiee',
  'Signalee_Par_Erreur',
];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const formatDateFr = (isoDate: string): string => {
  try {
    return new Date(isoDate).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return isoDate;
  }
};

const formatTimeFr = (isoDate: string): string => {
  try {
    return new Date(isoDate).toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const formatStatutLabel = (statut: StatutAbsence): string => {
  const map: Record<StatutAbsence, string> = {
    Non_Justifiee: 'Non justifiée',
    Justifiee: 'Justifiée',
    En_Attente_Validation: 'En attente de validation',
    Signalee_Par_Erreur: 'Signalée par erreur',
  };
  return map[statut] ?? statut.replace(/_/g, ' ');
};

const getStatutBadgeClasses = (statut: StatutAbsence): string => {
  const map: Record<StatutAbsence, string> = {
    En_Attente_Validation: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    Justifiee: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800',
    Non_Justifiee: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800',
    Signalee_Par_Erreur: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
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
// Modale 1 : Traiter l'absence
// ─────────────────────────────────────────────────────────────
function ProcessAbsenceModal({ absence, onClose, onSaved, pushToast }: { absence: Absence; onClose: () => void; onSaved: () => Promise<void>; pushToast: (type: Toast['type'], message: string) => void; }) {
  const [selectedStatut, setSelectedStatut] = useState<StatutAbsence>(absence.statut === 'En_Attente_Validation' ? 'Justifiee' : absence.statut);
  const [remarques, setRemarques] = useState<string>(absence.remarques || '');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const nom = absence.etudiant?.utilisateur?.nom || 'N/A';
  const prenom = absence.etudiant?.utilisateur?.prenom || 'N/A';
  const cne = absence.etudiant?.utilisateur?.CNE || 'N/A';
  const nomCours = absence.session_salle?.cours?.nom_cours || absence.session_salle?.cours?.nom || 'N/A';

  const handleSubmit = async () => {
    setFormError(null);
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/absences/${absence.id_absence}/statut`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ statut: selectedStatut, remarques: remarques.trim() || undefined }),
      });
      const json: ApiSingleResponse = await response.json();
      if (!response.ok || !json.success) throw new Error((json as any).message || `Erreur serveur (code ${response.status})`);
      pushToast('success', json.message || 'Absence mise à jour avec succès.');
      await onSaved();
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Une erreur est survenue lors de la mise à jour de l'absence.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => !saving && onClose()}>
      <div className="card w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200/70 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white tracking-tight">Traiter l'absence</h2>
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
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5"><div className="flex h-5 w-5 items-center justify-center rounded bg-slate-200 dark:bg-slate-700"><User className="h-3.5 w-3.5" /></div> Étudiant</span>
              <span className="text-sm text-slate-700 dark:text-slate-200 font-bold">{prenom} {nom}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5"><div className="flex h-5 w-5 items-center justify-center rounded bg-slate-200 dark:bg-slate-700"><BookOpen className="h-3.5 w-3.5" /></div> Cours</span>
              <span className="text-sm text-slate-700 dark:text-slate-200 font-bold">{nomCours}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5"><div className="flex h-5 w-5 items-center justify-center rounded bg-slate-200 dark:bg-slate-700"><Calendar className="h-3.5 w-3.5" /></div> Date & Heure</span>
              <span className="text-sm text-slate-700 dark:text-slate-200 tabular-nums">{formatDateFr(absence.date_heure)} à {formatTimeFr(absence.date_heure)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5"><div className="flex h-5 w-5 items-center justify-center rounded bg-slate-200 dark:bg-slate-700"><Paperclip className="h-3.5 w-3.5" /></div> Justificatif</span>
              {absence.justificatif ? (
                <a href={absence.justificatif} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline"><div className="flex h-5 w-5 items-center justify-center rounded bg-primary-50 dark:bg-primary-900/30"><FileText className="h-3.5 w-3.5" /></div> Voir le document</a>
              ) : <span className="text-sm text-slate-500 dark:text-slate-400 italic">Aucun</span>}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Statut actuel</span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getStatutBadgeClasses(absence.statut)}`}>{formatStatutLabel(absence.statut)}</span>
            </div>
          </div>

          <hr className="border-slate-200/70 dark:border-slate-800" />

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Nouveau statut</label>
              <select value={selectedStatut} onChange={(e) => setSelectedStatut(e.target.value as StatutAbsence)} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent">
                {DECISION_STATUT_OPTIONS.map((s) => <option key={s} value={s}>{formatStatutLabel(s)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Remarques <span className="normal-case font-normal text-slate-400 dark:text-slate-500">(optionnel)</span></label>
              <textarea value={remarques} onChange={(e) => setRemarques(e.target.value)} rows={3} placeholder="Ajouter une remarque..." className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200/70 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-b-2xl">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50">Annuler</button>
          <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modale 2 : Confirmation de Suppression
// ─────────────────────────────────────────────────────────────
function DeleteAbsenceModal({ absence, onClose, onSaved, pushToast }: { absence: Absence; onClose: () => void; onSaved: () => Promise<void>; pushToast: (type: Toast['type'], message: string) => void; }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/absences/${absence.id_absence}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Erreur lors de la suppression.");
      
      pushToast('success', json.message || "Absence supprimée avec succès.");
      await onSaved();
      onClose();
    } catch (err: any) {
      pushToast('error', err.message);
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => !deleting && onClose()}>
      <div className="card w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-xl flex flex-col p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
          <Trash2 className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Supprimer l'absence ?</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Voulez-vous vraiment supprimer l'absence de <strong>{absence.etudiant.utilisateur.prenom} {absence.etudiant.utilisateur.nom}</strong> ? Cette action est irréversible.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={deleting} className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors">Annuler</button>
          <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────

export default function ValidationAbsences() {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [searchInput, setSearchInput] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('');
  const [coursFilter, setCoursFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');

  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);
  const [absenceToDelete, setAbsenceToDelete] = useState<Absence | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((type: Toast['type'], message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => { setToasts((prev) => prev.filter((t) => t.id !== id)); }, 4000);
  }, []);

  const dismissToast = (id: number) => { setToasts((prev) => prev.filter((t) => t.id !== id)); };

  const fetchAbsences = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/absences`, { 
        signal,
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(`Erreur serveur (code ${response.status})`);
      const json: ApiListResponse = await response.json();
      if (!json.success) throw new Error('La requête a échoué côté serveur.');
      setAbsences(json.data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchAbsences(controller.signal);
    return () => controller.abort();
  }, [fetchAbsences]);

  // Extract unique courses for the filter dropdown
  const uniqueCours = Array.from(new Set(absences.map(a => a.session_salle?.cours?.nom_cours || a.session_salle?.cours?.nom).filter(Boolean))) as string[];

  // Client-side filtering
  const filteredAbsences = absences.filter((abs) => {
    const nom = abs.etudiant?.utilisateur?.nom || '';
    const prenom = abs.etudiant?.utilisateur?.prenom || '';
    const cne = abs.etudiant?.utilisateur?.CNE || '';
    const cours = abs.session_salle?.cours?.nom_cours || abs.session_salle?.cours?.nom || '';
    const date = abs.date_heure ? abs.date_heure.split('T')[0] : '';
    
    const searchTarget = `${prenom} ${nom} ${cne}`.toLowerCase();

    const matchesSearch = !searchInput.trim() || searchTarget.includes(searchInput.trim().toLowerCase());
    const matchesStatut = !statutFilter || abs.statut === statutFilter;
    const matchesCours = !coursFilter || cours === coursFilter;
    const matchesDate = !dateFilter || date === dateFilter;

    return matchesSearch && matchesStatut && matchesCours && matchesDate;
  });

  if (error && !loading && absences.length === 0) {
    return (
      <div className="sc-portal min-h-screen flex items-center justify-center p-6 animate-fade-in">
        <div className="max-w-md w-full card p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Erreur de chargement</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{error}</p>
          <button onClick={() => fetchAbsences()} className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md transition-all">
            <RefreshCw className="h-4 w-4" /> Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sc-portal min-h-screen p-6 md:p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center gap-4 mb-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-800/50">
            <ClipboardCheck className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
              Suivi des Absences
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Gérez les absences de vos étudiants, consultez les justificatifs et mettez à jour les statuts.
            </p>
          </div>
        </header>

        {/* Filter bar améliorée */}
        <div className="card p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row flex-wrap gap-3">
          <div className="relative flex-[2] min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Chercher par nom, prénom ou CNE..." className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all" />
          </div>

          <div className="relative flex-1 min-w-[150px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><Filter className="h-4 w-4 text-slate-400" /></div>
            <select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)} className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none transition-all">
              <option value="">Statut (Tous)</option>
              {STATUT_OPTIONS.map((s) => <option key={s} value={s}>{formatStatutLabel(s)}</option>)}
            </select>
          </div>

          <div className="relative flex-1 min-w-[150px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><BookOpen className="h-4 w-4 text-slate-400" /></div>
            <select value={coursFilter} onChange={(e) => setCoursFilter(e.target.value)} className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none transition-all">
              <option value="">Cours (Tous)</option>
              {uniqueCours.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="relative flex-1 min-w-[140px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><Calendar className="h-4 w-4 text-slate-400" /></div>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
          </div>
        </div>

        {/* Inline error banner */}
        {error && !loading && absences.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex-shrink-0"><AlertTriangle className="h-4 w-4" /></div>
            <p className="text-sm font-medium text-red-700 dark:text-red-300 flex-1">{error}</p>
            <button onClick={() => fetchAbsences()} className="text-sm font-bold text-red-700 dark:text-red-400 hover:text-red-800 hover:underline">Réessayer</button>
          </div>
        )}

        {/* Table avec plus d'informations */}
        <div className="card overflow-hidden rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Étudiant</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Séance & Filière</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date/Lieu</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Justificatif</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-16 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500 mb-3" /><p className="text-slate-500 font-medium">Chargement des absences...</p></td></tr>
                ) : filteredAbsences.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 mx-auto mb-3">
                        <ClipboardCheck className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium text-base">Aucune absence trouvée.</p>
                      <p className="text-slate-400 text-sm mt-1">Essayez de modifier vos filtres de recherche.</p>
                    </td>
                  </tr>
                ) : (
                  filteredAbsences.map((abs) => {
                    const nom = abs.etudiant?.utilisateur?.nom || 'N/A';
                    const prenom = abs.etudiant?.utilisateur?.prenom || 'N/A';
                    const cne = abs.etudiant?.utilisateur?.CNE || 'N/A';
                    const nomCours = abs.session_salle?.cours?.nom_cours || abs.session_salle?.cours?.nom || 'N/A';
                    const nomFiliere = abs.session_salle?.filiere?.nom_filiere || abs.session_salle?.filiere?.nom || 'Filière non spécifiée';
                    const salle = abs.session_salle?.salle?.nom_salle || abs.session_salle?.salle?.numero || 'Salle non assignée';

                    return (
                      <tr key={abs.id_absence} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group">
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
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">
                              <BookOpen className="h-3.5 w-3.5 text-slate-400" /> {nomCours}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]" title={nomFiliere}>
                              <GraduationCap className="h-3.5 w-3.5" /> {nomFiliere}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                          <div className="flex flex-col gap-1.5">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              {formatDateFr(abs.date_heure)} • {formatTimeFr(abs.date_heure)}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-slate-500">
                              <MapPin className="h-3.5 w-3.5" /> {salle}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {abs.justificatif ? (
                            <a href={abs.justificatif} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors" title="Voir le justificatif">
                              <FileText className="h-4 w-4" />
                            </a>
                          ) : (
                            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md">Aucun</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${getStatutBadgeClasses(abs.statut)}`}>
                            {formatStatutLabel(abs.statut)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setSelectedAbsence(abs)}
                              title="Traiter l'absence"
                              className="inline-flex items-center gap-1.5 p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setAbsenceToDelete(abs)}
                              title="Supprimer l'absence"
                              className="inline-flex items-center gap-1.5 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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

      {/* Modales */}
      {selectedAbsence && (
        <ProcessAbsenceModal
          absence={selectedAbsence}
          onClose={() => setSelectedAbsence(null)}
          onSaved={() => fetchAbsences()}
          pushToast={pushToast}
        />
      )}

      {absenceToDelete && (
        <DeleteAbsenceModal
          absence={absenceToDelete}
          onClose={() => setAbsenceToDelete(null)}
          onSaved={() => fetchAbsences()}
          pushToast={pushToast}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}