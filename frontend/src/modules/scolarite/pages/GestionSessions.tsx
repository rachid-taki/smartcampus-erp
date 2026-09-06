import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapPin,
  Clock,
  CheckCircle,
  X,
  AlertTriangle,
  Search,
  Plus,
  Loader2,
  BookOpen,
  User,
  Activity,
  Filter,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

type StatutSession = 'Planifiee' | 'En_Cours' | 'Terminee' | 'Annulee';

interface Salle { numero: string; nom: string | null; capacite: number; }
interface Cours { nom: string; code: string; }
interface Professeur { id_professeur: string; employe?: { utilisateur?: { nom: string; prenom: string; } } }
interface Filiere { id_filiere: string; nom: string; code: string | null; }

interface SessionSalle {
  id_session: string;
  id_salle: string;
  id_cours: string;
  id_professeur: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  heure_debut_reelle?: string | null;
  heure_fin_reelle?: string | null;
  statut: StatutSession;
  nombre_etudiants?: number | null;
  retard_moyen?: number | null;
  salle?: Salle;
  cours?: Cours;
  filiere?: Filiere | null;
  id_filiere?: string | null;
  professeur?: Professeur;
}

interface Toast { id: number; type: 'success' | 'error'; message: string; }

const API_BASE = 'http://localhost:3000/api/scolarite/sessions';
const STATUT_OPTIONS: StatutSession[] = ['Planifiee', 'En_Cours', 'Terminee', 'Annulee'];

// ─────────────────────────────────────────────────────────────
// Helpers & Theming
// ─────────────────────────────────────────────────────────────

const formatDateFr = (isoDate: string): string => {
  if (!isoDate) return 'N/A';
  try {
    return new Date(isoDate).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
  } catch { return isoDate; }
};

const formatTimeFr = (isoTime: string | null | undefined): string => {
  if (!isoTime) return '--:--';
  try {
    return new Date(isoTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  } catch { return isoTime; }
};

const getStatutBadgeClasses = (statut: StatutSession): string => {
  const map: Record<StatutSession, string> = {
    Planifiee: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
    En_Cours: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.2)]',
    Terminee: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    Annulee: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
  };
  return map[statut] ?? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
};

// ─────────────────────────────────────────────────────────────
// UI Components
// ─────────────────────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-full max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`flex items-start gap-3 rounded-2xl shadow-2xl border p-4 backdrop-blur-xl ${
              toast.type === 'success' 
                ? 'bg-emerald-50/90 dark:bg-[#064e3b]/90 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200' 
                : 'bg-rose-50/90 dark:bg-[#4c0519]/90 border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-200'
            }`}
          >
            <div className="mt-0.5">
              {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </div>
            <p className="text-sm font-medium flex-1 leading-snug">{toast.message}</p>
            <button onClick={() => onDismiss(toast.id)} className="opacity-60 hover:opacity-100 p-1"><X className="h-4 w-4" /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function CreateSessionModal({ preselectedFiliere, onClose, onSaved, pushToast }: any) {
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const [salles, setSalles] = useState<any[]>([]);
  const [coursList, setCoursList] = useState<any[]>([]);
  const [profsList, setProfsList] = useState<any[]>([]);
  const [filieres, setFilieres] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    id_salle: '', id_filiere: preselectedFiliere, id_cours: '', id_professeur: '', date: '', heure_debut: '', heure_fin: '',
  });

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    Promise.all([
      fetch(`http://localhost:3000/api/salles`, { signal }).then(r => r.json()),
      fetch(`${API_BASE}/cours`, { signal }).then(r => r.json()),
      fetch(`${API_BASE}/professeurs`, { signal }).then(r => r.json()),
      fetch(`http://localhost:3000/api/scolarite/filieres`, { signal }).then(r => r.json())
    ]).then(([sRes, cRes, pRes, fRes]) => {
      if (sRes.success) setSalles(sRes.data);
      if (cRes.success) setCoursList(cRes.data);
      if (pRes.success) setProfsList(pRes.data);
      if (fRes.success) setFilieres(fRes.data);
      setLoading(false);
    }).catch(err => {
      if (err.name !== 'AbortError') setLoading(false);
    });

    return () => controller.abort();
  }, []);

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.id_salle || !form.id_cours || !form.id_professeur || !form.date || !form.heure_debut || !form.heure_fin) {
      setFormError('Tous les champs marqués d\'un astérisque sont requis.'); return;
    }
    if (form.heure_fin <= form.heure_debut) {
      setFormError("L'heure de fin doit être strictement postérieure à l'heure de début."); return;
    }

    setSaving(true);
    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message);

      pushToast('success', 'La session a été planifiée avec succès.');
      await onSaved();
      onClose();
    } catch (err: any) {
      if (err.name !== 'AbortError') setFormError(err.message || 'Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-[#0B1120] px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-500/40 transition-shadow";
  const labelClass = "block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-[#0B1120]/80 backdrop-blur-md p-4" onClick={() => !saving && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-white dark:bg-[#0F172A] border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#0F172A]/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Planifier une Session</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configurez une nouvelle occupation de salle.</p>
          </div>
          <button onClick={onClose} disabled={saving} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-indigo-500">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Chargement des ressources...</p>
            </div>
          ) : (
            <>
              {formError && (
                <div className="flex items-start gap-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-4 text-sm text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium">{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Salle <span className="text-rose-500">*</span></label>
                  <select value={form.id_salle} onChange={e => setForm({ ...form, id_salle: e.target.value })} className={inputClass}>
                    <option value="" disabled>-- Sélectionner --</option>
                    {salles.map(s => <option key={s.id_salle} value={s.id_salle}>{s.numero} {s.nom ? `(${s.nom})` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Filière Ciblée</label>
                  <select value={form.id_filiere} onChange={e => setForm({ ...form, id_filiere: e.target.value })} className={inputClass}>
                    <option value="">-- Non assignée --</option>
                    {filieres.map(f => <option key={f.id_filiere} value={f.id_filiere}>{f.nom} ({f.code})</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Cours <span className="text-rose-500">*</span></label>
                  <select value={form.id_cours} onChange={e => setForm({ ...form, id_cours: e.target.value })} className={inputClass}>
                    <option value="" disabled>-- Sélectionner --</option>
                    {coursList.map(c => <option key={c.id_cours} value={c.id_cours}>{c.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Professeur <span className="text-rose-500">*</span></label>
                  <select value={form.id_professeur} onChange={e => setForm({ ...form, id_professeur: e.target.value })} className={inputClass}>
                    <option value="" disabled>-- Sélectionner --</option>
                    {profsList.map(p => <option key={p.id_professeur} value={p.id_professeur}>{p.employe?.utilisateur?.prenom} {p.employe?.utilisateur?.nom}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="col-span-3 md:col-span-1">
                  <label className={labelClass}>Date <span className="text-rose-500">*</span></label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputClass} />
                </div>
                <div className="col-span-3 md:col-span-1">
                  <label className={labelClass}>Début <span className="text-rose-500">*</span></label>
                  <input type="time" value={form.heure_debut} onChange={e => setForm({ ...form, heure_debut: e.target.value })} className={inputClass} />
                </div>
                <div className="col-span-3 md:col-span-1">
                  <label className={labelClass}>Fin <span className="text-rose-500">*</span></label>
                  <input type="time" value={form.heure_fin} onChange={e => setForm({ ...form, heure_fin: e.target.value })} className={inputClass} />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 px-8 py-5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#0F172A]">
          <button onClick={onClose} disabled={saving} className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Annuler</button>
          <button onClick={handleSubmit} disabled={saving || loading} className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Confirmer la session
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function UpdateSessionModal({ session, onClose, onSaved, pushToast }: any) {
  const [statut, setStatut] = useState<StatutSession>(session.statut);
  const [heureDebutReelle, setHeureDebutReelle] = useState(session.heure_debut_reelle ? formatTimeFr(session.heure_debut_reelle) : '');
  const [heureFinReelle, setHeureFinReelle] = useState(session.heure_fin_reelle ? formatTimeFr(session.heure_fin_reelle) : '');
  const [nbEtudiants, setNbEtudiants] = useState(session.nombre_etudiants?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null); setSaving(true);
    try {
      const payload: Record<string, any> = { statut };
      if (statut === 'En_Cours' && heureDebutReelle) payload.heure_debut_reelle = heureDebutReelle;
      if (statut === 'Terminee') {
        if (heureFinReelle) payload.heure_fin_reelle = heureFinReelle;
        if (nbEtudiants) payload.nombre_etudiants = parseInt(nbEtudiants, 10);
      }
      const response = await fetch(`${API_BASE}/${session.id_session}/statut`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message);
      pushToast('success', 'Statut mis à jour avec succès.');
      await onSaved();
      onClose();
    } catch (err: any) {
      if (err.name !== 'AbortError') setError(err.message || 'Erreur réseau');
    } finally { setSaving(false); }
  };

  const inputClass = "w-full rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-[#0B1120] px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-500/40 transition-shadow";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-[#0B1120]/80 backdrop-blur-md p-4" onClick={() => !saving && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-[#0F172A] border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#0F172A]/50">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Mise à jour</h2>
          <div className="mt-3 bg-white dark:bg-[#0B1120] rounded-xl p-3 border border-slate-200 dark:border-slate-800/80">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{session.cours?.nom}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Salle {session.salle?.numero} · {formatTimeFr(session.heure_debut)} à {formatTimeFr(session.heure_fin)}</p>
          </div>
        </div>

        <div className="p-8 space-y-5">
          {error && <div className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-3 rounded-xl font-medium">{error}</div>}
          
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Statut Actuel</label>
            <select value={statut} onChange={e => setStatut(e.target.value as StatutSession)} className={inputClass}>
              {STATUT_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>

          {statut === 'En_Cours' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Heure de début réelle</label>
              <input type="time" value={heureDebutReelle} onChange={e => setHeureDebutReelle(e.target.value)} className={inputClass} />
            </motion.div>
          )}

          {statut === 'Terminee' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Fin Réelle</label>
                <input type="time" value={heureFinReelle} onChange={e => setHeureFinReelle(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Présents</label>
                <input type="number" min="0" value={nbEtudiants} onChange={e => setNbEtudiants(e.target.value)} placeholder="ex: 25" className={inputClass} />
              </div>
            </motion.div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-8 py-5 bg-slate-50/50 dark:bg-[#0B1120]/50 border-t border-slate-100 dark:border-slate-800/60">
          <button onClick={onClose} disabled={saving} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Annuler</button>
          <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component View
// ─────────────────────────────────────────────────────────────

export default function GestionSessions() {
  const [sessions, setSessions] = useState<SessionSalle[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [filiereFilter, setFiliereFilter] = useState<string>(''); 
  
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [statutFilter, setStatutFilter] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sessionToUpdate, setSessionToUpdate] = useState<SessionSalle | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((type: Toast['type'], message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch('http://localhost:3000/api/scolarite/filieres', { signal: controller.signal })
      .then(res => res.json())
      .then(json => { if (json.success) setFilieres(json.data); })
      .catch(err => { if (err.name !== 'AbortError') console.error(err); });
    return () => controller.abort();
  }, []);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    if (!filiereFilter) { setSessions([]); setLoading(false); return; }
    setLoading(true);
    try {
      const url = filiereFilter === 'all' ? API_BASE : `${API_BASE}?id_filiere=${filiereFilter}`;
      const response = await fetch(url, { signal });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message);
      setSessions(json.data || []);
    } catch (err: any) {
      if (err.name !== 'AbortError') pushToast('error', 'Erreur de synchronisation des sessions.');
    } finally { setLoading(false); }
  }, [filiereFilter, pushToast]);

  useEffect(() => { 
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  // 🔒 FILTRAGE STRICT CÔTÉ FRONTEND
  const filteredSessions = sessions.filter(s => {
    // 1. Recherche texte
    const searchStr = `${s.salle?.numero} ${s.cours?.nom} ${s.professeur?.employe?.utilisateur?.nom}`.toLowerCase();
    const matchesSearch = !searchInput.trim() || searchStr.includes(searchInput.toLowerCase());
    
    // 2. Filtre statut
    const matchesStatut = !statutFilter || s.statut === statutFilter;
    
    // 3. Filtre filière strict (au cas où le backend renverrait toutes les sessions)
    let matchesFiliere = true;
    if (filiereFilter && filiereFilter !== 'all') {
      if (filiereFilter === 'none') {
        matchesFiliere = !s.id_filiere && !s.filiere;
      } else {
        matchesFiliere = s.id_filiere === filiereFilter || s.filiere?.id_filiere === filiereFilter;
      }
    }

    return matchesSearch && matchesStatut && matchesFiliere;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 p-6 md:p-10 font-sans selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30">
              <Activity className="h-7 w-7" />
              <div className="absolute top-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-indigo-600 animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Smart Planning</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Supervision temps réel des sessions et suivi des présences.</p>
            </div>
          </div>
        </header>

        {/* HERO COMMAND CENTER (Selector) */}
        <div className="relative rounded-[2rem] p-[1px] bg-gradient-to-b from-indigo-500/30 to-purple-500/10 dark:from-indigo-500/20 dark:to-[#0F172A] shadow-2xl shadow-indigo-500/5">
          <div className="relative z-10 rounded-[31px] bg-white dark:bg-[#0F172A] p-6 lg:p-8 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 w-full flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                <Filter className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">Contexte d'affichage</label>
                <select 
                  value={filiereFilter}
                  onChange={e => setFiliereFilter(e.target.value)}
                  className="w-full xl:w-96 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-[#0B1120] px-4 py-3 text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow appearance-none cursor-pointer"
                >
                  <option value="" disabled>👉 Sélectionnez une vue pour démarrer</option>
                  <option value="all">🌐 Vue Globale (Toutes les filières)</option>
                  <option value="none">⚠️ Sessions orphelines (Sans filière)</option>
                  {filieres.map(f => (
                    <option key={f.id_filiere} value={f.id_filiere}>📚 {f.nom} {f.code ? `(${f.code})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Les compteurs s'ajustent dynamiquement via filteredSessions */}
            {filiereFilter && (
              <div className="hidden lg:flex items-center gap-6 border-l border-slate-200 dark:border-slate-800 pl-8">
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Sessions</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white tabular-nums leading-none">{filteredSessions.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-amber-500/80 uppercase tracking-wider mb-1">En Cours</p>
                  <p className="text-2xl font-black text-amber-500 tabular-nums leading-none">{filteredSessions.filter(s => s.statut === 'En_Cours').length}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        {!filiereFilter ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full"></div>
              <div className="relative h-24 w-24 bg-white dark:bg-[#0F172A] border border-slate-100 dark:border-slate-800 rounded-full flex items-center justify-center shadow-2xl">
                <BookOpen className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">Tableau de bord inactif</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">Veuillez sélectionner un contexte d'affichage dans la barre ci-dessus pour charger les données de planification.</p>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-5 border border-slate-200 dark:border-slate-800/60 shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total des sessions</p>
                <p className="text-3xl font-bold text-slate-800 dark:text-white">{filteredSessions.length}</p>
              </div>
              <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-5 border border-slate-200 dark:border-slate-800/60 shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">En Cours actuellement</p>
                <p className="text-3xl font-bold text-amber-600">{filteredSessions.filter(s => s.statut === 'En_Cours').length}</p>
              </div>
              <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-5 border border-slate-200 dark:border-slate-800/60 shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sessions Terminées</p>
                <p className="text-3xl font-bold text-emerald-600">{filteredSessions.filter(s => s.statut === 'Terminee').length}</p>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Rechercher une salle, un cours, un professeur..." className="w-full pl-11 pr-4 py-3 text-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm" />
                </div>
                <div className="relative min-w-[180px]">
                  <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)} className="w-full h-full appearance-none pl-4 pr-10 py-3 text-sm font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm cursor-pointer">
                    <option value="">Tous les statuts</option>
                    {STATUT_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                  <Filter className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <button onClick={() => setShowCreateModal(true)} className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-2xl shadow-lg transition-all active:scale-[0.98]">
                <Plus className="h-5 w-5" /> Ajouter une session
              </button>
            </div>

            {/* Data Table */}
            <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-slate-50/50 dark:bg-[#0B1120]/50 border-b border-slate-100 dark:border-slate-800/80">
                    <tr>
                      <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Salle & Date</th>
                      <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Détails du Cours</th>
                      <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Planification</th>
                      <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Smart Tracking</th>
                      <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Statut</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {loading ? (
                      <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500" /></td></tr>
                    ) : filteredSessions.length === 0 ? (
                      <tr><td colSpan={6} className="py-20 text-center text-sm font-medium text-slate-500 dark:text-slate-400">Aucune session trouvée pour ces critères.</td></tr>
                    ) : (
                      filteredSessions.map((s, index) => (
                        <motion.tr 
                          key={s.id_session} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(index * 0.05, 0.5) }}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center flex-shrink-0 border border-indigo-100 dark:border-indigo-500/20">
                                <MapPin className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white text-sm">{s.salle?.numero}</p>
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{formatDateFr(s.date)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <p className="font-bold text-slate-900 dark:text-white text-sm mb-1.5 truncate max-w-[250px]">{s.cours?.nom || 'Inconnu'}</p>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                <User className="h-3 w-3" /> {s.professeur?.employe?.utilisateur?.prenom} {s.professeur?.employe?.utilisateur?.nom}
                              </div>
                              {s.filiere && (
                                <span className="px-2 py-1 rounded-md bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[10px] font-bold border border-purple-200 dark:border-purple-500/20">
                                  {s.filiere.code || s.filiere.nom}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                              <Clock className="h-3.5 w-3.5 text-slate-400" /> 
                              {formatTimeFr(s.heure_debut)} <span className="text-slate-400 mx-1">→</span> {formatTimeFr(s.heure_fin)}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            {s.heure_debut_reelle ? (
                              <div className="flex flex-col gap-1.5">
                                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between max-w-[140px]">
                                  Début <span className="font-mono font-bold text-slate-900 dark:text-slate-200">{formatTimeFr(s.heure_debut_reelle)}</span>
                                </div>
                                {s.heure_fin_reelle && (
                                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between max-w-[140px]">
                                    Fin <span className="font-mono font-bold text-slate-900 dark:text-slate-200">{formatTimeFr(s.heure_fin_reelle)}</span>
                                  </div>
                                )}
                                {s.nombre_etudiants !== null && s.nombre_etudiants !== undefined && (
                                  <div className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded-md w-max">
                                    <CheckCircle className="h-3 w-3" /> {s.nombre_etudiants} badgés
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 italic flex items-center gap-1.5">
                                <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div> En attente de capteur
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getStatutBadgeClasses(s.statut)}`}>
                              {s.statut === 'En_Cours' && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1.5" />}
                              {s.statut.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <button onClick={() => setSessionToUpdate(s)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 rounded-xl shadow-sm transition-all opacity-0 group-hover:opacity-100 focus:opacity-100">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showCreateModal && <CreateSessionModal preselectedFiliere={filiereFilter !== 'all' && filiereFilter !== 'none' ? filiereFilter : ''} onClose={() => setShowCreateModal(false)} onSaved={fetchData} pushToast={pushToast} />}
        {sessionToUpdate && <UpdateSessionModal session={sessionToUpdate} onClose={() => setSessionToUpdate(null)} onSaved={fetchData} pushToast={pushToast} />}
      </AnimatePresence>
      <ToastContainer toasts={toasts} onDismiss={id => setToasts(t => t.filter(x => x.id !== id))} />
    </div>
  );
}