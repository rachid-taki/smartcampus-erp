import { useState, useRef, useMemo, useEffect } from 'react';
import { Upload, FileText, Table as TableIcon, Loader2, CheckCircle, AlertTriangle, X, CalendarDays, ArrowLeft, BrainCircuit, Database, Eye, Search, Edit2, Trash2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:3000/api/emplois-ia';

interface ExtractedSession {
  _id: string; 
  coursNom: string;
  prof: string;
  salle: string;
  dateISO: string;
  debutMin: number;
  finMin: number;
}

// Interfaces pour la base de données (adaptez les noms des champs si nécessaire)
interface Semestre {
  id_semestre: string;
  nom_semestre: string;
}

interface AnneeUniversitaire {
  id_annee: string;
  annee: string;
  semestres: Semestre[];
}

const formatTime = (min: number) => {
  if (isNaN(min)) return '';
  const h = Math.floor(min / 60).toString().padStart(2, '0');
  const m = (min % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

const parseTime = (timeStr: string) => {
  const [h, m] = timeStr.split(':');
  return parseInt(h) * 60 + parseInt(m);
};

export default function GestionEmplois() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [step, setStep] = useState<'upload' | 'verify'>('upload');
  const [extractedData, setExtractedData] = useState<ExtractedSession[]>([]);
  
  // ✅ ÉTATS POUR LES PÉRIODES ACADÉMIQUES
  const [periodes, setPeriodes] = useState<AnneeUniversitaire[]>([]);
  const [anneeUniversitaire, setAnneeUniversitaire] = useState<string>('');
  const [semestre, setSemestre] = useState<string>('');

  const [filterText, setFilterText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ExtractedSession>>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string; details?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ✅ FETCH DES ANNÉES AU CHARGEMENT DE LA PAGE
  useEffect(() => {
    const fetchPeriodes = async () => {
      try {
        const res = await fetch(`${API}/periodes`);
        const json = await res.json();
        if (json.success && json.data) {
          setPeriodes(json.data);
          // Auto-sélectionner l'année la plus récente (qui est en premier grâce au tri SQL)
          if (json.data.length > 0) {
            setAnneeUniversitaire(json.data[0].id_annee);
          }
        }
      } catch (e) {
        console.error("Impossible de charger les périodes académiques", e);
      }
    };
    fetchPeriodes();
  }, []);

  // ✅ TROUVER LES SEMESTRES DE L'ANNÉE SÉLECTIONNÉE
  const semestresDisponibles = useMemo(() => {
    const anneeSelectionnee = periodes.find(p => p.id_annee === anneeUniversitaire);
    return anneeSelectionnee?.semestres || [];
  }, [anneeUniversitaire, periodes]);


  const addFiles = (list: FileList | null) => { 
    if (list && list.length > 0) {
      // On extrait les fichiers en tableau fixe AVANT que React ne mette à jour le state
      const filesArray = Array.from(list);
      setFiles((p) => [...p, ...filesArray]); 
    }
  };

  const doExtract = async () => {
    if (!files.length) return;
    setLoading(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));
      const r = await fetch(`${API}/extract-edt`, { method: 'POST', body: fd });
      const j = await r.json();
      
      if (!r.ok) throw new Error(j.message);
      
      const dataWithIds = j.data.map((item: any) => ({ ...item, _id: Math.random().toString(36).substring(2, 9) }));
      setExtractedData(dataWithIds);
      setStep('verify');
      setToast({ type: 'success', msg: `Lecture terminée : ${dataWithIds.length} sessions détectées.` });
    } catch (e) { 
      setToast({ type: 'error', msg: e instanceof Error ? e.message : "Erreur lors de la lecture du fichier." }); 
    }
    setLoading(false);
  };

  const doConfirm = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/confirm-edt`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessions: extractedData,
          anneeUniversitaire: anneeUniversitaire,
          semestre: semestre
        }) 
      });
      const j = await r.json();
      
      if (!r.ok) throw new Error(j.message);
      
      setToast({ type: 'success', msg: `Sauvegarde réussie !`, details: j.details });
      setFiles([]);
      setExtractedData([]);
      setFilterText('');
      setStep('upload');
    } catch (e) { 
      setToast({ type: 'error', msg: e instanceof Error ? e.message : "Erreur lors de l'enregistrement." }); 
    }
    setLoading(false);
  };

  const startEdit = (row: ExtractedSession) => { setEditingId(row._id); setEditForm({ ...row }); };
  const saveEdit = () => { setExtractedData(prev => prev.map(item => item._id === editingId ? { ...item, ...editForm } as ExtractedSession : item)); setEditingId(null); };
  const deleteRow = (id: string) => { setExtractedData(prev => prev.filter(item => item._id !== id)); };

  const filteredData = useMemo(() => {
    if (!filterText) return extractedData;
    const lowerFilter = filterText.toLowerCase();
    return extractedData.filter(row => 
      row.coursNom?.toLowerCase().includes(lowerFilter) ||
      row.prof?.toLowerCase().includes(lowerFilter) ||
      row.salle?.toLowerCase().includes(lowerFilter) ||
      row.dateISO?.includes(lowerFilter)
    );
  }, [extractedData, filterText]);

  return (
    <div className="min-h-screen p-5 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="mb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour au tableau de bord
        </button>
      </div>

      <header className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md"><CalendarDays className="h-7 w-7" /></div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Assistant d'Importation IA</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Processus sécurisé de génération d'emplois du temps.</p>
        </div>
      </header>

      {/* SCHÉMA DU PROCESSUS (Style original conservé) */}
      <div className="flex items-center justify-between mb-8 max-w-3xl mx-auto relative px-4">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 dark:bg-slate-700 -z-10 rounded-full"></div>
        <div className="flex flex-col items-center gap-2 bg-slate-50 dark:bg-slate-900 px-2">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full border-4 shadow-sm ${step === 'upload' ? 'border-indigo-500 bg-white dark:bg-slate-800 text-indigo-600' : 'border-emerald-500 bg-emerald-500 text-white'}`}>
            {step === 'upload' ? <Upload className="h-4 w-4" /> : <CheckCircle className="h-5 w-5" />}
          </div>
          <p className={`text-xs font-bold ${step === 'upload' ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600'}`}>1. Importation</p>
        </div>
        <div className="flex flex-col items-center gap-2 bg-slate-50 dark:bg-slate-900 px-2">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full border-4 shadow-sm ${step === 'verify' ? 'border-indigo-500 bg-white dark:bg-slate-800 text-indigo-600' : step === 'upload' ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400' : 'border-emerald-500 bg-emerald-500 text-white'}`}>
            <Eye className="h-4 w-4" />
          </div>
          <p className={`text-xs font-bold ${step === 'verify' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>2. Vérification IA</p>
        </div>
        <div className="flex flex-col items-center gap-2 bg-slate-50 dark:bg-slate-900 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-4 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 shadow-sm">
            <Database className="h-4 w-4" />
          </div>
          <p className="text-xs font-bold text-slate-500">3. Sauvegarde</p>
        </div>
      </div>

      {step === 'upload' && (
         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
         <div
           onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
           onDragLeave={() => setDragging(false)}
           onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
           className={`card p-8 border-2 border-dashed rounded-2xl transition-all duration-200 ${dragging ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 scale-[1.01]' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50'}`}>
           
           <div className="flex flex-col items-center text-center gap-4">
             <div className={`flex h-16 w-16 items-center justify-center rounded-full ${loading ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
               {loading ? <BrainCircuit className="h-8 w-8 text-indigo-600 animate-pulse" /> : <Upload className="h-8 w-8 text-slate-500 dark:text-slate-400" />}
             </div>
             <div>
               <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                 {loading ? "Lecture du document par l'IA..." : "Glissez vos emplois du temps ici"}
               </h3>
               <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                 Formats supportés : PDF, XLSX, CSV.
               </p>
             </div>
             <div className="flex flex-wrap justify-center items-center gap-3 mt-4">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={loading} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
                  <FileText className="h-4 w-4 text-rose-500" /> Ajouter PDF
                </button>
                
                <button type="button" onClick={() => fileRef.current?.click()} disabled={loading} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
                  <TableIcon className="h-4 w-4 text-emerald-500" /> Ajouter Excel
                </button>
                
                <input 
                  ref={fileRef} 
                  type="file" 
                  multiple 
                  accept=".pdf,.xlsx,.xls,.csv" 
                  hidden 
                  onChange={(e) => { 
                    addFiles(e.target.files); 
                    e.target.value = ''; // On vide l'input pour pouvoir resélectionner le même fichier plus tard
                  }} 
                />
              </div>
           </div>

           {files.length > 0 && (
             <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
               <div className="flex items-center justify-between mb-4">
                 <h4 className="text-sm font-bold text-slate-900 dark:text-white">Fichiers sélectionnés ({files.length})</h4>
                 <button onClick={() => setFiles([])} disabled={loading} className="text-xs text-rose-500 font-semibold hover:underline">Tout effacer</button>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                 {files.map((f, i) => (
                   <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                     {f.name.endsWith('.pdf') ? <FileText className="h-5 w-5 text-rose-500" /> : <TableIcon className="h-5 w-5 text-emerald-500" />}
                     <div className="min-w-0 flex-1">
                       <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{f.name}</p>
                       <p className="text-[10px] text-slate-500">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                     </div>
                     <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} disabled={loading} className="p-1 text-slate-400 hover:text-rose-500">
                       <X className="h-4 w-4" />
                     </button>
                   </div>
                 ))}
               </div>
               <div className="mt-6 flex justify-end">
                 <button onClick={doExtract} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 text-sm font-bold shadow-lg hover:shadow-indigo-500/50 transition-all disabled:opacity-70">
                   {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <BrainCircuit className="h-5 w-5" />}
                   {loading ? 'Extraction en cours...' : '1. Lancer l\'extraction'}
                 </button>
               </div>
             </div>
           )}
         </div>
       </motion.div>
      )}

      {step === 'verify' && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="card p-6 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Vérification et Assignation</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Vérifiez les données et assignez l'emploi du temps à une période.</p>
            </div>
            <button onClick={() => { setStep('upload'); setExtractedData([]); setFiles([]); }} className="text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white px-3 py-2">
              Annuler
            </button>
          </div>

          {/* ✅ SÉLECTION DE LA PÉRIODE (CHARGÉE DEPUIS LA DB) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Année Universitaire <span className="text-rose-500">*</span></label>
              <select 
                value={anneeUniversitaire} 
                onChange={e => {
                  setAnneeUniversitaire(e.target.value);
                  setSemestre(''); // On réinitialise le semestre quand l'année change
                }} 
                className="w-full p-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">-- Sélectionner l'année --</option>
                {periodes.map((p) => (
                  <option key={p.id_annee} value={p.id_annee}>{p.annee}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Semestre <span className="text-rose-500">*</span></label>
              <select 
                value={semestre} 
                onChange={e => setSemestre(e.target.value)} 
                disabled={!anneeUniversitaire || semestresDisponibles.length === 0}
                className="w-full p-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800">
                <option value="">-- Sélectionner le semestre --</option>
                {semestresDisponibles.map((s) => (
                  <option key={s.id_semestre} value={s.id_semestre}>{s.nom_semestre}</option>
                ))}
              </select>
              {anneeUniversitaire && semestresDisponibles.length === 0 && (
                <p className="text-xs text-rose-500 mt-1">Aucun semestre trouvé pour cette année en base.</p>
              )}
            </div>
          </div>

          <div className="mb-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Filtrer (Matière, Prof, Salle...)" value={filterText} onChange={(e) => setFilterText(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/50 scrollbar-thin">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Date</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Début</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Fin</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Matière</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Professeur</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Salle</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredData.map((row) => (
                  <tr key={row._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    {editingId === row._id ? (
                      <>
                        <td className="px-2 py-2"><input type="date" value={editForm.dateISO || ''} onChange={e => setEditForm({...editForm, dateISO: e.target.value})} className="w-full px-2 py-1 rounded bg-white dark:bg-slate-900 border dark:border-slate-600 text-xs" /></td>
                        <td className="px-2 py-2"><input type="time" value={formatTime(editForm.debutMin || 0)} onChange={e => setEditForm({...editForm, debutMin: parseTime(e.target.value)})} className="w-24 px-2 py-1 rounded bg-white dark:bg-slate-900 border dark:border-slate-600 text-xs" /></td>
                        <td className="px-2 py-2"><input type="time" value={formatTime(editForm.finMin || 0)} onChange={e => setEditForm({...editForm, finMin: parseTime(e.target.value)})} className="w-24 px-2 py-1 rounded bg-white dark:bg-slate-900 border dark:border-slate-600 text-xs" /></td>
                        <td className="px-2 py-2"><input type="text" value={editForm.coursNom || ''} onChange={e => setEditForm({...editForm, coursNom: e.target.value})} className="w-full min-w-[150px] px-2 py-1 rounded bg-white dark:bg-slate-900 border dark:border-slate-600 text-xs" /></td>
                        <td className="px-2 py-2"><input type="text" value={editForm.prof || ''} onChange={e => setEditForm({...editForm, prof: e.target.value})} className="w-full min-w-[120px] px-2 py-1 rounded bg-white dark:bg-slate-900 border dark:border-slate-600 text-xs" /></td>
                        <td className="px-2 py-2"><input type="text" value={editForm.salle || ''} onChange={e => setEditForm({...editForm, salle: e.target.value})} className="w-24 px-2 py-1 rounded bg-white dark:bg-slate-900 border dark:border-slate-600 text-xs" /></td>
                        <td className="px-4 py-2 text-center flex items-center justify-center gap-2">
                          <button onClick={saveEdit} className="p-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 rounded hover:bg-emerald-100"><Save className="h-4 w-4" /></button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-500 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200"><X className="h-4 w-4" /></button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-mono text-xs dark:text-slate-300">{row.dateISO}</td>
                        <td className="px-4 py-3 text-xs dark:text-slate-300">{formatTime(row.debutMin)}</td>
                        <td className="px-4 py-3 text-xs dark:text-slate-300">{formatTime(row.finMin)}</td>
                        <td className="px-4 py-3 font-medium dark:text-white truncate max-w-[200px]" title={row.coursNom}>{row.coursNom}</td>
                        <td className="px-4 py-3 dark:text-slate-300">{row.prof}</td>
                        <td className="px-4 py-3"><span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 dark:text-white rounded text-xs">{row.salle}</span></td>
                        <td className="px-4 py-3 text-center flex items-center justify-center gap-1.5">
                          <button onClick={() => startEdit(row)} title="Modifier" className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"><Edit2 className="h-4 w-4" /></button>
                          <button onClick={() => deleteRow(row._id)} title="Supprimer" className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded transition-colors"><Trash2 className="h-4 w-4" /></button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ✅ BOUTON D'ANNULATION AJOUTÉ ICI */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium px-4 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
              <AlertTriangle className="h-4 w-4 inline mr-2 -mt-0.5" />
              Vérifiez bien l'année et le semestre avant de sauvegarder.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {/* NOUVEAU BOUTON : Annuler l'opération */}
              <button 
                onClick={() => {
                  setExtractedData([]);
                  setFiles([]);
                  setStep('upload');
                  setFilterText('');
                  setToast({ type: 'success', msg: 'Importation annulée. Vous pouvez recommencer.' });
                }} 
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-6 py-3 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                <X className="h-5 w-5" />
                Annuler l'opération
              </button>

              <button 
                onClick={doConfirm} 
                disabled={loading || extractedData.length === 0 || !anneeUniversitaire || !semestre} 
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 text-sm font-bold shadow-lg hover:shadow-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Database className="h-5 w-5" />}
                {loading ? 'Sauvegarde en cours...' : '2. Confirmer et Sauvegarder'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl border shadow-xl max-w-sm w-full ${toast.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'}`}>
            <div className="flex items-start gap-3">
              {toast.type === 'success' ? <CheckCircle className="h-6 w-6 flex-shrink-0" /> : <AlertTriangle className="h-6 w-6 flex-shrink-0" />}
              <div className="flex-1">
                <h4 className="text-sm font-bold">{toast.msg}</h4>
                {toast.details && <p className="text-xs mt-1.5 opacity-90 leading-relaxed">{toast.details}</p>}
              </div>
              <button onClick={() => setToast(null)} className="flex-shrink-0 opacity-70 hover:opacity-100"><X className="h-5 w-5" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}