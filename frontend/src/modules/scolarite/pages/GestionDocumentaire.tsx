import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Trash2, X, Loader2, CheckCircle, AlertTriangle, Search,
  FileText, Image as ImageIcon, FileSpreadsheet, File as FileIcon,
  ShieldCheck, FolderOpen, Landmark, Download, Tag, Info, UploadCloud, MessageSquare
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

interface Document {
  id_document: string;
  nom: string;
  type: string;
  taille: number;
  date_upload: string;
  id_demande: string | null;
  id_reclamation: string | null;
  hash: string | null;
}

interface DocumentOfficiel {
  id_document_officiel: string;
  nom: string;
  type: string;
  categorie: string;
  taille: number;
  date_generation: string;
  nombre_telechargements: number;
  hash: string | null;
}

interface DemandeOption {
  id_demande: string;
  numero: string;
  objet: string;
  etudiant?: {
    utilisateur: { nom: string; prenom: string };
  };
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

type MainTab = 'soumis' | 'officiels';

const API_BASE = 'http://localhost:3000/api/scolarite';

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

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${i === 0 ? value : value.toFixed(1)} ${units[i]}`;
};

const getFileIcon = (type: string | null | undefined) => {
  let icon = <FileIcon className="h-5 w-5" />;
  let colorClasses = "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400";

  if (!type) return <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${colorClasses}`}>{icon}</div>;

  if (type.includes('pdf')) {
    icon = <FileText className="h-5 w-5" />;
    colorClasses = "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400";
  } else if (type.includes('image')) {
    icon = <ImageIcon className="h-5 w-5" />;
    colorClasses = "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400";
  } else if (type.includes('excel') || type.includes('spreadsheet')) {
    icon = <FileSpreadsheet className="h-5 w-5" />;
    colorClasses = "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400";
  } else if (type.includes('word') || type.includes('document')) {
    icon = <FileText className="h-5 w-5" />;
    colorClasses = "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400";
  }

  return <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${colorClasses}`}>{icon}</div>;
};

// ─────────────────────────────────────────────────────────────
// Upload Modal (Ajout complet)
// ─────────────────────────────────────────────────────────────

function UploadDocumentModal({
  onClose,
  onCreated,
  pushToast,
}: {
  onClose: () => void;
  onCreated: () => Promise<void>;
  pushToast: (type: Toast['type'], message: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [isOfficial, setIsOfficial] = useState(false);
  const [categorie, setCategorie] = useState('Attestation');
  const [message, setMessage] = useState('');
  
  const [demandes, setDemandes] = useState<DemandeOption[]>([]);
  const [selectedDemande, setSelectedDemande] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Charger les demandes actives pour l'association
  useEffect(() => {
    fetch(`${API_BASE}/demandes?tab=actives`)
      .then(res => res.json())
      .then(json => {
        if (json.success) setDemandes(json.data);
      })
      .catch(() => console.error("Impossible de charger les demandes"));
  }, []);

  const handleSubmit = async () => {
    setFormError(null);

    if (!file) { setFormError('Veuillez sélectionner un fichier à téléverser.'); return; }
    if (file.size > 10 * 1024 * 1024) { setFormError('Le fichier dépasse la limite de 10 Mo.'); return; }
    if (!selectedDemande) { setFormError("Veuillez sélectionner une demande d'étudiant pour y attacher ce document."); return; }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('fichier', file);
      formData.append('id_demande', selectedDemande);
      formData.append('isOfficial', String(isOfficial));
      if (isOfficial) formData.append('categorie', categorie);
      if (message) formData.append('message', message);

      const response = await fetch(`${API_BASE}/documents`, {
        method: 'POST',
        body: formData,
      });

      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || `Erreur serveur`);

      pushToast('success', 'Document importé avec succès.');
      await onCreated();
      onClose();
    } catch (err: any) {
      setFormError(err.message || "Erreur d'importation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in" onClick={() => !saving && onClose()}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Importer un document</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Associez un fichier directement au dossier d'un étudiant.</p>
          </div>
          <button onClick={onClose} disabled={saving} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulaire */}
        <div className="px-6 py-5 space-y-6">
          {formError && (
            <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-3 text-xs text-rose-700 dark:text-rose-300 font-medium">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" /> <span>{formError}</span>
            </div>
          )}

          {/* 1. Sélection Fichier */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Le Fichier <span className="text-rose-500">*</span></label>
            {!file ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all cursor-pointer group"
              >
                <UploadCloud className="h-8 w-8 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Cliquez pour téléverser le fichier</p>
                  <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG, DOCX, XLSX (Max 10 Mo)</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30">
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileText className="h-6 w-6 text-indigo-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button onClick={() => setFile(null)} className="p-1.5 text-slate-400 hover:text-rose-500 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>

          {/* 2. Association Demande */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Lier au dossier <span className="text-rose-500">*</span></label>
            <select 
              value={selectedDemande} 
              onChange={(e) => setSelectedDemande(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-2.5 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
            >
              <option value="" disabled>-- Sélectionnez la demande de l'étudiant --</option>
              {demandes.map(d => (
                <option key={d.id_demande} value={d.id_demande}>
                  #{d.numero} - {d.etudiant?.utilisateur.nom} {d.etudiant?.utilisateur.prenom} ({d.objet})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Type & Message */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" checked={isOfficial} onChange={(e) => setIsOfficial(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-900" />
              <div>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block group-hover:text-indigo-600 transition-colors">C'est un Document Officiel (Signé)</span>
                <span className="text-[10px] text-slate-500">Le document sera classé dans les documents officiels validés.</span>
              </div>
            </label>

            {isOfficial && (
              <div className="pt-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Catégorie du document</label>
                <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500">
                  <option value="Attestation">Attestation de scolarité / réussite</option>
                  <option value="Relevé de notes">Relevé de notes</option>
                  <option value="Convention">Convention de stage</option>
                  <option value="Autre">Autre document officiel</option>
                </select>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                <MessageSquare className="h-3 w-3" /> Message pour l'étudiant (Optionnel)
              </label>
              <textarea 
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                rows={2} 
                placeholder="Ex: Voici le document manquant demandé..." 
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 resize-none" 
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 sticky bottom-0 z-10">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">Annuler</button>
          <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg transition-all disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Importer et Lier
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page Principale
// ─────────────────────────────────────────────────────────────

export default function GestionDocumentaire() {
  const [activeTab, setActiveTab] = useState<MainTab>('soumis');

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(true);
  const [searchInput, setSearchInput] = useState('');

  const [documentsOfficiels, setDocumentsOfficiels] = useState<DocumentOfficiel[]>([]);
  const [loadingOfficiels, setLoadingOfficiels] = useState<boolean>(true);
  const [officielsFetched, setOfficielsFetched] = useState(false);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((type: Toast['type'], message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const fetchDocuments = useCallback(async (signal?: AbortSignal) => {
    setLoadingDocs(true);
    try {
      const response = await fetch(`${API_BASE}/documents`, { signal });
      const json = await response.json();
      if (json.success) setDocuments(json.data);
    } catch (error: any) {
      if (error.name === 'AbortError') return; // Ignore intentionally aborted requests
      console.error("Erreur lors de la récupération des documents:", error);
    } finally { 
      setLoadingDocs(false); 
    }
  }, []);

  const fetchDocumentsOfficiels = useCallback(async (signal?: AbortSignal) => {
    setLoadingOfficiels(true);
    try {
      const response = await fetch(`${API_BASE}/documents-officiels`, { signal });
      const json = await response.json();
      if (json.success) {
        setDocumentsOfficiels(json.data);
        setOfficielsFetched(true);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return; // Ignore intentionally aborted requests
      console.error("Erreur lors de la récupération des documents officiels:", error);
    } finally { 
      setLoadingOfficiels(false); 
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchDocuments(controller.signal);
    return () => controller.abort();
  }, [fetchDocuments]);

  useEffect(() => {
    if (activeTab === 'officiels' && !officielsFetched) {
      const controller = new AbortController();
      fetchDocumentsOfficiels(controller.signal);
      return () => controller.abort();
    }
  }, [activeTab, officielsFetched, fetchDocumentsOfficiels]);

  const handleDelete = async (id: string) => {
    if(!window.confirm('Voulez-vous vraiment supprimer ce document ?')) return;
    try {
      const res = await fetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.id_document !== id));
        pushToast('success', 'Document supprimé.');
      }
    } catch { pushToast('error', 'Erreur de suppression.'); }
  };

  const handleDownload = async (id: string, nom: string, isOfficial: boolean) => {
    setDownloadingId(id);
    try {
      const url = isOfficial ? `${API_BASE}/documents-officiels/${id}/download` : `${API_BASE}/documents/${id}/download`;
      const response = await fetch(url);
      if (!response.ok) throw new Error();

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = nom;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);

      if (isOfficial) {
        setDocumentsOfficiels(prev => prev.map(doc => doc.id_document_officiel === id ? { ...doc, nombre_telechargements: doc.nombre_telechargements + 1 } : doc));
      }
    } catch {
      pushToast('error', 'Erreur de téléchargement.');
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredDocuments = documents.filter((doc) => !searchInput.trim() || doc.nom.toLowerCase().includes(searchInput.toLowerCase()));

  return (
    <div className="min-h-screen p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Archives & Documents</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Gérez l'ensemble des fichiers liés aux dossiers étudiants.</p>
        </div>
        <button onClick={() => setShowUploadModal(true)} className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg transition-all whitespace-nowrap">
          <UploadCloud className="h-4 w-4" /> Importer un document
        </button>
      </header>

      {/* Navigation Onglets */}
      <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl p-1.5">
        <button onClick={() => setActiveTab('soumis')} className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-lg transition-colors ${activeTab === 'soumis' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}>
          <FolderOpen className="h-4 w-4" /> Documents Soumis
        </button>
        <button onClick={() => setActiveTab('officiels')} className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-lg transition-colors ${activeTab === 'officiels' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}>
          <Landmark className="h-4 w-4" /> Documents Officiels (Signés)
        </button>
      </div>

      {/* Explication Contextuelle */}
      <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
        <Info className="h-6 w-6 text-indigo-500 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wide">
            {activeTab === 'soumis' ? 'Base de données des pièces justificatives' : 'Registre des documents académiques finaux'}
          </h3>
          <p className="text-xs text-indigo-800/80 dark:text-indigo-300/90 mt-1.5 leading-relaxed">
            {activeTab === 'soumis' 
              ? "Ces documents sont les pièces justificatives téléversées par les étudiants ou ajoutées par l'administration en cours de traitement (ex: copies de CIN, photos de baccalauréat, justificatifs de maladie). Ils constituent la base d'instruction des dossiers." 
              : "Ces documents représentent l'aboutissement d'une demande. Ils ont été validés, générés et signés électroniquement par l'administration (ex: Attestations de réussite, Relevés de notes officiels). Ils sont consultables et téléchargeables par les étudiants depuis leur portail."}
          </p>
        </div>
      </div>

      {/* Contenu - Onglet 1 : SOUMIS */}
      {activeTab === 'soumis' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Rechercher par nom de fichier..." className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">Document (Fichier brut)</th>
                  <th className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">Taille</th>
                  <th className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">Date d'importation</th>
                  <th className="px-5 py-3.5 text-right font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loadingDocs ? (
                  <tr><td colSpan={4} className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" /></td></tr>
                ) : filteredDocuments.length === 0 ? (
                  <tr><td colSpan={4} className="py-10 text-center text-xs text-slate-500">Aucun document standard disponible.</td></tr>
                ) : (
                  filteredDocuments.map(doc => (
                    <tr key={doc.id_document} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                      <td className="px-5 py-3.5 flex items-center gap-3">
                        {getFileIcon(doc.type)}
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm max-w-[200px] truncate">{doc.nom}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{doc.type}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-300 font-mono">{formatFileSize(doc.taille)}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-300">{formatDateFr(doc.date_upload)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => handleDownload(doc.id_document, doc.nom, false)} disabled={downloadingId === doc.id_document} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-indigo-200">
                            {downloadingId === doc.id_document ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                          </button>
                          <button onClick={() => handleDelete(doc.id_document)} className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-rose-200">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contenu - Onglet 2 : OFFICIELS */}
      {activeTab === 'officiels' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">Document Certifié</th>
                <th className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">Catégorie</th>
                <th className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">Généré le</th>
                <th className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">Vue par l'étudiant</th>
                <th className="px-5 py-3.5 text-right font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loadingOfficiels ? (
                <tr><td colSpan={5} className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" /></td></tr>
              ) : documentsOfficiels.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-xs text-slate-500">Aucun document officiel validé.</td></tr>
              ) : (
                documentsOfficiels.map(doc => (
                  <tr key={doc.id_document_officiel} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3.5 flex items-center gap-3">
                      {getFileIcon(doc.type)}
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm max-w-[200px] truncate">{doc.nom}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5"><ShieldCheck className="h-3 w-3" /> Signé</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg border bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
                        {doc.categorie}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-300">{formatDateFr(doc.date_generation)}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                        {doc.nombre_telechargements} téléchargement(s)
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => handleDownload(doc.id_document_officiel, doc.nom, true)} disabled={downloadingId === doc.id_document_officiel} className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 rounded-lg border border-indigo-200 dark:border-indigo-800/80 transition-colors">
                        {downloadingId === doc.id_document_officiel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Télécharger Original
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showUploadModal && <UploadDocumentModal onClose={() => setShowUploadModal(false)} onCreated={() => fetchDocuments()} pushToast={pushToast} />}
      
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-3 p-3.5 rounded-xl border shadow-xl ${t.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
            {t.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            <span className="text-xs font-bold flex-1">{t.message}</span>
            <button onClick={() => dismissToast(t.id)}><X className="h-4 w-4 opacity-60 hover:opacity-100" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}