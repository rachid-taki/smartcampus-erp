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
export default function ParametresSysteme() {
  const [parametres, setParametres] = useState<Parametre[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Gestion de l'édition
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [savingCle, setSavingCle] = useState<string | null>(null);

  // Onglets (Modules)
  const [activeModule, setActiveModule] = useState<string>('Global');

  // Audit Log (BONUS)
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const pushToast = useCallback((type: Toast['type'], message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // Chargement des données
  const fetchParametres = useCallback(async () => {
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

  // Chargement de l'audit
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

  // Ouverture du panneau d'audit
  const openAuditPanel = () => {
    setIsAuditOpen(true);
    fetchAuditLogs();
  };

  // Extraction dynamique des modules
  const modulesDisponibles = Array.from(new Set(parametres.map(p => p.module || 'Global'))).sort();

  // Sauvegarde d'un paramètre
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

      // Succès
      setParametres(prev => prev.map(p => p.cle === cle ? { ...p, valeur: json.data.valeur } : p));
      setEdits(prev => { const next = { ...prev }; delete next[cle]; return next; });

      pushToast('success', `Le paramètre ${cle} a été mis à jour.`);
      
      // Si le panneau d'audit est ouvert, on le rafraîchit
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
    switch(type) {
      case 'Boolean': return <ToggleLeft className="h-4 w-4 text-emerald-500" />;
      case 'Integer': return <Hash className="h-4 w-4 text-blue-500" />;
      case 'JSON': return <FileJson className="h-4 w-4 text-amber-500" />;
      default: return <Type className="h-4 w-4 text-slate-400" />;
    }
  };

  // Formatage de la date pour l'audit
  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute:'2-digit' });
  };

  // Fonction BONUS: Export des paramètres
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative overflow-hidden">
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* Sidebar des Modules */}
      {/* ───────────────────────────────────────────────────────────── */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0 z-10">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg"><Server className="h-5 w-5 text-indigo-600" /></div>
            <h1 className="font-bold text-slate-800 text-lg">Configuration</h1>
          </div>
        </div>
        
        <div className="p-4 space-y-1">
          <p className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Modules Système</p>
          {loading ? (
            <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
          ) : modulesDisponibles.map(mod => (
            <button
              key={mod}
              onClick={() => setActiveModule(mod)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeModule === mod 
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100/50' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Settings className="h-5 w-5 text-slate-400" /> Paramètres : {activeModule}
              </h2>
              <p className="text-sm text-slate-500 mt-1">Gérez la configuration globale du module sélectionné.</p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Chercher une clé..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                />
              </div>

              {/* BOUTON EXPORT AJOUTÉ ICI */}
              <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
              >
                <Download className="h-4 w-4" /> <span className="hidden sm:inline">Exporter</span>
              </button>

              <button
                onClick={openAuditPanel}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
              >
                <History className="h-4 w-4" /> <span className="hidden sm:inline">Historique</span>
              </button>
            </div>
          </div>

          {/* Liste des Paramètres */}
          <div className="space-y-4">
            {parametresAffiches.length === 0 && !loading && (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500">
                Aucun paramètre trouvé pour cette recherche.
              </div>
            )}

            {parametresAffiches.map(p => {
              const valeurCourante = edits[p.cle] !== undefined ? edits[p.cle] : (p.valeur || '');
              const aEteModifie = edits[p.cle] !== undefined && edits[p.cle] !== (p.valeur || '');
              const isSaving = savingCle === p.cle;
              const isBoolean = p.type === 'Boolean';
              const isTrue = p.valeur === 'true' || p.valeur === '1';

              return (
                <div key={p.id_parametre} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 flex flex-col md:flex-row gap-6 items-start md:items-center hover:border-indigo-200 transition-colors group">
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeIcon(p.type)}
                      <h3 className="text-base font-bold text-slate-800">{formatCle(p.cle)}</h3>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">{p.cle}</span>
                    </div>
                    {p.description && <p className="text-sm text-slate-500 leading-relaxed">{p.description}</p>}
                  </div>

                  <div className="w-full md:w-auto flex items-center justify-end gap-3 flex-shrink-0">
                    {isBoolean ? (
                      <button
                        onClick={() => handleToggle(p.cle, p.valeur)}
                        disabled={isSaving}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isSaving ? 'opacity-50 cursor-wait' : ''} ${isTrue ? 'bg-indigo-600' : 'bg-slate-300'}`}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out ${isTrue ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    ) : (
                      <div className="flex w-full md:w-auto items-center gap-2">
                        {p.type === 'JSON' ? (
                           <textarea
                             value={valeurCourante}
                             onChange={(e) => setEdits(prev => ({ ...prev, [p.cle]: e.target.value }))}
                             className="w-full md:w-64 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all h-10 min-h-[40px] max-h-32"
                             spellCheck={false}
                           />
                        ) : (
                          <input
                            type={p.type === 'Integer' ? 'number' : 'text'}
                            value={valeurCourante}
                            onChange={(e) => setEdits(prev => ({ ...prev, [p.cle]: e.target.value }))}
                            className="w-full md:w-48 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium text-slate-700"
                          />
                        )}
                        
                        <div className={`transition-all duration-300 overflow-hidden ${aEteModifie ? 'w-10 opacity-100' : 'w-0 opacity-0'}`}>
                          <button
                            onClick={() => saveParametre(p.cle, valeurCourante)}
                            disabled={isSaving}
                            className="h-10 w-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:bg-indigo-400"
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
        <div className="absolute inset-0 z-40 flex justify-end">
          {/* Overlay sombre */}
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm animate-in fade-in" onClick={() => setIsAuditOpen(false)} />
          
          {/* Slide-over */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <History className="h-5 w-5 text-indigo-500" /> Journal d'Audit
                </h2>
                <p className="text-xs text-slate-500 mt-1">Dernières modifications des paramètres.</p>
              </div>
              <button onClick={() => setIsAuditOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 bg-white rounded-full shadow-sm hover:shadow transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingAudit ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="text-sm">Chargement de l'historique...</span>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center text-slate-500 py-10 text-sm">
                  Aucun historique disponible pour le moment.
                </div>
              ) : (
                auditLogs.map(log => (
                  <div key={log.id_log} className="relative pl-4 border-l-2 border-indigo-100 pb-2">
                    <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-indigo-500 ring-4 ring-white" />
                    
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {log.donnees_avant?.cle || 'Paramètre'}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatDateTime(log.date_action)}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 mt-2 text-sm flex items-center gap-3">
                      <div className="flex-1 text-red-500 font-mono break-all line-through opacity-70">
                        {log.donnees_avant?.valeur || 'null'}
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
                      <div className="flex-1 text-green-600 font-mono break-all font-medium">
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