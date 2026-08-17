import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Building2, Upload, ShieldAlert, CheckCircle, X, Clock, Calendar, Users,
  Loader2, RefreshCw, Search, GraduationCap, User, AlertTriangle, MapPin,
  FileText, Table as TableIcon, Radio, TrendingUp,
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
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-black border border-slate-700">
      <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative h-2 w-2 rounded-full bg-emerald-500" /></span>
      <span className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
        {now.toLocaleTimeString('fr-FR')}
      </span>
      <span className="text-[9px] uppercase font-bold text-slate-500">Live</span>
    </div>
  );
}

export default function GestionSallesIntelligente() {
  const [salles, setSalles] = useState<Salle[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [filieres, setFilieres] = useState<any[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSalle, setSelectedSalle] = useState('');
  const [search, setSearch] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [now, setNow] = useState(new Date());
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const nowMin = now.getHours() * 60 + now.getMinutes();

  useEffect(() => { const i = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(i); }, []);

  const load = useCallback(async () => {
    try {
      const [pl, al, fi] = await Promise.all([
        fetch(`${API}/salles/planning?date=${date}`).then(r => r.json()),
        fetch('http://localhost:3000/api/alertes').then(r => r.json()),
        fetch(`${API}/filieres`).then(r => r.json()),
      ]);
      if (pl.success) {
        setSalles(pl.data.salles || []); setSessions(pl.data.sessions || []); setReservations(pl.data.reservations || []);
        if (!selectedSalle && pl.data.salles?.length) setSelectedSalle(pl.data.salles[0].id_salle);
      }
      setAlertes((al.data || []).filter((a: Alerte) => a.statut !== 'Resolue' && a.statut !== 'Ignoree'));
      if (fi.success) setFilieres(fi.data || []);
    } catch { setToast({ type: 'error', msg: 'Erreur de chargement.' }); }
    setLoading(false);
  }, [date, selectedSalle]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!autoRefresh) return; const i = setInterval(load, 30000); return () => clearInterval(i); }, [autoRefresh, load]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 5000); return () => clearTimeout(t); }, [toast]);

  const addFiles = (list: FileList | null) => { if (list) setFiles((p) => [...p, ...Array.from(list)]); };

  const doImport = async () => {
    if (!files.length) return;
    setImporting(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));
      const r = await fetch(`${API}/salles/import-edt`, { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message);
      setToast({ type: 'success', msg: `${j.fichiers} fichier(s) traité(s) : ${j.sessions_creees} session(s) créée(s), ${j.ignorees} ignorée(s), ${j.conflits} conflit(s).` });
      setFiles([]); load();
    } catch (e) { setToast({ type: 'error', msg: e instanceof Error ? e.message : "Erreur d'import." }); }
    setImporting(false);
  };

  const analyser = async () => {
    setAnalyzing(true);
    try {
      const r = await fetch(`${API}/salles/analyser-conflits`, { method: 'POST' });
      const j = await r.json();
      setToast({ type: 'success', msg: `Analyse terminée : ${j.created} alerte(s).` });
      load();
    } catch { setToast({ type: 'error', msg: "Erreur d'analyse." }); }
    setAnalyzing(false);
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
    <div className="min-h-screen p-5 md:p-6 space-y-5">
      <header className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white shadow-md"><Building2 className="h-6 w-6" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Centre de contrôle des salles</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Suivi temps réel, emplois du temps et détection de conflits</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LiveClock />
          <button onClick={() => setAutoRefresh(!autoRefresh)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${autoRefresh ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
            <Radio className="h-3.5 w-3.5" /> {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button onClick={analyser} disabled={analyzing} className="inline-flex items-center gap-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 text-xs font-semibold shadow-md active:scale-[0.98] disabled:opacity-60">
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />} Analyser
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: 'Salles', value: salles.length, icon: Building2, grad: 'from-primary-500 to-indigo-600' },
          { label: 'Occupées now', value: occupeesNow, icon: Users, grad: 'from-rose-500 to-red-600' },
          { label: 'Libres', value: salles.length - occupeesNow, icon: CheckCircle, grad: 'from-emerald-500 to-teal-600' },
          { label: 'Sessions jour', value: sessions.length, icon: GraduationCap, grad: 'from-sky-500 to-blue-600' },
          { label: 'Occupation', value: `${tauxOcc}%`, icon: TrendingUp, grad: 'from-violet-500 to-purple-600' },
          { label: 'Conflits', value: conflicts, icon: AlertTriangle, grad: 'from-amber-500 to-orange-600' },
        ].map((k) => (
          <div key={k.label} className="card p-4 relative overflow-hidden">
            <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${k.grad}`} />
            <div className="flex items-center justify-between">
              <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{k.label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">{k.value}</p></div>
              <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${k.grad} text-white flex items-center justify-center shadow`}><k.icon className="h-4 w-4" /></div>
            </div>
          </div>
        ))}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        className={`card p-4 border-2 border-dashed transition-colors ${dragging ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-900/10' : 'border-slate-200 dark:border-slate-700'}`}>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/30"><Upload className="h-5 w-5 text-primary-600 dark:text-primary-400" /></div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-white">Importer des emplois du temps</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">PDF ou Excel (xlsx/xls/csv) · plusieurs fichiers acceptés · glisser-déposer supporté</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {files.length > 0 && (
              <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">{files.length} fichier(s)</span>
            )}
            <button onClick={() => fileRef.current?.click()} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> PDF
            </button>
            <button onClick={() => fileRef.current?.click()} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <TableIcon className="h-3.5 w-3.5" /> Excel
            </button>
            <input ref={fileRef} type="file" multiple accept=".pdf,.xlsx,.xls,.csv" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            <button onClick={doImport} disabled={!files.length || importing} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary-500 to-indigo-600 text-white px-4 py-2 text-xs font-semibold shadow-md disabled:opacity-50">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Importer
            </button>
            {files.length > 0 && <button onClick={() => setFiles([])} className="p-2 text-slate-400 hover:text-rose-500"><X className="h-4 w-4" /></button>}
          </div>
        </div>
      </div>

      {conflicts > 0 && (
        <div className="card p-4 border-l-4 border-l-rose-500">
          <div className="flex items-center gap-2 mb-3"><ShieldAlert className="h-5 w-5 text-rose-500" /><h3 className="text-sm font-bold text-slate-900 dark:text-white">{conflicts} alerte(s) active(s)</h3></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {alertes.slice(0, 4).map(a => (
              <div key={a.id_alerte} className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50/60 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900">
                <AlertTriangle className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-900 dark:text-white">{a.type.replace(/_/g, ' ')} {a.salle ? `· ${a.salle.numero}` : ''}</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">{a.description}</p></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-4 flex flex-col md:flex-row gap-3 items-center">
        <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-500" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white" /></div>
        <div className="relative flex-1 md:max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une salle..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white" /></div>
        <button onClick={load} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between"><h3 className="text-sm font-bold text-slate-900 dark:text-white">Salles</h3><span className="text-[10px] text-slate-500 tabular-nums">{filteredSalles.length}</span></div>
          <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {filteredSalles.map(s => {
              const { cur, next } = liveStatus(s.id_salle);
              const isSel = selectedSalle === s.id_salle;
              return (
                <button key={s.id_salle} onClick={() => setSelectedSalle(s.id_salle)} className={`w-full text-left p-3.5 transition-all ${isSel ? 'bg-primary-50/50 dark:bg-primary-900/10 border-l-4 border-l-primary-500' : 'border-l-4 border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${cur ? 'bg-rose-500 animate-pulse' : s.statut === 'Maintenance' ? 'bg-amber-500' : 'bg-emerald-500'}`} /><p className="text-sm font-bold text-slate-900 dark:text-white">{s.numero}</p><span className="text-[10px] text-slate-500">{s.capacite} pl.</span></div>
                    {cur ? <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">Occupée</span> : <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">Libre</span>}
                  </div>
                  {cur && <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300 truncate"><User className="inline h-3 w-3 mr-1" />{cur.professeur?.utilisateur?.prenom} {cur.professeur?.utilisateur?.nom} · jusqu'à {fmtH(cur.heure_fin)}</p>}
                  {next && <p className="mt-0.5 text-[10px] text-slate-500 truncate">À suivre : {next.cours?.nom} à {fmtH(next.heure_debut)}</p>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          {sel && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div><h3 className="text-base font-bold text-slate-900 dark:text-white">Salle {sel.numero}</h3><p className="text-xs text-slate-500 mt-0.5">{sel.nom} · {sel.capacite} places · {sel.type.replace('_', ' ')}</p></div>
                {isToday && enCours ? (
                  <div className="text-right"><p className="text-[10px] uppercase font-bold text-rose-500">En cours</p>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{enCours.cours?.nom} · fin {fmtH(enCours.heure_fin)}</p></div>
                ) : isToday && aSuivre ? (
                  <div className="text-right"><p className="text-[10px] uppercase font-bold text-emerald-500">À suivre</p>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{aSuivre.cours?.nom} · {fmtH(aSuivre.heure_debut)}</p></div>
                ) : null}
              </div>

              <div className="relative h-14 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden mb-1">
                {salleSessions.map(s => {
                  const sM = min(s.heure_debut), eM = min(s.heure_fin);
                  const isNow = isToday && sM <= nowMin && nowMin < eM;
                  const isPast = isToday && eM <= nowMin;
                  return (
                    <div key={s.id_session} title={`${s.cours?.nom} ${fmtH(s.heure_debut)}-${fmtH(s.heure_fin)}`}
                      className={`absolute top-1.5 bottom-1.5 rounded-md border transition-all ${isNow ? 'bg-rose-500 border-rose-400 shadow-lg' : isPast ? 'bg-slate-300 dark:bg-slate-600 border-transparent opacity-60' : 'bg-primary-500 border-primary-400'}`}
                      style={{ left: `${pct(sM)}%`, width: `${Math.max(2, pct(eM) - pct(sM))}%` }}>
                      {isNow && <div className="absolute inset-y-0 left-0 bg-white/30" style={{ width: `${((nowMin - sM) / (eM - sM)) * 100}%` }} />}
                    </div>
                  );
                })}
                {salleReservations.map(r => (
                  <div key={r.id_reservation} title={`Réservation ${r.motif}`} className="absolute top-1.5 bottom-1.5 rounded-md bg-amber-400 border border-amber-300 opacity-80" style={{ left: `${pct(min(r.heure_debut))}%`, width: `${Math.max(2, pct(min(r.heure_fin)) - pct(min(r.heure_debut)))}%` }} />
                ))}
                {isToday && <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: `${pct(nowMin)}%` }} />}
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 tabular-nums"><span>08:00</span><span>11:00</span><span>14:00</span><span>17:00</span><span>20:00</span></div>

              <div className="mt-4 space-y-1.5">
                {salleSessions.map(s => {
                  const isNow = isToday && min(s.heure_debut) <= nowMin && nowMin < min(s.heure_fin);
                  const isPast = isToday && min(s.heure_fin) <= nowMin;
                  return (
                    <div key={s.id_session} className={`flex items-center gap-3 p-3 rounded-lg border ${isNow ? 'border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-900/10' : isPast ? 'border-slate-100 dark:border-slate-800 opacity-50' : 'border-slate-200 dark:border-slate-800'}`}>
                      <div className="w-24 text-[11px] font-mono text-slate-500 tabular-nums flex-shrink-0">{fmtH(s.heure_debut)}–{fmtH(s.heure_fin)}</div>
                      <div className={`h-8 w-1 rounded-full ${isNow ? 'bg-rose-500' : isPast ? 'bg-slate-300' : 'bg-primary-500'}`} />
                      <div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-900 dark:text-white truncate">{s.cours?.nom}</p>
                        <p className="text-[10px] text-slate-500 truncate">{s.professeur?.utilisateur?.prenom} {s.professeur?.utilisateur?.nom}{s.filiere ? ` · ${s.filiere.nom}` : ''}{s.nombre_etudiants ? ` · ${s.nombre_etudiants} étud.` : ''}</p></div>
                      {isNow && <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-500 text-white">En cours</span>}
                    </div>
                  );
                })}
                {salleSessions.length === 0 && <p className="text-xs text-slate-400 text-center py-6">Aucune session planifiée ce jour</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60 }}
            className={`fixed top-4 right-4 z-50 max-w-md flex items-start gap-3 rounded-lg shadow-xl border p-3 ${toast.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'}`}>
            {toast.type === 'success' ? <CheckCircle className="h-4 w-4 mt-0.5" /> : <AlertTriangle className="h-4 w-4 mt-0.5" />}
            <p className="text-xs flex-1">{toast.msg}</p>
            <button onClick={() => setToast(null)}><X className="h-3.5 w-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}