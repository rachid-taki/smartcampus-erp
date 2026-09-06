import { useState, useRef, useMemo, useEffect } from 'react';
import { Upload, FileText, Table as TableIcon, Loader2, CheckCircle, AlertTriangle, X, CalendarDays, ArrowLeft, BrainCircuit, Database, Eye, Search, Edit2, Trash2, Save, Info } from 'lucide-react';
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
  id_filiere: string;
  sourceFile: string;
}

interface Semestre {
  id_semestre: string;
  nom_semestre: string;
  date_debut?: string;
  date_fin?: string;
}

interface AnneeUniversitaire {
  id_annee: string;
  annee: string;
  semestres: Semestre[];
}

interface Filiere {
  id_filiere: string;
  nom: string;
  code: string;
  _count?: { sessions: number };
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
  
  const [step, setStep] = useState<'upload' | 'verify'>('upload');
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [periodes, setPeriodes] = useState<AnneeUniversitaire[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  
  const [anneeUniversitaire, setAnneeUniversitaire] = useState<string>('');
  const [semestre, setSemestre] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [idFiliere, setIdFiliere] = useState<string>('');
  const [aiModel, setAiModel] = useState<string>('auto');
  
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [extractedData, setExtractedData] = useState<ExtractedSession[]>([]);
  const [filterText, setFilterText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ExtractedSession>>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; msg: string; details?: string } | null>(null);

  useEffect(() => {
    const fetchPeriodes = async () => {
      try {
        const res = await fetch(`${API}/periodes`);
        const json = await res.json();
        if (json.success && json.data) {
          setPeriodes(json.data);
          if (json.data.length > 0) setAnneeUniversitaire(json.data[0].id_annee);
        }
      } catch (e) {
        console.error("Impossible de charger les périodes", e);
      }
    };
    const fetchFilieres = async () => {
      try {
        // ✅ CORRECTION: On utilise la route IA pour garantir le _count des sessions
        const res = await fetch(`${API}/filieres`);
        const json = await res.json();
        if (json.success && json.data) setFilieres(json.data);
      } catch (e) {
        console.error("Impossible de charger les filières", e);
      }
    };

    fetchPeriodes();
    fetchFilieres();
  }, []);

  useEffect(() => {
    const savedState = localStorage.getItem('scolarite_pending_edt');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.step === 'verify' && parsed.extractedData?.length > 0) {
          setExtractedData(parsed.extractedData);
          setAnneeUniversitaire(parsed.anneeUniversitaire || '');
          setSemestre(parsed.semestre || '');
          setIdFiliere(parsed.idFiliere || '');
          setStartDate(parsed.startDate || '');
          setEndDate(parsed.endDate || '');
          setStep('verify');
          setToast({ type: 'info', msg: 'Restauration de votre session de vérification.' });
        }
      } catch (e) {
        localStorage.removeItem('scolarite_pending_edt');
      }
    }
  }, []);

  useEffect(() => {
    if (step === 'verify' && extractedData.length > 0) {
      localStorage.setItem('scolarite_pending_edt', JSON.stringify({
        extractedData,
        anneeUniversitaire,
        semestre,
        idFiliere,
        startDate,
        endDate,
        step: 'verify'
      }));
    } else if (step === 'upload') {
      localStorage.removeItem('scolarite_pending_edt');
    }
  }, [extractedData, anneeUniversitaire, semestre, idFiliere, startDate, endDate, step]);

  const semestresDisponibles = useMemo(() => {
    const anneeSelectionnee = periodes.find(p => p.id_annee === anneeUniversitaire);
    return anneeSelectionnee?.semestres || [];
  }, [anneeUniversitaire, periodes]);

  const handleSemestreChange = (semId: string) => {
    setSemestre(semId);
    const annee = periodes.find(p => p.id_annee === anneeUniversitaire);
    const sem = annee?.semestres.find(s => s.id_semestre === semId);
    if (sem) {
      if (sem.date_debut) setStartDate(sem.date_debut.split('T')[0]);
      if (sem.date_fin) setEndDate(sem.date_fin.split('T')[0]);
    }
  };

  const handleFileChange = (list: FileList | null) => {
    if (list && list.length > 0) {
      setFile(list[0]);
    }
  };

  const cancelExtraction = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const doExtract = async () => {
    localStorage.removeItem('scolarite_pending_edt');

    if (!file) {
      setToast({ type: 'error', msg: "Veuillez sélectionner ou glisser un fichier." });
      return;
    }
    if (!anneeUniversitaire || !semestre || !startDate || !endDate || !idFiliere) {
      setToast({ type: 'error', msg: "Veuillez configurer tous les paramètres (Année, Semestre, Dates et Filière) avant l'extraction." });
      return;
    }
    if (startDate > endDate) {
      setToast({ type: 'error', msg: "La date de début doit être antérieure à la date de fin." });
      return;
    }

    setLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const fd = new FormData();
      fd.append('filiereId', idFiliere);
      fd.append('modelName', aiModel);
      fd.append('startDate', startDate);
      fd.append('endDate', endDate);
      fd.append('files', file);

      const r = await fetch(`${API}/extract-edt`, { 
        method: 'POST', 
        body: fd,
        signal: abortControllerRef.current.signal
      });
      const j = await r.json();
      
      if (!r.ok) throw new Error(j.message);
      
      const dataWithIds = j.data.map((item: any, idx: number) => ({ 
        ...item, 
        _id: crypto.randomUUID ? crypto.randomUUID() : `session-${idx}-${Math.random().toString(36).substring(2, 9)}` 
      }));
      
      setExtractedData(dataWithIds);
      setStep('verify');
      setToast({ type: 'success', msg: `Lecture terminée : L'IA a renvoyé des sessions. Révisez-les avant de sauvegarder.` });
    } catch (e: any) { 
      if (e.name === 'AbortError') {
        setToast({ type: 'info', msg: "L'extraction a été annulée par l'utilisateur." });
      } else {
        setToast({ type: 'error', msg: e.message || "Erreur lors de la lecture du fichier." }); 
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  // ✅ FILTRAGE DES DONNEES : Ce tableau ne contient QUE les sessions comprises dans les dates validées
  const filteredData = useMemo(() => {
    let data = extractedData;

    if (startDate && endDate) {
      data = data.filter(row => row.dateISO >= startDate && row.dateISO <= endDate);
    }

    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      data = data.filter(row => 
        row.coursNom?.toLowerCase().includes(lowerFilter) ||
        row.prof?.toLowerCase().includes(lowerFilter) ||
        row.salle?.toLowerCase().includes(lowerFilter) ||
        row.dateISO?.includes(lowerFilter)
      );
    }
    return data;
  }, [extractedData, filterText, startDate, endDate]);

  const doConfirm = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/confirm-edt`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessions: filteredData, // Seules les sessions affichées à l'écran partent en base
          anneeUniversitaire: anneeUniversitaire,
          semestre: semestre,
          startDate: startDate,
          endDate: endDate
        }) 
      });
      const j = await r.json();
      
      if (!r.ok) throw new Error(j.message);
      
      setToast({ type: 'success', msg: `Sauvegarde réussie !`, details: j.details });
      setFile(null);
      setExtractedData([]);
      setFilterText('');
      setStep('upload');
      
      // ✅ Mise à jour automatique des compteurs
      const res = await fetch(`${API}/filieres`);
      const json = await res.json();
      if (json.success && json.data) setFilieres(json.data);

      localStorage.removeItem('scolarite_pending_edt');
    } catch (e) { 
      setToast({ type: 'error', msg: e instanceof Error ? e.message : "Erreur lors de l'enregistrement." }); 
    }
    setLoading(false);
  };

  const startEdit = (row: ExtractedSession) => { setEditingId(row._id); setEditForm({ ...row }); };
  const saveEdit = () => { 
    setExtractedData(prev => prev.map(item => item._id === editingId ? { ...item, ...editForm } as ExtractedSession : item)); 
    setEditingId(null); 
  };
  const deleteRow = (id: string) => { setExtractedData(prev => prev.filter(item => item._id !== id)); };

  const selectedFiliereName = useMemo(() => {
    const f = filieres.find(f => f.id_filiere === idFiliere);
    return f ? `${f.nom} ${f.code ? `(${f.code})` : ''}` : 'Filière inconnue';
  }, [filieres, idFiliere]);

  return (
    <div className="min-h-screen p-5 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="mb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-bold text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour au tableau de bord
        </button>
      </div>

      <header className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md"><CalendarDays className="h-7 w-7" /></div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Assistant d'Importation IA</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-300">Processus sécurisé de génération d'emplois du temps (Mode 1 Filière).</p>
        </div>
      </header>

      {/* SCHÉMA DU PROCESSUS */}
      <div className="flex items-center justify-between mb-8 max-w-3xl mx-auto relative px-4">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 dark:bg-slate-700 -z-10 rounded-full"></div>
        <div className="flex flex-col items-center gap-2 bg-slate-50 dark:bg-slate-900 px-2">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full border-4 shadow-sm ${step === 'upload' ? 'border-indigo-500 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'border-emerald-500 bg-emerald-500 text-white'}`}>
            {step === 'upload' ? <Upload className="h-4 w-4" /> : <CheckCircle className="h-5 w-5" />}
          </div>
          <p className={`text-xs font-bold ${step === 'upload' ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}`}>1. Importation</p>
        </div>
        <div className="flex flex-col items-center gap-2 bg-slate-50 dark:bg-slate-900 px-2">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full border-4 shadow-sm ${step === 'verify' ? 'border-indigo-500 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : step === 'upload' ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500' : 'border-emerald-500 bg-emerald-500 text-white'}`}>
            <Eye className="h-4 w-4" />
          </div>
          <p className={`text-xs font-bold ${step === 'verify' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>2. Vérification IA</p>
        </div>
        <div className="flex flex-col items-center gap-2 bg-slate-50 dark:bg-slate-900 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-4 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 shadow-sm">
            <Database className="h-4 w-4" />
          </div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">3. Sauvegarde</p>
        </div>
      </div>

      {step === 'upload' && (
         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          <div className="card p-6 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs">1</span>
              Paramètres de l'Emploi du Temps
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Année Universitaire <span className="text-rose-500">*</span></label>
                <select 
                  value={anneeUniversitaire} 
                  onChange={e => { setAnneeUniversitaire(e.target.value); setSemestre(''); setStartDate(''); setEndDate(''); }} 
                  disabled={loading}
                  className="w-full p-2.5 text-sm font-bold rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
                  <option value="">-- Sélectionner --</option>
                  {periodes.map(p => <option key={p.id_annee} value={p.id_annee}>{p.annee}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Semestre Cible <span className="text-rose-500">*</span></label>
                <select 
                  value={semestre} 
                  onChange={e => handleSemestreChange(e.target.value)} 
                  disabled={!anneeUniversitaire || loading}
                  className="w-full p-2.5 text-sm font-bold rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
                  <option value="">-- Sélectionner --</option>
                  {semestresDisponibles.map(s => <option key={s.id_semestre} value={s.id_semestre}>{s.nom_semestre}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                  <span>Date de début des cours <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">Générée par le semestre</span>
                </label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  disabled={loading || !semestre}
                  className="w-full p-2.5 text-sm font-bold rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Date de fin du semestre <span className="text-rose-500">*</span></label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  disabled={loading || !semestre}
                  className="w-full p-2.5 text-sm font-bold rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Filière Assignée au Fichier <span className="text-rose-500">*</span></label>
                <select 
                  value={idFiliere} 
                  onChange={e => setIdFiliere(e.target.value)} 
                  disabled={loading}
                  className="w-full p-2.5 text-sm font-bold rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
                  <option value="">-- Sélectionner la filière --</option>
                  {filieres.map(f => (
                    <option key={f.id_filiere} value={f.id_filiere}>
                      {f.nom} {f.code ? `(${f.code})` : ''} — {f._count?.sessions || 0} sessions existantes
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-indigo-500" /> Modèle IA
                </label>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  disabled={loading}
                  className="w-full p-2.5 text-sm font-bold rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="auto">🌟 Sélectionne Automatique (Recommandé)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Très rapide)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Précision pour tableaux complexes)</option>
                  <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash-8B</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card p-6 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shadow-sm relative overflow-hidden">
            
            {(!anneeUniversitaire || !semestre || !startDate || !endDate || !idFiliere) && !loading && (
              <div className="absolute inset-0 z-10 bg-slate-50/70 dark:bg-slate-900/70 backdrop-blur-[2px] flex items-center justify-center">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl flex items-center gap-3 max-w-sm text-center">
                  <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 text-left">
                    Veuillez configurer tous les paramètres ci-dessus (Étape 1) pour débloquer l'importation.
                  </p>
                </div>
              </div>
            )}

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs">2</span>
              Importation du Document
            </h3>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); handleFileChange(e.dataTransfer.files); }}
              className={`p-8 border-2 border-dashed rounded-2xl transition-all duration-200 ${dragging ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 scale-[1.01]' : file ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/10' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50'}`}>
              
              <div className="flex flex-col items-center text-center gap-4">
                
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40">
                      <BrainCircuit className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Analyse et extraction en cours...</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-300">Cela peut prendre jusqu'à une minute selon la taille du fichier.</p>
                    <button 
                      onClick={cancelExtraction}
                      className="mt-4 px-5 py-2 rounded-lg border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors shadow-sm"
                    >
                      Annuler l'extraction
                    </button>
                  </div>
                ) : file ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                      {file.name.endsWith('.pdf') ? <FileText className="h-8 w-8 text-emerald-600 dark:text-emerald-400" /> : <TableIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{file.name}</h3>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB — Prêt pour l'extraction</p>
                    </div>
                    <button onClick={() => setFile(null)} className="text-xs text-rose-500 font-bold hover:underline mt-2">
                      Retirer ce fichier
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                      <Upload className="h-8 w-8 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Glissez votre emploi du temps ici</h3>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-300 mt-1 max-w-md mx-auto">
                        1 seul fichier à la fois (PDF ou Excel)
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center items-center gap-3 mt-4">
                      <button type="button" onClick={() => fileRef.current?.click()} className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
                        Parcourir les fichiers
                      </button>
                      <input 
                        ref={fileRef} 
                        type="file" 
                        accept=".pdf,.xlsx,.xls,.csv" 
                        hidden 
                        onChange={(e) => { handleFileChange(e.target.files); e.target.value = ''; }} 
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={doExtract} 
                disabled={loading || !file || !anneeUniversitaire || !semestre || !startDate || !endDate || !idFiliere} 
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3.5 text-sm font-bold shadow-lg hover:shadow-indigo-500/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <BrainCircuit className="h-5 w-5" />}
                {loading ? 'Extraction et génération en cours...' : 'Lancer l\'extraction de cet emploi'}
              </button>
            </div>
          </div>
         </motion.div>
      )}

      {step === 'verify' && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="card p-0 overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Vérification de l'Emploi du Temps</h3>
                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1">{selectedFiliereName}</p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                  Affichage des <span className="font-bold text-slate-800 dark:text-slate-200">{filteredData.length} sessions</span> valides du {startDate} au {endDate}.
                </p>
              </div>
              <button onClick={() => { 
                  if (window.confirm("Êtes-vous sûr de vouloir annuler cette vérification ? L'extraction sera perdue.")) {
                    setStep('upload'); setExtractedData([]); setFile(null); localStorage.removeItem('scolarite_pending_edt');
                  }
                }} 
                className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 px-3 py-2 transition-colors border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20">
                Annuler et jeter ce résultat
              </button>
            </div>
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-900">
            <div className="mb-4">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Filtrer (Matière, prof, salle)..." value={filterText} onChange={(e) => setFilterText(e.target.value)} className="w-full pl-9 pr-3 py-2.5 text-sm font-bold rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/50 scrollbar-thin shadow-sm">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 shadow-sm border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3.5 font-bold text-slate-700 dark:text-slate-200">Date</th>
                    <th className="px-4 py-3.5 font-bold text-slate-700 dark:text-slate-200">Début</th>
                    <th className="px-4 py-3.5 font-bold text-slate-700 dark:text-slate-200">Fin</th>
                    <th className="px-4 py-3.5 font-bold text-slate-700 dark:text-slate-200">Matière</th>
                    <th className="px-4 py-3.5 font-bold text-slate-700 dark:text-slate-200">Professeur</th>
                    <th className="px-4 py-3.5 font-bold text-slate-700 dark:text-slate-200">Salle</th>
                    <th className="px-4 py-3.5 font-bold text-slate-700 dark:text-slate-200 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/80">
                  {filteredData.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      {editingId === row._id ? (
                        <>
                          <td className="px-2 py-2">
                            <input 
                              type="date" 
                              min={startDate}
                              max={endDate}
                              value={editForm.dateISO || ''} 
                              onChange={e => setEditForm({...editForm, dateISO: e.target.value})} 
                              className="w-full px-2 py-1.5 rounded bg-white dark:bg-slate-900 border dark:border-slate-600 text-slate-900 dark:text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500" 
                            />
                          </td>
                          <td className="px-2 py-2"><input type="time" value={formatTime(editForm.debutMin || 0)} onChange={e => setEditForm({...editForm, debutMin: parseTime(e.target.value)})} className="w-24 px-2 py-1.5 rounded bg-white dark:bg-slate-900 border dark:border-slate-600 text-slate-900 dark:text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500" /></td>
                          <td className="px-2 py-2"><input type="time" value={formatTime(editForm.finMin || 0)} onChange={e => setEditForm({...editForm, finMin: parseTime(e.target.value)})} className="w-24 px-2 py-1.5 rounded bg-white dark:bg-slate-900 border dark:border-slate-600 text-slate-900 dark:text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500" /></td>
                          <td className="px-2 py-2"><input type="text" value={editForm.coursNom || ''} onChange={e => setEditForm({...editForm, coursNom: e.target.value})} className="w-full min-w-[150px] px-2 py-1.5 rounded bg-white dark:bg-slate-900 border dark:border-slate-600 text-slate-900 dark:text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500" /></td>
                          <td className="px-2 py-2"><input type="text" value={editForm.prof || ''} onChange={e => setEditForm({...editForm, prof: e.target.value})} className="w-full min-w-[120px] px-2 py-1.5 rounded bg-white dark:bg-slate-900 border dark:border-slate-600 text-slate-900 dark:text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500" /></td>
                          <td className="px-2 py-2"><input type="text" value={editForm.salle || ''} onChange={e => setEditForm({...editForm, salle: e.target.value})} className="w-24 px-2 py-1.5 rounded bg-white dark:bg-slate-900 border dark:border-slate-600 text-slate-900 dark:text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500" /></td>
                          <td className="px-4 py-2 text-center flex items-center justify-center gap-2">
                            <button onClick={saveEdit} className="p-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 rounded hover:bg-emerald-100 dark:hover:bg-emerald-800/40"><Save className="h-4 w-4" /></button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700"><X className="h-4 w-4" /></button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{row.dateISO}</td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-200">{formatTime(row.debutMin)}</td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-200">{formatTime(row.finMin)}</td>
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white truncate max-w-[220px]" title={row.coursNom}>{row.coursNom}</td>
                          <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-300">{row.prof}</td>
                          <td className="px-4 py-3"><span className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md text-xs font-bold">{row.salle}</span></td>
                          <td className="px-4 py-3 text-center flex items-center justify-center gap-1.5">
                            <button onClick={() => startEdit(row)} title="Modifier" className="p-1.5 text-slate-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"><Edit2 className="h-4 w-4" /></button>
                            <button onClick={() => deleteRow(row._id)} title="Supprimer" className="p-1.5 text-slate-500 dark:text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded transition-colors"><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex justify-end">
              <button 
                onClick={doConfirm} 
                disabled={loading || filteredData.length === 0} 
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-3.5 text-sm font-bold shadow-lg hover:shadow-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Database className="h-5 w-5" />}
                {loading ? 'Sauvegarde dans la base en cours...' : `3. Valider et Sauvegarder (${filteredData.length} sessions)`}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl border shadow-xl max-w-sm w-full ${toast.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : toast.type === 'info' ? 'bg-sky-50 dark:bg-sky-900/40 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300' : 'bg-rose-50 dark:bg-rose-900/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'}`}>
            <div className="flex items-start gap-3">
              {toast.type === 'success' ? <CheckCircle className="h-6 w-6 flex-shrink-0" /> : toast.type === 'info' ? <Info className="h-6 w-6 flex-shrink-0" /> : <AlertTriangle className="h-6 w-6 flex-shrink-0" />}
              <div className="flex-1">
                <h4 className="text-sm font-bold">{toast.msg}</h4>
                {toast.details && <p className="text-xs mt-1.5 opacity-90 leading-relaxed font-medium">{toast.details}</p>}
              </div>
              <button onClick={() => setToast(null)} className="flex-shrink-0 opacity-70 hover:opacity-100 p-1"><X className="h-5 w-5" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}