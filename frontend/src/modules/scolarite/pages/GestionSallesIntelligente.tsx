import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, ShieldAlert, CheckCircle, X, Calendar, Users,
  Loader2, RefreshCw, Search, GraduationCap, User, AlertTriangle,
  Radio, TrendingUp, CalendarDays, Combine, Undo2, FileUp, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API = 'http://localhost:3000/api/scolarite';
const DAY_START = 8 * 60, DAY_END = 20 * 60;

interface Session { id_session: string; id_salle: string; date: string; heure_debut: string; heure_fin: string; statut: string; nombre_etudiants?: number; cours?: { nom: string }; filiere?: { nom: string } | null; professeur?: { utilisateur?: { nom: string; prenom: string } } }
interface Salle { id_salle: string; numero: string; nom: string | null; capacite: number; type: string; statut: string }
interface Reservation { id_reservation: string; id_salle: string; heure_debut: string; heure_fin: string; motif: string; statut: string; demandeur?: { nom: string; prenom: string } }
interface Alerte { id_alerte: string; type: string; description: string; gravite: string; statut: string; salle?: { numero: string } }

const min = (t: string) => { const d = new Date(t); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const fmtH = (t: string) => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
const pct = (m: number) => Math.max(0, Math.min(100, ((m - DAY_START) / (DAY_END - DAY_START)) * 100));

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i); }, []);
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 dark:bg-black border border-slate-700 shadow-sm">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="text-xs font-mono font-bold text-emerald-400 tabular-nums">{now.toLocaleTimeString('fr-FR')}</span>
      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Live</span>
    </div>
  );
}

export default function GestionSallesIntelligente({ onNavigateToEmplois }: { onNavigateToEmplois?: () => void }) {
  const [salles, setSalles] = useState<Salle[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSalle, setSelectedSalle] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [now, setNow] = useState(new Date());
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // États pour la fusion (MERGE)
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeSelection, setMergeSelection] = useState<string[]>([]);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');
  const [mergeName, setMergeName] = useState('');
  const [mergeCapacite, setMergeCapacite] = useState(30);
  const [mergeType, setMergeType] = useState('Salle_Cours');
  const [isMerging, setIsMerging] = useState(false);

  // 🔄 NOUVEAU : État pour l'annulation d'action (Import ou Fusion)
  const [reversibleAction, setReversibleAction] = useState<{ type: 'import' | 'merge'; description: string; undoFn: () => Promise<void> } | null>(null);

  const nowMin = now.getHours() * 60 + now.getMinutes();

  useEffect(() => { const i = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(i); }, []);

  const load = useCallback(async () => {
    try {
      const [pl, al] = await Promise.all([
        fetch(`${API}/salles/planning?date=${date}`).then(r => r.json()),
        fetch(`${API}/alertes`).then(r => r.json()), // ✅ CORRIGÉ ICI
      ]);
      if (pl.success) {
        setSalles(pl.data.salles || []); setSessions(pl.data.sessions || []); setReservations(pl.data.reservations || []);
        if (!selectedSalle && pl.data.salles?.length) setSelectedSalle(pl.data.salles[0].id_salle);
      }
      setAlertes((al.data || []).filter((a: Alerte) => a.statut !== 'Resolue' && a.statut !== 'Ignoree'));
    } catch { setToast({ type: 'error', msg: 'Erreur de chargement des données.' }); }
    setLoading(false);
  }, [date, selectedSalle]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!autoRefresh) return; const i = setInterval(load, 30000); return () => clearInterval(i); }, [autoRefresh, load]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 5000); return () => clearTimeout(t); }, [toast]);

  // 🔄 FONCTION D'ANNULATION
  const handleUndo = async () => {
    if (!reversibleAction) return;
    try {
      await reversibleAction.undoFn();
      setToast({ type: 'success', msg: 'Action annulée avec succès.' });
      setReversibleAction(null);
    } catch {
      setToast({ type: 'error', msg: "Impossible d'annuler l'action." });
    }
  };

  const analyser = async () => {
    setAnalyzing(true);
    try {
      const r = await fetch(`${API}/salles/analyser-conflits`, { method: 'POST' });
      const j = await r.json();
      setToast({ type: 'success', msg: `Analyse terminée : ${j.created} alerte(s) détectée(s).` });
      load();
    } catch { setToast({ type: 'error', msg: "Erreur d'analyse." }); }
    setAnalyzing(false);
  };

  // 🔄 SIMULATION D'IMPORTATION (avec capacité d'annulation)
  const handleImport = async () => {
    setImporting(true);
    try {
      // Remplace par ton vrai endpoint d'import
      const r = await fetch(`${API}/emplois/import`, { method: 'POST' }); 
      const j = await r.json();
      
      // On enregistre l'action pour permettre l'annulation
      setReversibleAction({
        type: 'import',
        description: 'Importation des emplois du temps effectuée',
        undoFn: async () => {
          await fetch(`${API}/emplois/undo-import`, { method: 'POST' }); // Endpoint d'annulation backend
          load();
        }
      });
      setToast({ type: 'success', msg: 'Importation réussie ! (Annulable pendant 15s)' });
      load();
      
      // L'option d'annulation expire après 15 secondes
      setTimeout(() => setReversibleAction(prev => prev?.type === 'import' ? null : prev), 15000);
    } catch {
      setToast({ type: 'error', msg: "Erreur lors de l'importation." });
    }
    setImporting(false);
  };

  const handleMerge = async () => {
    if (!mergeTargetId || mergeSelection.length < 2) return;
    setIsMerging(true);
    try {
      const sourceIds = mergeSelection.filter(id => id !== mergeTargetId);
      const r = await fetch('http://localhost:3000/api/emplois-ia/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: mergeTargetId, sourceIds, newName: mergeName, newCapacite: mergeCapacite, newType: mergeType })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message);
      
      // Enregistrer l'action pour annulation
      setReversibleAction({
        type: 'merge',
        description: `Fusion de ${mergeSelection.length} salles effectuée`,
        undoFn: async () => {
          await fetch('http://localhost:3000/api/emplois-ia/undo-merge', { 
            method: 'POST', 
            body: JSON.stringify({ targetId: mergeTargetId, sourceIds }) 
          });
          load();
        }
      });
      setToast({ type: 'success', msg: j.message });
      setShowMergeModal(false);
      setMergeSelection([]);
      load();
      setTimeout(() => setReversibleAction(prev => prev?.type === 'merge' ? null : prev), 15000);
    } catch (e: any) {
      setToast({ type: 'error', msg: e.message || 'Erreur lors de la fusion.' });
    }
    setIsMerging(false);
  };

  const toggleMergeSelection = (id: string) => {
    setMergeSelection(prev => {
      const newSel = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      if (!newSel.includes(mergeTargetId)) setMergeTargetId('');
      if (newSel.length === 1) {
        const s = salles.find(x => x.id_salle === newSel[0]);
        if (s) { setMergeTargetId(s.id_salle); setMergeName(s.numero); setMergeCapacite(s.capacite); setMergeType(s.type); }
      }
      return newSel;
    });
  };

  const isToday = date === new Date().toISOString().split('T')[0];
  const salleSessions = sessions.filter(s => s.id_salle === selectedSalle);
  const salleReservations = reservations.filter(r => r.id_salle === selectedSalle);
  const enCours = isToday ? salleSessions.find(s => min(s.heure_debut) <= nowMin && nowMin < min(s.heure_fin)) : null;
  const aSuivre = salleSessions.filter(s => min(s.heure_debut) > nowMin).sort((a, b) => min(a.heure_debut) - min(b.heure_debut))[0];

  const occupeesNow = isToday ? salles.filter(s => sessions.some(x => x.id_salle === s.id_salle && min(x.heure_debut) <= nowMin && nowMin < min(x.heure_fin))).length : 0;
  const conflicts = alertes.length;
  const tauxOcc = salles.length ? Math.round((occupeesNow / salles.length) * 100) : 0;

  const liveStatus = (id: string) => {
    if (!isToday) return { cur: null, next: null };
    const cur = sessions.find(s => s.id_salle === id && min(s.heure_debut) <= nowMin && nowMin < min(s.heure_fin));
    const next = sessions.filter(s => s.id_salle === id && min(s.heure_debut) > nowMin).sort((a, b) => min(a.heure_debut) - min(b.heure_debut))[0];
    return { cur, next };
  };

  const filteredSalles = salles.filter(s => !search || s.numero.toLowerCase().includes(search.toLowerCase()) || (s.nom || '').toLowerCase().includes(search.toLowerCase()));
  const sel = salles.find(s => s.id_salle === selectedSalle);

  return (
    <div className="min-h-screen p-5 md:p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950">
      {/* 🔄 BANDEAU D'ANNULATION (Apparaît après import/fusion) */}
      <AnimatePresence>
        {reversibleAction && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="sticky top-4 z-40 flex items-center justify-between p-4 rounded-xl bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 border border-indigo-500/30 backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg"><Undo2 className="h-5 w-5" /></div>
              <div>
                <p className="text-sm font-bold">Action récente : {reversibleAction.description}</p>
                <p className="text-xs text-indigo-200">Vous pouvez annuler cette opération si elle était une erreur.</p>
              </div>
            </div>
            <button 
              onClick={handleUndo}
              className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors shadow-sm"
            >
              <Undo2 className="h-4 w-4" /> Annuler
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Centre de contrôle des salles</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Suivi temps réel, emplois du temps et détection intelligente de conflits</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LiveClock />
          
          

          <button onClick={() => { setMergeSelection([]); setShowMergeModal(true); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all shadow-sm">
            <Combine className="h-3.5 w-3.5" /> Fusionner doublons
          </button>

          <button onClick={onNavigateToEmplois} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all shadow-sm">
            <CalendarDays className="h-3.5 w-3.5" /> Gérer Emplois
          </button>

          <button onClick={() => setAutoRefresh(!autoRefresh)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all shadow-sm ${autoRefresh ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
            <Radio className={`h-3.5 w-3.5 ${autoRefresh ? 'animate-pulse' : ''}`} /> {autoRefresh ? 'Auto ON' : 'Auto OFF'}
          </button>

          <button onClick={analyser} disabled={analyzing} className="inline-flex items-center gap-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 text-xs font-bold shadow-lg shadow-rose-500/20 active:scale-[0.98] disabled:opacity-60 transition-all">
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />} Analyser Conflits
          </button>
        </div>
      </header>

      {/* STATS CARDS (avec animation en cascade) */}
      <motion.div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }}>
        {[
          { label: 'Salles totales', value: salles.length, icon: Building2, grad: 'from-slate-600 to-slate-800 dark:from-slate-700 dark:to-slate-900' },
          { label: 'Occupées now', value: occupeesNow, icon: Users, grad: 'from-rose-500 to-red-600' },
          { label: 'Disponibles', value: salles.length - occupeesNow, icon: CheckCircle, grad: 'from-emerald-500 to-teal-600' },
          { label: 'Sessions jour', value: sessions.length, icon: GraduationCap, grad: 'from-sky-500 to-blue-600' },
          { label: 'Taux occupation', value: `${tauxOcc}%`, icon: TrendingUp, grad: 'from-violet-500 to-purple-600' },
          { label: 'Conflits actifs', value: conflicts, icon: AlertTriangle, grad: 'from-amber-500 to-orange-600' },
        ].map((k, i) => (
          <motion.div key={k.label} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="group relative p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all overflow-hidden">
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${k.grad}`} />
            <div className="flex items-center justify-between mt-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{k.label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">{k.value}</p>
              </div>
              <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${k.grad} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                <k.icon className="h-5 w-5" />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ALERTES CONFLITS */}
      {conflicts > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-5 w-5 text-rose-500" />
            <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">{conflicts} alerte(s) de conflit active(s)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {alertes.slice(0, 4).map(a => (
              <div key={a.id_alerte} className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/50 shadow-sm">
                <AlertTriangle className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{a.type.replace(/_/g, ' ')} {a.salle ? `· Salle ${a.salle.numero}` : ''}</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* FILTRES */}
      <div className="flex flex-col md:flex-row gap-3 p-1">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <Calendar className="h-4 w-4 text-slate-400" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent text-sm text-slate-800 dark:text-white focus:outline-none" />
        </div>
        <div className="relative flex-1 md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une salle..." className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm" />
        </div>
        <button onClick={load} className="p-2 text-slate-500 hover:bg-white dark:hover:bg-slate-900 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all shadow-sm">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LISTE DES SALLES */}
        <div className="card rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col max-h-[700px]">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Liste des salles</h3>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 tabular-nums">{filteredSalles.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 scrollbar-thin">
            {filteredSalles.map(s => {
              const { cur, next } = liveStatus(s.id_salle);
              const isSel = selectedSalle === s.id_salle;
              return (
                <button key={s.id_salle} onClick={() => setSelectedSalle(s.id_salle)} className={`w-full text-left p-4 transition-all duration-200 ${isSel ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2.5">
                      <span className={`h-2.5 w-2.5 rounded-full shadow-sm ${cur ? 'bg-rose-500 animate-pulse' : s.statut === 'Maintenance' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{s.numero}</p>
                      <span className="text-[10px] text-slate-500 font-medium">{s.capacite} pl.</span>
                    </div>
                    {cur ? (
                      <span className="text-[9px] font-bold uppercase px-2 py-1 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">Occupée</span>
                    ) : (
                      <span className="text-[9px] font-bold uppercase px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">Libre</span>
                    )}
                  </div>
                  {cur && (
                    <div className="mt-2 pl-5">
                      <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" /> {cur.professeur?.utilisateur?.prenom} {cur.professeur?.utilisateur?.nom}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Jusqu'à {fmtH(cur.heure_fin)}</p>
                    </div>
                  )}
                  {next && !cur && (
                    <p className="mt-1 pl-5 text-[10px] text-slate-500 truncate flex items-center gap-1">
                      <Clock className="h-3 w-3" /> À suivre : {fmtH(next.heure_debut)}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* DÉTAILS ET TIMELINE */}
        <div className="lg:col-span-2 space-y-6">
          {sel ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Salle {sel.numero}
                    <span className="text-xs font-normal px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">{sel.type.replace('_', ' ')}</span>
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">{sel.nom || 'Aucun nom spécifique'} · {sel.capacite} places</p>
                </div>
                {isToday && enCours ? (
                  <div className="text-right px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50">
                    <p className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 flex items-center justify-end gap-1"><span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" /> En cours</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">{enCours.cours?.nom}</p>
                    <p className="text-xs text-slate-500">Fin : {fmtH(enCours.heure_fin)}</p>
                  </div>
                ) : isToday && aSuivre ? (
                  <div className="text-right px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50">
                    <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">À suivre</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">{aSuivre.cours?.nom}</p>
                    <p className="text-xs text-slate-500">Début : {fmtH(aSuivre.heure_debut)}</p>
                  </div>
                ) : (
                  <div className="text-right px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Aucune session</p>
                  </div>
                )}
              </div>

              {/* TIMELINE MODERNE (Style Gantt) */}
              <div className="relative h-16 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 overflow-hidden mb-2">
                {/* Grille de fond professionnelle */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
                     style={{ backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px)', backgroundSize: '8.33% 100%' }}></div>
                
                {salleSessions.map(s => {
                  const sM = min(s.heure_debut), eM = min(s.heure_fin);
                  const isNow = isToday && sM <= nowMin && nowMin < eM;
                  const isPast = isToday && eM <= nowMin;
                  return (
                    <div key={s.id_session} title={`${s.cours?.nom} (${fmtH(s.heure_debut)} - ${fmtH(s.heure_fin)})`}
                      className={`absolute top-2 bottom-2 rounded-lg border transition-all duration-300 hover:z-20 hover:scale-[1.02] hover:shadow-lg ${isNow ? 'bg-rose-500 border-rose-400 shadow-md shadow-rose-500/20 z-10' : isPast ? 'bg-slate-300 dark:bg-slate-700 border-transparent opacity-60' : 'bg-indigo-500 border-indigo-400 shadow-sm'}`}
                      style={{ left: `${pct(sM)}%`, width: `${Math.max(3, pct(eM) - pct(sM))}%` }}>
                      {isNow && (
                        <div className="absolute inset-y-0 left-0 bg-white/20 rounded-l-lg" style={{ width: `${((nowMin - sM) / (eM - sM)) * 100}%` }} />
                      )}
                      <div className="absolute inset-0 flex items-center px-2">
                        <span className={`text-[10px] font-bold truncate ${isNow ? 'text-white' : 'text-white/90'}`}>
                          {s.cours?.nom}
                        </span>
                      </div>
                    </div>
                  );
                })}
                
                {/* Ligne de temps actuelle */}
                {isToday && (
                  <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 shadow-[0_0_8px_rgba(239,68,68,0.6)]" style={{ left: `${pct(nowMin)}%` }}>
                    <div className="absolute -top-1 -left-[3px] h-2 w-2 rounded-full bg-red-500" />
                  </div>
                )}
              </div>
              
              {/* Légende de la timeline */}
              <div className="flex justify-between text-[10px] font-medium text-slate-400 tabular-nums px-1 mb-6">
                <span>08:00</span><span>10:00</span><span>12:00</span><span>14:00</span><span>16:00</span><span>18:00</span><span>20:00</span>
              </div>

              {/* Liste détaillée des sessions */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Détail des sessions</h4>
                {salleSessions.map(s => {
                  const isNow = isToday && min(s.heure_debut) <= nowMin && nowMin < min(s.heure_fin);
                  const isPast = isToday && min(s.heure_fin) <= nowMin;
                  return (
                    <div key={s.id_session} className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${isNow ? 'border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-900/10' : isPast ? 'border-slate-100 dark:border-slate-800 opacity-60' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800'}`}>
                      <div className="w-28 text-xs font-mono font-bold text-slate-600 dark:text-slate-400 tabular-nums flex-shrink-0 text-center">
                        {fmtH(s.heure_debut)}<br/><span className="text-[10px] text-slate-400">à</span><br/>{fmtH(s.heure_fin)}
                      </div>
                      <div className={`h-10 w-1.5 rounded-full flex-shrink-0 ${isNow ? 'bg-rose-500' : isPast ? 'bg-slate-300' : 'bg-indigo-500'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{s.cours?.nom || 'Session sans nom'}</p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {s.professeur?.utilisateur?.prenom} {s.professeur?.utilisateur?.nom}
                          {s.filiere && <span className="mx-1">·</span>} {s.filiere?.nom}
                          {s.nombre_etudiants && <span className="mx-1">·</span>} {s.nombre_etudiants} étudiants
                        </p>
                      </div>
                      {isNow && <span className="text-[9px] font-bold uppercase px-2.5 py-1 rounded-full bg-rose-500 text-white shadow-sm shadow-rose-500/20">En cours</span>}
                    </div>
                  );
                })}
                {salleSessions.length === 0 && (
                  <div className="text-center py-10">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
                      <Calendar className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Aucune session planifiée pour cette salle aujourd'hui.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-10 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <Building2 className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">Sélectionnez une salle pour voir les détails</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE FUSION (Design amélioré) */}
      <AnimatePresence>
        {showMergeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl flex flex-col max-h-[90vh] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Combine className="h-5 w-5 text-indigo-500" /> Fusionner des salles
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Sélectionnez les doublons pour les regrouper. Les emplois du temps seront transférés automatiquement.</p>
                </div>
                <button onClick={() => setShowMergeModal(false)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"><X className="h-5 w-5" /></button>
              </div>

              <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                <div className="w-full md:w-1/2 p-5 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/30 dark:bg-slate-900/30">
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input type="text" placeholder="Rechercher (ex: Amphi)..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                    {filteredSalles.map(s => (
                      <label key={s.id_salle} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${mergeSelection.includes(s.id_salle) ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-sm' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                        <input type="checkbox" checked={mergeSelection.includes(s.id_salle)} onChange={() => toggleMergeSelection(s.id_salle)} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{s.numero}</p>
                          <p className="text-[10px] text-slate-500">{s.capacite} places · {s.type}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="w-full md:w-1/2 p-6 bg-white dark:bg-slate-900 overflow-y-auto">
                  {mergeSelection.length < 2 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-4">
                      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl"><Combine className="h-8 w-8 opacity-30" /></div>
                      <p className="text-sm font-medium">Sélectionnez au moins 2 salles<br/>pour activer la fusion.</p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                          Toutes les données des {mergeSelection.length} salles sélectionnées seront combinées dans la salle principale ci-dessous. Les autres seront supprimées définitivement.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Salle principale à conserver</label>
                        <select value={mergeTargetId} onChange={(e) => {
                            const t = salles.find(s => s.id_salle === e.target.value);
                            setMergeTargetId(t?.id_salle || '');
                            if(t) { setMergeName(t.numero); setMergeCapacite(t.capacite); setMergeType(t.type); }
                          }} className="w-full p-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                          {mergeSelection.map(id => {
                            const s = salles.find(x => x.id_salle === id);
                            return s ? <option key={id} value={id}>{s.numero}</option> : null;
                          })}
                        </select>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Nouvelles informations</h4>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Nom / Numéro final</label>
                          <input type="text" value={mergeName} onChange={e => setMergeName(e.target.value)} className="w-full p-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Capacité</label>
                            <input type="number" value={mergeCapacite} onChange={e => setMergeCapacite(parseInt(e.target.value) || 0)} className="w-full p-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Type</label>
                            <select value={mergeType} onChange={e => setMergeType(e.target.value)} className="w-full p-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                              <option value="Salle_Cours">Salle de cours</option>
                              <option value="Amphitheatre">Amphithéâtre</option>
                              <option value="Laboratoire">Laboratoire</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <button onClick={handleMerge} disabled={isMerging || !mergeTargetId || !mergeName} className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white p-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
                        {isMerging ? <Loader2 className="h-5 w-5 animate-spin" /> : <Combine className="h-5 w-5" />}
                        {isMerging ? 'Fusion en cours...' : 'Fusionner les salles'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOAST NOTIFICATIONS */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60 }}
            className={`fixed top-6 right-6 z-50 max-w-md flex items-start gap-3 rounded-xl shadow-2xl border p-4 backdrop-blur-md ${toast.type === 'success' ? 'bg-emerald-50/90 dark:bg-emerald-900/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' : 'bg-red-50/90 dark:bg-red-900/80 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'}`}>
            {toast.type === 'success' ? <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />}
            <p className="text-sm font-medium flex-1">{toast.msg}</p>
            <button onClick={() => setToast(null)} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"><X className="h-4 w-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}