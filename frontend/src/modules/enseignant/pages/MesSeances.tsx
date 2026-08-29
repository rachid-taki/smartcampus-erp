import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Calendar, Clock, MapPin, BookOpen, AlertTriangle, CheckCircle, 
  X, Edit3, Trash2, Bell, CalendarOff, Users, User, Loader2, ArrowRight, PlusCircle,
  UserCheck, ClipboardCheck, Search, CheckSquare
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────────────

interface Filiere { id_filiere: string; nom_filiere: string; nom: string; }
interface Cours { id_cours: string; nom: string; code: string; }
interface Module { id_module: string; nom_module: string; filiere?: Filiere; }
interface ElementModule { id_element: string; nom_element: string; module?: Module; }
interface Salle { id_salle: string; nom_salle: string; nom: string; numero: string; }

interface Seance {
  id_seance: string;
  date_seance: string;
  heure_debut: string;
  heure_fin: string;
  type_seance: string;
  statut: string; // "Planifiee" | "Terminee" | "Annulee"
  element_module?: ElementModule;
  salle?: Salle;
}

interface Toast { id: number; type: 'success' | 'error'; message: string; }

const API_BASE_SEANCES = 'http://localhost:3000/api/enseignant/seances';
const API_BASE_PRESENCES = 'http://localhost:3000/api/enseignant/presences';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const formatDate = (isoDate: string) => {
  return new Date(isoDate).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};
const formatTime = (timeStr: string) => timeStr ? timeStr.substring(0, 5) : '';

const getTypeBadge = (type: string) => {
  switch (type) {
    case 'CM': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300';
    case 'TD': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'TP': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300';
    case 'Examen': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300';
    default: return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300';
  }
};

const getStatutBadge = (statut: string) => {
  switch (statut) {
    case 'Planifiee': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    case 'Annulee': return 'text-red-600 bg-red-50 border-red-200';
    case 'Terminee': return 'text-green-600 bg-green-50 border-green-200';
    default: return 'text-slate-600 bg-slate-50 border-slate-200';
  }
};

// ─────────────────────────────────────────────────────────────
// Page Principale : Mes Séances
// ─────────────────────────────────────────────────────────────

export default function MesSeances() {
  const [seances, setSeances] = useState<Seance[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  // Onglet Actif pour séparer les listes
  const [activeTab, setActiveTab] = useState<'Planifiee' | 'Terminee' | 'Annulee'>('Planifiee');

  // Modales
  const [editingSeance, setEditingSeance] = useState<Seance | null>(null);
  const [attendanceSeance, setAttendanceSeance] = useState<Seance | null>(null);
  const [showConflictsModal, setShowConflictsModal] = useState(false);
  const [showEndCourseModal, setShowEndCourseModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);

  const pushToast = useCallback((type: Toast['type'], message: string) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const fetchSeances = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_SEANCES}/upcoming`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) setSeances(json.data);
      else throw new Error(json.message);
    } catch (err: any) {
      pushToast('error', err.message || "Erreur de chargement des séances.");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => { fetchSeances(); }, [fetchSeances]);

  // Grouper les conflits UNIQUEMENT pour les séances planifiées
  const conflicts = Object.values(
    seances
      .filter(s => s.statut === 'Planifiee')
      .reduce((acc, s) => {
        const key = `${s.date_seance.split('T')[0]}_${s.heure_debut}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(s);
        return acc;
      }, {} as Record<string, Seance[]>)
  ).filter(group => group.length > 1);

  const conflictedSeanceIds = new Set(conflicts.flat().map(s => s.id_seance));

  // Filtrer les séances en fonction de l'onglet actif
  const displayedSeances = seances.filter(s => s.statut === activeTab);

  return (
    <div className="sc-portal min-h-screen p-6 md:p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <div className="p-2.5 bg-primary-100 dark:bg-primary-900/30 rounded-xl text-primary-600 dark:text-primary-400">
                <Calendar className="h-6 w-6" />
              </div>
              Mes Séances
            </h1>
            <p className="text-sm text-slate-500 mt-1">Gérez votre emploi du temps, planifiez vos cours et faites l'appel.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => setShowPlanModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-xl shadow-sm transition-colors">
              <PlusCircle className="h-4 w-4" /> Planifier
            </button>
            <button onClick={() => setShowNotifyModal(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-xl transition-colors">
              <Bell className="h-4 w-4" /> Notifier
            </button>
            <button onClick={() => setShowEndCourseModal(true)} className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400 font-bold text-sm rounded-xl transition-colors">
              <CalendarOff className="h-4 w-4" /> Clôturer
            </button>
          </div>
        </header>

        {conflicts.length > 0 && activeTab === 'Planifiee' && (
          <div className="flex flex-col sm:flex-row items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl animate-fade-in shadow-sm">
            <div className="flex items-center gap-3 mb-3 sm:mb-0">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-amber-800 dark:text-amber-400">Conflits d'horaires détectés !</h3>
                <p className="text-sm text-amber-700 dark:text-amber-500">Vous avez {conflicts.length} groupe(s) de séances programmées exactement au même moment.</p>
              </div>
            </div>
            <button onClick={() => setShowConflictsModal(true)} className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all whitespace-nowrap ring-4 ring-amber-100 dark:ring-amber-900/30">
              Résoudre tous les conflits
            </button>
          </div>
        )}

        {/* Système d'onglets pour diviser les listes */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto no-scrollbar">
          {(['Planifiee', 'Terminee', 'Annulee'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab 
                  ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab === 'Planifiee' ? 'À Venir' : tab === 'Terminee' ? 'Terminées' : 'Annulées'}
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === tab 
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' 
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {seances.filter(s => s.statut === tab).length}
              </span>
            </button>
          ))}
        </div>

        <div className="card overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Date & Heure</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Cours & Filière</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Détails</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Statut</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></td></tr>
                ) : displayedSeances.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex justify-center mb-3">
                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
                          <Calendar className="h-6 w-6" />
                        </div>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">Aucune séance dans cette catégorie.</p>
                    </td>
                  </tr>
                ) : (
                  displayedSeances.map((s) => {
                    const isConflicted = activeTab === 'Planifiee' && conflictedSeanceIds.has(s.id_seance);
                    return (
                      <tr key={s.id_seance} className={`transition-colors ${isConflicted ? 'bg-amber-50/40 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}>
                        <td className={`px-6 py-4 border-l-4 ${isConflicted ? 'border-amber-500' : 'border-transparent'}`}>
                          <div className="font-bold text-slate-800 dark:text-white capitalize">{formatDate(s.date_seance)}</div>
                          <div className={`text-sm font-medium flex items-center gap-1 mt-1 ${isConflicted ? 'text-amber-600 dark:text-amber-500' : 'text-slate-500'}`}>
                            <Clock className="h-3.5 w-3.5" /> {formatTime(s.heure_debut)} - {formatTime(s.heure_fin)}
                            {isConflicted && <AlertTriangle className="h-3.5 w-3.5 ml-1" />}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 dark:text-white">{s.element_module?.nom_element}</div>
                          <div className="text-xs text-slate-500 mt-1 truncate max-w-[200px]" title={s.element_module?.module?.filiere?.nom_filiere || s.element_module?.module?.filiere?.nom}>
                            {s.element_module?.module?.filiere?.nom_filiere || s.element_module?.module?.filiere?.nom || 'Filière non spécifiée'}
                          </div>
                        </td>
                        <td className="px-6 py-4 space-y-2">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${getTypeBadge(s.type_seance)}`}>
                            {s.type_seance}
                          </span>
                          <div className="text-sm font-medium text-slate-500 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" /> {s.salle?.nom_salle || s.salle?.numero || 'À définir'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${getStatutBadge(s.statut)}`}>
                            {s.statut}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* BOUTON D'APPEL AMÉLIORÉ ET TRÈS VISIBLE */}
                            {(s.statut === 'Planifiee' || s.statut === 'Terminee') && (
                              <button 
                                onClick={() => setAttendanceSeance(s)} 
                                className={`px-4 py-2 text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all whitespace-nowrap ${
                                  s.statut === 'Terminee' 
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none'
                                }`}
                              >
                                {s.statut === 'Terminee' ? <CheckSquare className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                {s.statut === 'Terminee' ? 'Voir l\'appel' : 'Faire l\'appel'}
                              </button>
                            )}

                            {activeTab === 'Planifiee' && (
                              <button 
                                onClick={() => setEditingSeance(s)} 
                                title="Modifier la séance"
                                className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                            )}
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

      {/* --- Rendu des Modales --- */}
      {showPlanModal && <PlanSessionModal onClose={() => setShowPlanModal(false)} onRefresh={fetchSeances} pushToast={pushToast} />}
      {editingSeance && <EditSessionModal seance={editingSeance} onClose={() => setEditingSeance(null)} onRefresh={fetchSeances} pushToast={pushToast} />}
      {showConflictsModal && <ResolveConflictsModal conflicts={conflicts} onClose={() => setShowConflictsModal(false)} onRefresh={fetchSeances} pushToast={pushToast} />}
      {showEndCourseModal && <EndCourseModal seances={seances} onClose={() => setShowEndCourseModal(false)} onRefresh={fetchSeances} pushToast={pushToast} />}
      {showNotifyModal && <NotifyStudentsModal onClose={() => setShowNotifyModal(false)} pushToast={pushToast} />}
      {attendanceSeance && <TakeAttendanceModal seance={attendanceSeance} onClose={() => setAttendanceSeance(null)} onRefresh={fetchSeances} pushToast={pushToast} />}

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-center gap-3 rounded-lg border p-4 shadow-lg ${t.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {t.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            <p className="text-sm font-medium flex-1">{t.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modale : Faire l'appel (Présences) - CORRIGÉE
// ─────────────────────────────────────────────────────────────
function TakeAttendanceModal({ seance, onClose, onRefresh, pushToast }: { seance: Seance, onClose: () => void, onRefresh: () => void, pushToast: any }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [etudiants, setEtudiants] = useState<any[]>([]);
  const [absentIds, setAbsentIds] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<'list' | 'verify'>('list');
  const [search, setSearch] = useState('');

  // 1. Récupération des étudiants - CORRECTION DES DÉPENDANCES
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_PRESENCES}/sessions/${seance.id_seance}/etudiants`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        
        setEtudiants(json.data.etudiants);
        
        // Pré-remplir les absents existants (si l'enseignant avait déjà commencé)
        const existingAbsents = new Set<string>();
        json.data.etudiants.forEach((e: any) => {
          if (e.statut_presence === 'Absent') existingAbsents.add(e.id_etudiant);
        });
        setAbsentIds(existingAbsents);

      } catch (e: any) {
        pushToast('error', e.message || "Erreur lors du chargement des étudiants.");
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
    // En supprimant onClose de ce tableau, la liste ne se rechargera plus et ne disparaîtra plus
    // si un re-rendu parent se produit en cours de route.
  }, [seance.id_seance, pushToast]);

  const toggleAbsence = (id: string) => {
    setAbsentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_PRESENCES}/sessions/${seance.id_seance}/valider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ absents: Array.from(absentIds) })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      
      pushToast('success', data.message);
      onRefresh(); // Cela mettra à jour le statut de la séance à "Terminee"
      onClose();
    } catch (err: any) {
      pushToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredEtudiants = etudiants.filter(e => 
    `${e.prenom} ${e.nom} ${e.cne}`.toLowerCase().includes(search.toLowerCase())
  );

  const absentsList = etudiants.filter(e => absentIds.has(e.id_etudiant));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => !saving && onClose()}>
      <div className="card w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-start p-5 border-b border-slate-200 dark:border-slate-800 bg-indigo-50 dark:bg-indigo-900/20">
          <div>
            <h2 className="text-xl font-bold text-indigo-800 dark:text-indigo-400 flex items-center gap-2">
              <ClipboardCheck className="h-6 w-6" /> Faire l'appel
            </h2>
            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-300 mt-1">
              {seance.element_module?.nom_element} • {formatDate(seance.date_seance)} ({formatTime(seance.heure_debut)} - {formatTime(seance.heure_fin)})
            </p>
          </div>
          <button onClick={onClose} disabled={saving} className="text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 p-1 rounded-lg transition-colors disabled:opacity-50"><X className="h-6 w-6" /></button>
        </div>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
            <p className="text-slate-500 font-medium">Chargement de la liste des étudiants...</p>
          </div>
        ) : (
          <>
            {step === 'list' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Rechercher par nom, prénom ou CNE..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-900 border focus:border-indigo-400 rounded-xl text-sm outline-none transition-all dark:text-white"
                      />
                    </div>
                    <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-sm font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50">
                      {etudiants.length} Inscrits
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Étudiant</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">CNE</th>
                        <th className="py-3 px-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEtudiants.map(e => {
                        const isAbsent = absentIds.has(e.id_etudiant);
                        return (
                          <tr key={e.id_etudiant} className={`border-b border-slate-100 dark:border-slate-800/50 transition-colors ${isAbsent ? 'bg-red-50/50 dark:bg-red-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-800 dark:text-white">{e.nom} {e.prenom}</div>
                            </td>
                            <td className="py-3 px-4 text-sm font-medium text-slate-500">{e.cne}</td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => toggleAbsence(e.id_etudiant)}
                                className={`relative inline-flex h-8 w-24 items-center rounded-full transition-colors ${isAbsent ? 'bg-red-500' : 'bg-green-500'}`}
                              >
                                <span className={`absolute inset-y-1 ${isAbsent ? 'right-1' : 'left-1'} flex h-6 w-10 items-center justify-center rounded-full bg-white text-[10px] font-bold shadow-sm transition-all text-slate-700`}>
                                  {isAbsent ? 'ABS' : 'PRÉS'}
                                </span>
                                <span className={`w-full text-center text-xs font-bold text-white transition-opacity ${isAbsent ? 'pr-8' : 'pl-8'}`}>
                                  {isAbsent ? 'Absent' : 'Présent'}
                                </span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredEtudiants.length === 0 && (
                        <tr><td colSpan={3} className="text-center py-8 text-slate-500">Aucun étudiant trouvé.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center rounded-b-2xl">
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                    <span className="text-red-500">{absentIds.size}</span> absents / <span className="text-green-600">{etudiants.length - absentIds.size}</span> présents
                  </p>
                  <button 
                    onClick={() => setStep('verify')} 
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
                  >
                    Vérifier et Valider <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 'verify' && (
              <div className="flex-1 flex flex-col p-6 overflow-hidden">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-3 text-amber-600">
                    <AlertTriangle className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">Vérification avant validation</h3>
                  <p className="text-slate-500 dark:text-slate-400 mt-2">
                    Vous allez valider l'appel avec <strong>{etudiants.length - absentIds.size} présents</strong> et <strong>{absentIds.size} absents</strong>.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">
                    Liste des {absentIds.size} absent(s)
                  </h4>
                  {absentsList.length === 0 ? (
                    <p className="text-center text-sm text-green-600 font-bold py-4">Tout le monde est présent ! 🎉</p>
                  ) : (
                    <ul className="space-y-2">
                      {absentsList.map(e => (
                        <li key={e.id_etudiant} className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                          <span className="font-bold text-sm text-slate-800 dark:text-white">{e.nom} {e.prenom}</span>
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">{e.cne}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button 
                    onClick={() => setStep('list')} 
                    disabled={saving}
                    className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 font-bold text-sm rounded-xl transition-colors disabled:opacity-50"
                  >
                    Retour à la liste
                  </button>
                  <button 
                    onClick={handleSubmit} 
                    disabled={saving}
                    className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                    Confirmer l'appel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Les autres Modales (Planifier, Éditer, etc.)
// ─────────────────────────────────────────────────────────────

function PlanSessionModal({ onClose, onRefresh, pushToast }: { onClose: () => void, onRefresh: () => void, pushToast: any }) {
  const [loadingContext, setLoadingContext] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [salles, setSalles] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedPair, setSelectedPair] = useState('');

  const [formData, setFormData] = useState({
    id_cours: '', id_filiere: '', id_salle: '',
    date: new Date().toISOString().split('T')[0],
    heure_debut: '08:30', heure_fin: '10:30', type_seance: 'CM'
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_SEANCES}/plan-context`, { headers: { 'Authorization': `Bearer ${token}` } });
        const json = await res.json();
        if (json.success) {
          setAssignments(json.data.assignments || []);
          if (json.data.assignments?.length > 0) {
            const first = json.data.assignments[0];
            setSelectedPair(`${first.id_filiere}_${first.id_cours}`);
            setFormData(prev => ({ ...prev, id_filiere: first.id_filiere, id_cours: first.id_cours }));
          }
        }
      } catch (e) { pushToast('error', 'Erreur de chargement des cours.'); }
      finally { setLoadingContext(false); }
    };
    fetchInitialData();
  }, [pushToast]);

  useEffect(() => {
    if (!formData.date || !formData.heure_debut || !formData.heure_fin || formData.heure_debut >= formData.heure_fin) return;
    const fetchAvailableRooms = async () => {
      setLoadingRooms(true);
      try {
        const token = localStorage.getItem('token');
        const query = new URLSearchParams({ date: formData.date, heure_debut: formData.heure_debut, heure_fin: formData.heure_fin });
        const res = await fetch(`${API_BASE_SEANCES}/plan-context?${query.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const json = await res.json();
        if (json.success) {
          setSalles(json.data.salles || []);
          if (!json.data.salles?.some((s: any) => s.id_salle === formData.id_salle)) setFormData(prev => ({ ...prev, id_salle: '' }));
        }
      } catch (e) { pushToast('error', 'Erreur lors de la vérification des salles.'); }
      finally { setLoadingRooms(false); }
    };
    fetchAvailableRooms();
  }, [formData.date, formData.heure_debut, formData.heure_fin, pushToast]);

  const handlePairChange = (value: string) => {
    setSelectedPair(value);
    const [id_filiere, id_cours] = value.split('_');
    setFormData(prev => ({ ...prev, id_filiere, id_cours }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.heure_debut >= formData.heure_fin) return pushToast('error', "L'heure de fin doit être postérieure à l'heure de début.");
    if (!formData.id_cours || !formData.id_filiere) return pushToast('error', "Veuillez sélectionner un cours et une filière.");
    if (!formData.id_salle) return pushToast('error', "Veuillez choisir une salle disponible.");
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_SEANCES}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      pushToast('success', data.message);
      onRefresh(); onClose();
    } catch (err: any) { pushToast('error', err.message); } 
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => !saving && onClose()}>
      <div className="card w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800 bg-primary-50 dark:bg-primary-900/20 rounded-t-2xl">
          <h2 className="text-lg font-bold text-primary-800 dark:text-primary-400 flex items-center gap-2"><PlusCircle className="h-5 w-5" /> Planifier une séance</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        
        {loadingContext ? (
          <div className="p-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Étape 1 : Créneau horaire</span>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Date <span className="text-red-500">*</span></label>
                <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Heure début <span className="text-red-500">*</span></label>
                  <input type="time" required value={formData.heure_debut} onChange={e => setFormData({ ...formData, heure_debut: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Heure fin <span className="text-red-500">*</span></label>
                  <input type="time" required value={formData.heure_fin} onChange={e => setFormData({ ...formData, heure_fin: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Filière & Matière enseignée <span className="text-red-500">*</span></label>
              <select required value={selectedPair} onChange={e => handlePairChange(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                <option value="" disabled>Sélectionnez une filière et son cours</option>
                {assignments.map((item: any) => <option key={`${item.id_filiere}_${item.id_cours}`} value={`${item.id_filiere}_${item.id_cours}`}>{item.label}</option>)}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Salle libre <span className="text-red-500">*</span></label>
                {loadingRooms && <span className="text-[11px] text-primary-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Vérification...</span>}
              </div>
              <select required disabled={loadingRooms} value={formData.id_salle} onChange={e => setFormData({ ...formData, id_salle: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white disabled:opacity-50">
                <option value="" disabled>{loadingRooms ? 'Recherche des salles libres...' : salles.length === 0 ? 'Aucune salle disponible' : `Sélectionnez une salle (${salles.length} dispo)`}</option>
                {salles.map((s: any) => <option key={s.id_salle} value={s.id_salle}>{s.numero} {s.nom ? `- ${s.nom}` : ''} (Capacité: {s.capacite})</option>)}
              </select>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
              <button type="submit" disabled={saving || loadingRooms || salles.length === 0 || assignments.length === 0} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-lg shadow-md flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />} Créer la séance
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function EditSessionModal({ seance, onClose, onRefresh, pushToast }: { seance: Seance, onClose: () => void, onRefresh: () => void, pushToast: any }) {
  const [formData, setFormData] = useState({ date_seance: seance.date_seance.split('T')[0], heure_debut: formatTime(seance.heure_debut), heure_fin: formatTime(seance.heure_fin), type_seance: seance.type_seance, statut: seance.statut });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_SEANCES}/${seance.id_seance}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      pushToast('success', "Séance modifiée avec succès.");
      onRefresh(); onClose();
    } catch (err: any) { pushToast('error', err.message); } 
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => !saving && onClose()}>
      <div className="card w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Modifier la séance</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl mb-4">
            <p className="text-sm font-bold text-slate-800 dark:text-white">{seance.element_module?.nom_element}</p>
            <p className="text-xs text-slate-500">{seance.salle?.nom_salle || seance.salle?.numero}</p>
          </div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">Date</label><input type="date" required value={formData.date_seance} onChange={e => setFormData({...formData, date_seance: e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold text-slate-500 mb-1">Heure début</label><input type="time" required value={formData.heure_debut} onChange={e => setFormData({...formData, heure_debut: e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
            <div><label className="block text-xs font-bold text-slate-500 mb-1">Heure fin</label><input type="time" required value={formData.heure_fin} onChange={e => setFormData({...formData, heure_fin: e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Statut</label>
            <select value={formData.statut} onChange={e => setFormData({...formData, statut: e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white">
              {['Planifiee', 'Annulee', 'Terminee'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResolveConflictsModal({ conflicts, onClose, onRefresh, pushToast }: { conflicts: Seance[][], onClose: () => void, onRefresh: () => void, pushToast: any }) {
  const [processing, setProcessing] = useState(false);
  const [selections, setSelections] = useState<Record<number, string>>({});

  const handleSelectKept = (groupIndex: number, seanceId: string) => setSelections(prev => ({ ...prev, [groupIndex]: seanceId }));

  const handleResolveAll = async () => {
    const tasks = conflicts.map((group, index) => {
      const keptId = selections[index];
      if (!keptId) return null;
      return { kept_seance_id: keptId, deleted_seance_ids: group.filter(s => s.id_seance !== keptId).map(s => s.id_seance) };
    }).filter(Boolean);

    if (tasks.length === 0) return pushToast('error', 'Veuillez faire un choix pour au moins un conflit.');
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      await Promise.all(tasks.map(task => fetch(`${API_BASE_SEANCES}/resolve-conflicts`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(task) }).then(res => res.json()).then(data => { if(!data.success) throw new Error(data.message) })));
      pushToast('success', `${tasks.length} conflit(s) résolu(s) avec succès.`);
      onRefresh(); onClose();
    } catch (err: any) { pushToast('error', err.message || 'Erreur lors de la résolution.'); } finally { setProcessing(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="bg-amber-50 dark:bg-amber-900/30 p-5 border-b border-amber-200 dark:border-amber-800 rounded-t-2xl flex justify-between items-start">
          <div><h2 className="text-lg font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Gérer les conflits d'horaires</h2><p className="text-sm text-amber-700 dark:text-amber-500 mt-1">Sélectionnez la séance à <strong>maintenir</strong> pour chaque créneau.</p></div>
          <button onClick={onClose} className="text-amber-700 hover:bg-amber-200/50 p-1 rounded-md"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          {conflicts.map((group, index) => (
            <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 border-b flex items-center gap-2"><Clock className="h-4 w-4 text-slate-500" /><span className="text-sm font-bold text-slate-700 dark:text-slate-300 capitalize">{formatDate(group[0].date_seance)} à {formatTime(group[0].heure_debut)}</span></div>
              <div className="p-3 space-y-2 bg-amber-50/20 dark:bg-slate-900">
                {group.map((s) => {
                  const isSelected = selections[index] === s.id_seance;
                  return (
                    <label key={s.id_seance} className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${isSelected ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 shadow-sm' : 'border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800'}`}>
                      <input type="radio" name={`conflict_${index}`} checked={isSelected} onChange={() => handleSelectKept(index, s.id_seance)} className="mt-1 h-4 w-4 text-amber-600" />
                      <div className="flex-1"><p className={`font-bold text-sm ${isSelected ? 'text-amber-900 dark:text-amber-400' : 'text-slate-800 dark:text-white'}`}>{s.element_module?.nom_element}</p><p className="text-xs text-slate-500 flex justify-between"><span>{s.element_module?.module?.filiere?.nom_filiere || s.element_module?.module?.filiere?.nom}</span><span className="flex items-center gap-1 font-medium"><MapPin className="h-3 w-3" /> {s.salle?.nom_salle || s.salle?.numero}</span></p></div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg">Fermer</button>
          <button onClick={handleResolveAll} disabled={processing} className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-lg shadow-md flex items-center gap-2">{processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Appliquer les choix</button>
        </div>
      </div>
    </div>
  );
}

function EndCourseModal({ seances, onClose, onRefresh, pushToast }: { seances: Seance[], onClose: () => void, onRefresh: () => void, pushToast: any }) {
  const [processing, setProcessing] = useState(false);
  const uniqueCourses = Array.from(new Map(seances.filter(s => s.element_module).map(s => [s.element_module!.id_element, s.element_module])).values());
  const [selectedCourse, setSelectedCourse] = useState(uniqueCourses[0]?.id_element || '');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return pushToast('error', "Veuillez sélectionner un cours.");
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_SEANCES}/end-course`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ id_element: selectedCourse, end_date: endDate }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      pushToast('success', data.message);
      onRefresh(); onClose();
    } catch (err: any) { pushToast('error', err.message); } finally { setProcessing(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CalendarOff className="h-5 w-5 text-red-500" /> Clôturer un cours
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Attention : toutes les séances programmées après cette date seront définitivement supprimées.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Cours</label>
            <select required value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white">
              {uniqueCourses.map(c => <option key={c.id_element} value={c.id_element}>{c.nom_element}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Date de fin effective</label>
            <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
            <button type="submit" disabled={processing} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-md flex items-center gap-2 disabled:opacity-50">
              {processing && <Loader2 className="h-4 w-4 animate-spin" />} Clôturer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NotifyStudentsModal({ onClose, pushToast }: { onClose: () => void, pushToast: any }) {
  const [context, setContext] = useState({ filieres: [], etudiants: [] });
  const [loadingContext, setLoadingContext] = useState(true);
  const [targetType, setTargetType] = useState<'FILIERES' | 'ETUDIANTS'>('FILIERES');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [titre, setTitre] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_SEANCES}/communications/context`, { headers: { 'Authorization': `Bearer ${token}` } });
        const json = await res.json();
        if (json.success) setContext(json.data);
      } catch (err) { pushToast('error', "Erreur chargement contexte."); } finally { setLoadingContext(false); }
    };
    fetchContext();
  }, [pushToast]);

  const toggleSelection = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return pushToast('error', "Sélectionnez au moins un destinataire.");
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_SEANCES}/communications/notify`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ target_type: targetType, target_ids: selectedIds, titre, message }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      pushToast('success', data.message);
      onClose();
    } catch (err: any) { pushToast('error', err.message); } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b bg-indigo-50 dark:bg-indigo-900/20 rounded-t-2xl flex justify-between"><h2 className="text-lg font-bold text-indigo-800 dark:text-indigo-400 flex items-center gap-2"><Bell className="h-5 w-5" /> Notifier vos Étudiants</h2><button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button></div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="flex gap-4"><label className={`flex-1 p-3 border rounded-xl cursor-pointer ${targetType === 'FILIERES' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-200'}`}><input type="radio" checked={targetType === 'FILIERES'} onChange={() => { setTargetType('FILIERES'); setSelectedIds([]); }} className="hidden" /><div className="text-sm font-bold flex items-center gap-2"><Users className="h-4 w-4" /> Par Filière</div></label><label className={`flex-1 p-3 border rounded-xl cursor-pointer ${targetType === 'ETUDIANTS' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-200'}`}><input type="radio" checked={targetType === 'ETUDIANTS'} onChange={() => { setTargetType('ETUDIANTS'); setSelectedIds([]); }} className="hidden" /><div className="text-sm font-bold flex items-center gap-2"><User className="h-4 w-4" /> Par Étudiant(s)</div></label></div>
          <div className="max-h-40 overflow-y-auto border rounded-xl p-2 bg-slate-50 dark:bg-slate-800/30">
            {loadingContext ? <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400 my-4" /> : targetType === 'FILIERES' ? context.filieres.map((f: any) => <label key={f.id_filiere} className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer"><input type="checkbox" checked={selectedIds.includes(f.id_filiere)} onChange={() => toggleSelection(f.id_filiere)} className="h-4 w-4 text-indigo-600" /><span className="text-sm font-bold">{f.nom_filiere || f.nom}</span></label>) : context.etudiants.map((e: any) => <label key={e.id_etudiant} className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer"><input type="checkbox" checked={selectedIds.includes(e.id_etudiant)} onChange={() => toggleSelection(e.id_etudiant)} className="h-4 w-4 text-indigo-600" /><span className="text-sm font-bold">{e.utilisateur?.prenom} {e.utilisateur?.nom}</span></label>)}
          </div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">Titre</label><input type="text" required value={titre} onChange={e => setTitre(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">Message</label><textarea required value={message} onChange={e => setMessage(e.target.value)} rows={4} className="w-full rounded-lg border px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
        </form>
        <div className="p-5 border-t flex justify-end gap-3"><button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button><button onClick={handleSubmit} disabled={sending} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Envoyer</button></div>
      </div>
    </div>
  );
}