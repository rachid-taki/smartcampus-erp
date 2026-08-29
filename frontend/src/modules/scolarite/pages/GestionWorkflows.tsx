import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Trash2, X, Loader2, CheckCircle, AlertTriangle, ArrowRight,
  ToggleLeft, ToggleRight, Workflow as WorkflowIcon, User, Edit2, Info, FileText
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

type WorkflowStatut = 'Actif' | 'Inactif';

interface Etape {
  id_etape: string;
  ordre: number;
  nom: string;
  role_responsable: string | null;
}

interface Workflow {
  id_workflow: string;
  nom: string;
  description: string | null;
  statut: WorkflowStatut;
  date_creation: string;
  etapes: Etape[];
  _count?: {
    demandes: number;
    types_demande: number;
  };
}

interface ApiListResponse {
  success: boolean;
  data: Workflow[];
}

interface ApiSingleResponse {
  success: boolean;
  message?: string;
  data: Workflow;
}

interface EtapeDraft {
  nom: string;
  role_responsable: string;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const API_BASE = 'http://localhost:3000/api/scolarite';

const formatDateFr = (isoDate: string): string => {
  try {
    return new Date(isoDate).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return isoDate;
  }
};

const emptyEtapeDraft = (): EtapeDraft => ({ nom: '', role_responsable: '' });

// ─────────────────────────────────────────────────────────────
// Modal Création / Modification
// ─────────────────────────────────────────────────────────────

function WorkflowFormModal({
  workflowToEdit,
  onClose,
  onSaved,
  pushToast,
}: {
  workflowToEdit?: Workflow | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
  pushToast: (type: Toast['type'], message: string) => void;
}) {
  const [nom, setNom] = useState(workflowToEdit?.nom || '');
  const [description, setDescription] = useState(workflowToEdit?.description || '');
  const [etapes, setEtapes] = useState<EtapeDraft[]>(
    workflowToEdit && workflowToEdit.etapes.length > 0
      ? workflowToEdit.etapes.map(e => ({ nom: e.nom, role_responsable: e.role_responsable || '' }))
      : [emptyEtapeDraft()]
  );
  
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = !!workflowToEdit;

  const handleEtapeChange = (index: number, field: keyof EtapeDraft, value: string) => {
    setEtapes((prev) => prev.map((etape, i) => (i === index ? { ...etape, [field]: value } : etape)));
  };

  const handleAddEtape = () => setEtapes((prev) => [...prev, emptyEtapeDraft()]);
  const handleRemoveEtape = (index: number) => setEtapes((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    setFormError(null);
    if (!nom.trim()) { setFormError('Le nom du workflow est requis.'); return; }

    const cleanedEtapes = etapes.map((e) => ({ nom: e.nom.trim(), role_responsable: e.role_responsable.trim() })).filter((e) => e.nom !== '');
    if (cleanedEtapes.length === 0) { setFormError('Ajoutez au moins une étape valide (avec un nom).'); return; }

    setSaving(true);
    try {
      const payload = {
        nom: nom.trim(),
        description: description.trim(),
        etapes: cleanedEtapes.map((e, idx) => ({ nom: e.nom, ordre: idx + 1, role_responsable: e.role_responsable || null })),
      };

      const url = isEditing ? `${API_BASE}/workflows/${workflowToEdit.id_workflow}` : `${API_BASE}/workflows`;
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json: ApiSingleResponse = await response.json();
      if (!response.ok || !json.success) throw new Error((json as any).message || `Erreur serveur`);

      pushToast('success', isEditing ? 'Workflow mis à jour avec succès.' : 'Workflow créé avec succès.');
      await onSaved();
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4" onClick={() => !saving && onClose()}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isEditing ? 'Modifier le Workflow' : 'Créer un Workflow'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Définissez le nom et la séquence d'étapes de validation.</p>
          </div>
          <button onClick={onClose} disabled={saving} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulaire */}
        <div className="px-6 py-5 space-y-5 flex-1">
          {formError && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-3 text-xs text-red-700 dark:text-red-300 font-medium">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" /> <span>{formError}</span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nom du workflow <span className="text-rose-500">*</span></label>
              <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: Validation attestation de réussite" className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-400" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Description (Optionnel)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Décrivez l'objectif de ce workflow..." className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder-slate-400" />
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Étapes Séquentielles</label>
              <button type="button" onClick={handleAddEtape} className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                <Plus className="h-3.5 w-3.5" /> Ajouter une étape
              </button>
            </div>
            
            <div className="space-y-3">
              {etapes.map((etape, index) => (
                <div key={index} className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold mt-1 tabular-nums">{index + 1}</div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input type="text" value={etape.nom} onChange={(e) => handleEtapeChange(index, 'nom', e.target.value)} placeholder="Action requise (ex: Validation académique)" className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-1.5 text-xs outline-none focus:border-indigo-500 placeholder-slate-400" />
                    <input type="text" value={etape.role_responsable} onChange={(e) => handleEtapeChange(index, 'role_responsable', e.target.value)} placeholder="Rôle assigné (ex: Scolarité)" className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-1.5 text-xs outline-none focus:border-indigo-500 placeholder-slate-400" />
                  </div>
                  <button type="button" onClick={() => handleRemoveEtape(index)} disabled={etapes.length === 1} className="p-2 text-slate-400 hover:text-rose-500 disabled:opacity-30 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 sticky bottom-0 z-10">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">Annuler</button>
          <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg transition-all disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} 
            {isEditing ? 'Enregistrer les modifications' : 'Créer le workflow'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────

export default function GestionWorkflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{ isOpen: boolean; workflowToEdit: Workflow | null }>({ isOpen: false, workflowToEdit: null });
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((type: Toast['type'], message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const fetchWorkflows = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`${API_BASE}/workflows`, { signal });
      const json: ApiListResponse = await response.json();
      if (!response.ok || !json.success) throw new Error('Erreur de chargement.');
      setWorkflows(json.data);
    } catch (err: any) {
      if (err.name !== 'AbortError') setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchWorkflows(controller.signal);
    return () => controller.abort();
  }, [fetchWorkflows]);

  const handleToggleStatus = async (workflow: Workflow) => {
    setTogglingId(workflow.id_workflow);
    try {
      const response = await fetch(`${API_BASE}/workflows/${workflow.id_workflow}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: workflow.statut === 'Actif' ? 'Inactif' : 'Actif' }),
      });
      const json: ApiSingleResponse = await response.json();
      if (!response.ok) throw new Error(json.message);
      
      setWorkflows((prev) => prev.map((w) => (w.id_workflow === workflow.id_workflow ? json.data : w)));
      pushToast('success', 'Statut mis à jour.');
    } catch (err: any) {
      pushToast('error', err.message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (workflow: Workflow) => {
    if (workflow._count?.demandes && workflow._count.demandes > 0) {
      alert("Suppression impossible : Ce workflow est utilisé par des demandes existantes. Désactivez-le plutôt.");
      return;
    }

    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le workflow "${workflow.nom}" ?`)) return;

    try {
      const response = await fetch(`${API_BASE}/workflows/${workflow.id_workflow}`, { method: 'DELETE' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message);
      
      setWorkflows((prev) => prev.filter((w) => w.id_workflow !== workflow.id_workflow));
      pushToast('success', 'Workflow supprimé.');
    } catch (err: any) {
      pushToast('error', err.message);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header & Explication */}
      <header className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Moteur de Workflows</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Automatisation et standardisation des validations administratives.</p>
          </div>
          <button onClick={() => setModalState({ isOpen: true, workflowToEdit: null })} className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg transition-all whitespace-nowrap">
            <Plus className="h-4 w-4" /> Créer un Modèle
          </button>
        </div>

        {/* Boîte d'information contextuelle */}
        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
          <Info className="h-6 w-6 text-indigo-500 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wide">À quoi servent les workflows ?</h3>
            <p className="text-xs text-indigo-800/80 dark:text-indigo-300/90 mt-1.5 leading-relaxed">
              Un workflow (circuit de validation) définit par quelles <strong>étapes séquentielles</strong> une demande étudiante doit passer (ex: <i>Vérification Scolarité ➔ Validation Coordinateur ➔ Signature Directeur</i>) avant d'être totalement approuvée et délivrée. Une fois vos modèles définis ici, vous pourrez les associer à chaque "Type de demande".
            </p>
          </div>
        </div>
      </header>

      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center text-xs text-red-700 dark:text-red-300 font-medium">{error}</div>
      )}

      {/* Grid Workflows */}
      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 text-indigo-500 animate-spin" /></div>
      ) : workflows.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
          <WorkflowIcon className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Aucun workflow existant.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {workflows.map((workflow) => (
            <div key={workflow.id_workflow} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col overflow-hidden">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl"><WorkflowIcon className="h-5 w-5" /></div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">{workflow.nom}</h3>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Créé le {formatDateFr(workflow.date_creation)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setModalState({ isOpen: true, workflowToEdit: workflow })} className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700" title="Modifier"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(workflow)} className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700" title="Supprimer"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>

                {workflow.description && <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{workflow.description}</p>}
                
                {/* Métriques */}
                <div className="flex gap-2 mb-5">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700">
                    <FileText className="h-3 w-3 text-indigo-500" /> {workflow._count?.demandes || 0} Demandes liées
                  </span>
                </div>

                {/* Étapes */}
                <div className="space-y-2">
                  {workflow.etapes.map((etape, idx) => (
                    <div key={etape.id_etape} className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">{etape.ordre}</span>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{etape.nom}</p>
                      {etape.role_responsable && <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto font-mono">({etape.role_responsable})</span>}
                      {idx < workflow.etapes.length - 1 && <ArrowRight className="h-3 w-3 text-slate-300 dark:text-slate-600 mx-1 flex-shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Footer */}
              <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${workflow.statut === 'Actif' ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                  {workflow.statut === 'Actif' ? '● Opérationnel' : '○ Désactivé'}
                </span>
                <button onClick={() => handleToggleStatus(workflow)} disabled={togglingId === workflow.id_workflow} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50">
                  {togglingId === workflow.id_workflow ? <Loader2 className="h-6 w-6 animate-spin text-indigo-500" /> : workflow.statut === 'Actif' ? <ToggleRight className="h-7 w-7 text-green-500 dark:text-green-400" /> : <ToggleLeft className="h-7 w-7 text-slate-400" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale */}
      {modalState.isOpen && (
        <WorkflowFormModal 
          workflowToEdit={modalState.workflowToEdit} 
          onClose={() => setModalState({ isOpen: false, workflowToEdit: null })} 
          onSaved={fetchWorkflows} 
          pushToast={pushToast} 
        />
      )}

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 w-full max-w-sm">
        {toasts.map((toast) => (
          <div key={toast.id} className={`flex items-center gap-3 p-3.5 rounded-xl border shadow-xl ${toast.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'}`}>
            {toast.type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertTriangle className="h-5 w-5 flex-shrink-0" />}
            <span className="text-xs font-bold flex-1">{toast.message}</span>
            <button onClick={() => dismissToast(toast.id)} className="opacity-60 hover:opacity-100"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}