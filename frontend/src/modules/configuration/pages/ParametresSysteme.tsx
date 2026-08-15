import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Settings, 
  CheckCircle, 
  X, 
  AlertTriangle, 
  Save,
  Loader2,
  Search,
  Server,
  ToggleLeft,
  Hash,
  Type,
  FileJson,
  History,
  ArrowRight,
  Clock,
  Download
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type TypeParametre = 'String' | 'Integer' | 'Boolean' | 'JSON';

interface Parametre {
  id_parametre: string;
  cle: string;
  valeur: string | null;
  type: TypeParametre;
  description: string | null;
  module: string | null;
}

interface AuditLog {
  id_log: string;
  action: string;
  date_action: string;
  donnees_avant: { cle: string; valeur: string } | null;
  donnees_apres: { cle: string; valeur: string } | null;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const API_BASE = 'http://localhost:3000/api/parametres';

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
export default function ParametresSysteme() {
  const [parametres, setParametres] = useState<Parametre[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [savingCle, setSavingCle] = useState<string | null>(null);

  const [activeModule, setActiveModule] = useState<string>('Global');

  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const pushToast = useCallback((type: Toast['type'], message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const fetchParametres = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE);
      const json = await res.json();
      if (json.success) {
        setParametres(json.data);
        const modules = Array.from(new Set(json.data.map((p: Parametre) => p.module || 'Global')));
        if (!modules.includes(activeModule) && modules.length > 0) {
          setActiveModule(modules[0] as string);
        }
      }
    } catch (err) {
      pushToast('error', 'Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  }, [activeModule, pushToast]);

  useEffect(() => { fetchParametres(); }, [fetchParametres]);

  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch(`${API_BASE}/audit/logs`);
      const json = await res.json();
      if (json.success) setAuditLogs(json.data);
    } catch (err) {
      pushToast('error', 'Impossible de charger l\'historique.');
    } finally {
      setLoadingAudit(false);
    }
  };

  const openAuditPanel = () => {
    setIsAuditOpen(true);
    fetchAuditLogs();
  };

  const modulesDisponibles = Array.from(new Set(parametres.map(p => p.module || 'Global'))).sort();

  const saveParametre = async (cle: string, nouvelleValeur: string) => {
    setSavingCle(cle);
    try {
      const res = await fetch(`${API_BASE}/${cle}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valeur: nouvelleValeur })
      });
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.message || 'Erreur lors de la sauvegarde.');

      setParametres(prev => prev.map(p => p.cle === cle ? { ...p, valeur: json.data.valeur } : p));
      setEdits(prev => { const next = { ...prev }; delete next[cle]; return next; });

      pushToast('success', `Le paramètre ${cle} a été mis à jour.`);
      
      if (isAuditOpen) fetchAuditLogs();
      
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setSavingCle(null);
    }
  };

  const handleToggle = (cle: string, valeurActuelle: string | null) => {
    const isActuellementVrai = valeurActuelle === 'true' || valeurActuelle === '1';
    saveParametre(cle, isActuellementVrai ? 'false' : 'true');
  };

  const parametresAffiches = parametres
    .filter(p => (p.module || 'Global') === activeModule)
    .filter(p => p.cle.toLowerCase().includes(search.toLowerCase()) || (p.description && p.description.toLowerCase().includes(search.toLowerCase())));

  const formatCle = (cle: string) => cle.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  const getTypeIcon = (type: TypeParametre) => {
    const baseTile = "flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0";
    switch(type) {
      case 'Boolean': return <div className={`${baseTile} bg-emerald-50 dark:bg-emerald-900/30`}><ToggleLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /></div>;
      case 'Integer': return <div className={`${baseTile} bg-primary-50 dark:bg-primary-900/30`}><Hash className="h-4 w-4 text-primary-600 dark:text-primary-400" /></div>;
      case 'JSON': return <div className={`${baseTile} bg-amber-50 dark:bg-amber-900/30`}><FileJson className="h-4 w-4 text-amber-600 dark:text-amber-400" /></div>;
      default: return <div className={`${baseTile} bg-slate-100 dark:bg-slate-800`}><Type className="h-4 w-4 text-slate-600 dark:text-slate-400" /></div>;
    }
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute:'2-digit' });
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(parametres, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartcampus_config_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    pushToast('success', 'Configuration exportée avec succès !');
  };

  const inputClasses = "w-full md:w-48 border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all font-medium";

  return (
    <div className="sc-portal min-h-screen bg-surface dark:bg-surface-dark flex flex-col md:flex-row relative overflow-hidden animate-fade-in">
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* Sidebar des Modules */}
      {/* ───────────────────────────────────────────────────────────── */}
      <aside className="w-full md:w-64 bg-card dark:bg-card-dark border-r border-slate-200 dark:border-slate-800 flex-shrink-0 z-10">
        <div className="p-5 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/30">
              <Server className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="font-bold text-slate-800 dark:text-white text-lg tracking-tight">Configuration</h1>
          </div>
        </div>
        
        <div className="p-4 space-y-1">
          <p className="px-3 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Modules Système</p>
          {loading ? (
            <div className="flex justify-center p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <Loader2 className="h-4 w-4 animate-spin text-slate-500 dark:text-slate-400" />
              </div>
            </div>
          ) : modulesDisponibles.map(mod => (
            <button
              key={mod}
              onClick={() => setActiveModule(mod)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeModule === mod 
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm border border-primary-200 dark:border-primary-800' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {mod}
            </button>
          ))}
        </div>
      </aside>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Zone Principale */}
      {/* ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Header de la page */}
          <header className="card p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                <Settings className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                  Paramètres : <span className="text-primary-600 dark:text-primary-400">{activeModule}</span>
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Gérez la configuration globale du module sélectionné.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Chercher une clé..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark rounded-lg pl-9 pr-4 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
                />
              </div>

              <button
                onClick={handleExport}
                className="inline-flex items-center justify-center gap-2 bg-card dark:bg-card-dark border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                title="Exporter la configuration"
              >
                <Download className="h-4 w-4" /> <span className="hidden sm:inline">Exporter</span>
              </button>

              <button
                onClick={openAuditPanel}
                className="inline-flex items-center justify-center gap-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                <History className="h-4 w-4" /> <span className="hidden sm:inline">Historique</span>
              </button>
            </div>
          </header>

          {/* Liste des Paramètres */}
          <div className="space-y-4">
            {parametresAffiches.length === 0 && !loading && (
              <div className="card p-12 text-center flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
                  <Search className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-slate-500 dark:text-slate-400">Aucun paramètre trouvé pour cette recherche.</p>
              </div>
            )}

            {parametresAffiches.map(p => {
              const valeurCourante = edits[p.cle] !== undefined ? edits[p.cle] : (p.valeur || '');
              const aEteModifie = edits[p.cle] !== undefined && edits[p.cle] !== (p.valeur || '');
              const isSaving = savingCle === p.cle;
              const isBoolean = p.type === 'Boolean';
              const isTrue = p.valeur === 'true' || p.valeur === '1';

              return (
                <div key={p.id_parametre} className="card p-5 md:p-6 flex flex-col md:flex-row gap-6 items-start md:items-center hover:border-primary-200 dark:hover:border-primary-800 transition-colors group">
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {getTypeIcon(p.type)}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">{formatCle(p.cle)}</h3>
                        <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 tabular-nums">
                          {p.cle}
                        </span>
                      </div>
                    </div>
                    {p.description && <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed ml-10">{p.description}</p>}
                  </div>

                  <div className="w-full md:w-auto flex items-center justify-end gap-3 flex-shrink-0">
                    {isBoolean ? (
                      <button
                        onClick={() => handleToggle(p.cle, p.valeur)}
                        disabled={isSaving}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${isSaving ? 'opacity-50 cursor-wait' : ''} ${isTrue ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out ${isTrue ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    ) : (
                      <div className="flex w-full md:w-auto items-center gap-2">
                        {p.type === 'JSON' ? (
                           <textarea
                             value={valeurCourante}
                             onChange={(e) => setEdits(prev => ({ ...prev, [p.cle]: e.target.value }))}
                             className="w-full md:w-64 border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark rounded-lg px-3 py-2 text-sm font-mono text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all h-10 min-h-[40px] max-h-32 tabular-nums"
                             spellCheck={false}
                           />
                        ) : (
                          <input
                            type={p.type === 'Integer' ? 'number' : 'text'}
                            value={valeurCourante}
                            onChange={(e) => setEdits(prev => ({ ...prev, [p.cle]: e.target.value }))}
                            className={`${inputClasses} tabular-nums`}
                          />
                        )}
                        
                        <div className={`transition-all duration-300 overflow-hidden ${aEteModifie ? 'w-10 opacity-100' : 'w-0 opacity-0'}`}>
                          <button
                            onClick={() => saveParametre(p.cle, valeurCourante)}
                            disabled={isSaving}
                            className="h-10 w-10 flex items-center justify-center bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:bg-primary-400 shadow-soft"
                          >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </main>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Panneau Latéral : Journal d'Audit (BONUS) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isAuditOpen && (
        <div className="absolute inset-0 z-40 flex justify-end animate-fade-in">
          <div className="absolute inset-0 bg-surface-dark/60 backdrop-blur-sm" onClick={() => setIsAuditOpen(false)} />
          
          <div className="relative w-full max-w-md bg-card dark:bg-card-dark h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200 dark:border-slate-800">
            
            <div className="p-6 border-b border-slate-200/70 dark:border-slate-800 flex justify-between items-center bg-surface dark:bg-surface-dark/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/30">
                  <History className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Journal d'Audit</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Dernières modifications des paramètres.</p>
                </div>
              </div>
              <button onClick={() => setIsAuditOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-card dark:bg-card-dark rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingAudit ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-500 dark:text-slate-400">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-600 dark:text-primary-400" />
                  </div>
                  <span className="text-sm">Chargement de l'historique...</span>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="card p-8 text-center flex flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
                    <History className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Aucun historique disponible pour le moment.</p>
                </div>
              ) : (
                auditLogs.map(log => (
                  <div key={log.id_log} className="relative pl-5 border-l-2 border-primary-200 dark:border-primary-800 pb-2">
                    <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary-500 ring-4 ring-card dark:ring-card-dark" />
                    
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 font-mono">
                        {log.donnees_avant?.cle || 'Paramètre'}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 tabular-nums">
                        <div className="flex h-4 w-4 items-center justify-center rounded bg-slate-100 dark:bg-slate-800">
                          <Clock className="h-2.5 w-2.5" />
                        </div>
                        {formatDateTime(log.date_action)}
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 rounded-lg p-3 text-sm flex items-center gap-3">
                      <div className="flex-1 text-red-600 dark:text-red-400 font-mono break-all line-through opacity-70 text-xs">
                        {log.donnees_avant?.valeur || 'null'}
                      </div>
                      <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                        <ArrowRight className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                      </div>
                      <div className="flex-1 text-green-600 dark:text-green-400 font-mono break-all font-medium text-xs">
                        {log.donnees_apres?.valeur || 'null'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={id => setToasts(t => t.filter(x => x.id !== id))} />
    </div>
  );
}