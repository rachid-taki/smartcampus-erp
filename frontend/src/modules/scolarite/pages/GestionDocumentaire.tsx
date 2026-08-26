import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Trash2,
  X,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Search,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File as FileIcon,
  ClipboardList,
  MessageSquareWarning,
  PenTool,
  ShieldCheck,
  FolderOpen,
  Landmark,
  Download,
  Tag,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

// --- Tab 1: "document" table (student uploads via URL) ---
interface Document {
  id_document: string;
  nom: string;
  type: string;
  url: string;
  taille: number;
  date_upload: string;
  id_demande: string | null;
  id_reclamation: string | null;
  hash: string | null;
}

interface ApiDocumentsListResponse {
  success: boolean;
  count: number;
  data: Document[];
}

interface ApiDocumentResponse {
  success: boolean;
  message?: string;
  data: Document;
}

interface ApiDeleteResponse {
  success: boolean;
  message: string;
}

// --- Tab 2: "document_officiel" table (admin-generated PDFs, BYTEA) ---
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

interface ApiDocumentsOfficielsListResponse {
  success: boolean;
  count: number;
  data: DocumentOfficiel[];
}

interface ApiDocumentOfficielResponse {
  success: boolean;
  message?: string;
  data: DocumentOfficiel;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

type LinkageFilter = 'all' | 'demande' | 'reclamation';
type LinkageChoice = 'demande' | 'reclamation';
type MainTab = 'soumis' | 'officiels';

const API_BASE = 'http://localhost:3000/api/scolarite';

const TYPE_OPTIONS = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const formatDateFr = (isoDate: string): string => {
  try {
    return new Date(isoDate).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
};

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${i === 0 ? value : value.toFixed(1)} ${units[i]}`;
};

const truncateId = (id: string): string =>
  id.length > 10 ? `${id.slice(0, 6)}...${id.slice(-4)}` : id;

const getFileIcon = (type: string | null | undefined) => {
  let icon = <FileIcon className="h-5 w-5" />;
  let colorClasses = "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400";

  // Add a safety check for null or undefined types
  if (!type) {
    return (
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${colorClasses}`}>
        {icon}
      </div>
    );
  }

  if (type.includes('pdf')) {
    icon = <FileText className="h-5 w-5" />;
    colorClasses = "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400";
  } else if (type.includes('image')) {
    icon = <ImageIcon className="h-5 w-5" />;
    colorClasses = "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400";
  } else if (type.includes('excel') || type.includes('spreadsheet')) {
    icon = <FileSpreadsheet className="h-5 w-5" />;
    colorClasses = "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400";
  } else if (type.includes('word') || type.includes('document')) {
    icon = <FileText className="h-5 w-5" />;
    colorClasses = "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400";
  }

  return (
    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${colorClasses}`}>
      {icon}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Toast Container
// ─────────────────────────────────────────────────────────────

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 rounded-lg shadow-lg border p-4 animate-fade-in ${
            toast.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
          }`}
        >
          {toast.type === 'success' ? (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5">
              <CheckCircle className="h-4 w-4" />
            </div>
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5">
              <AlertTriangle className="h-4 w-4" />
            </div>
          )}
          <p className="text-sm flex-1">{toast.message}</p>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-current opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Upload Modal (Tab 1 — "Documents Soumis")
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
  const [nom, setNom] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState(TYPE_OPTIONS[0]);
  const [taille, setTaille] = useState('');
  const [linkage, setLinkage] = useState<LinkageChoice>('demande');
  const [linkedId, setLinkedId] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setFormError(null);

    if (!nom.trim()) {
      setFormError('Le nom du fichier est requis.');
      return;
    }
    if (!url.trim()) {
      setFormError("L'URL du fichier est requise.");
      return;
    }
    const tailleNum = Number(taille);
    if (!taille || Number.isNaN(tailleNum) || tailleNum <= 0) {
      setFormError('La taille doit être un nombre positif (en octets).');
      return;
    }
    if (!linkedId.trim()) {
      setFormError(
        linkage === 'demande'
          ? "L'ID de la demande est requis."
          : "L'ID de la réclamation est requis."
      );
      return;
    }

    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        nom: nom.trim(),
        type,
        url: url.trim(),
        taille: tailleNum,
      };

      if (linkage === 'demande') {
        payload.id_demande = linkedId.trim();
      } else {
        payload.id_reclamation = linkedId.trim();
      }

      const response = await fetch(`${API_BASE}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json: ApiDocumentResponse = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(
          (json as any).message || `Erreur serveur (code ${response.status})`
        );
      }

      pushToast('success', 'Document enregistré avec succès.');
      await onCreated();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de l'enregistrement du document.";
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-surface-dark/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={() => !saving && onClose()}
    >
      <div
        className="card p-0 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200/70 dark:border-slate-800 sticky top-0 bg-card dark:bg-card-dark rounded-t-card z-10">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white tracking-tight">
              Ajouter un document
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Enregistrez les métadonnées d'un fichier déjà téléversé.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-50 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 space-y-5">
          {formError && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5">
                <AlertTriangle className="h-3 w-3" />
              </div>
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Nom du fichier <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex: certificat_medical_janvier.pdf"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              URL du fichier <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://storage.smartcampus.ma/docs/..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Taille (octets) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={taille}
                onChange={(e) => setTaille(e.target.value)}
                placeholder="Ex: 204800"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent tabular-nums"
              />
            </div>
          </div>

          <hr className="border-slate-200/70 dark:border-slate-800" />

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              Lier le document à <span className="text-red-500">*</span>
            </label>

            <div className="flex gap-3 mb-3">
              <label
                className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                  linkage === 'demande'
                    ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="linkage"
                  value="demande"
                  checked={linkage === 'demande'}
                  onChange={() => {
                    setLinkage('demande');
                    setLinkedId('');
                  }}
                  className="accent-primary-600"
                />
                <ClipboardList className="h-4 w-4" />
                <span className="text-sm font-medium">Une Demande</span>
              </label>

              <label
                className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                  linkage === 'reclamation'
                    ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="linkage"
                  value="reclamation"
                  checked={linkage === 'reclamation'}
                  onChange={() => {
                    setLinkage('reclamation');
                    setLinkedId('');
                  }}
                  className="accent-primary-600"
                />
                <MessageSquareWarning className="h-4 w-4" />
                <span className="text-sm font-medium">Une Réclamation</span>
              </label>
            </div>

            <input
              type="text"
              value={linkedId}
              onChange={(e) => setLinkedId(e.target.value)}
              placeholder={
                linkage === 'demande'
                  ? 'ID de la demande (UUID)'
                  : 'ID de la réclamation (UUID)'
              }
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200/70 dark:border-slate-800 sticky bottom-0 bg-card dark:bg-card-dark rounded-b-card">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-soft transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Document Row (Tab 1 — "Documents Soumis")
// ─────────────────────────────────────────────────────────────

function DocumentRow({
  document,
  onDelete,
  deletingId,
  confirmingId,
  onRequestDelete,
  onCancelDelete,
  onSign,
  signingId,
}: {
  document: Document;
  onDelete: (id: string) => void;
  deletingId: string | null;
  confirmingId: string | null;
  onRequestDelete: (id: string) => void;
  onCancelDelete: () => void;
  onSign: (id: string) => void;
  signingId: string | null;
}) {
  const isDeleting = deletingId === document.id_document;
  const isConfirming = confirmingId === document.id_document;
  const isSigning = signingId === document.id_document;
  const isSigned = Boolean(document.hash);

  const linkage = document.id_demande
    ? { label: 'Demande', id: document.id_demande, classes: 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800' }
    : document.id_reclamation
    ? {
        label: 'Réclamation',
        id: document.id_reclamation,
        classes: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
      }
    : null;

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          {getFileIcon(document.type)}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-800 dark:text-white truncate max-w-xs">
                {document.nom}
              </p>
              {isSigned && (
                <span
                  title={`Hash: ${document.hash}`}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 flex-shrink-0"
                >
                  <ShieldCheck className="h-3 w-3" />
                  Signé
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{document.type}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 tabular-nums tracking-tight">
        {formatFileSize(document.taille)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 tabular-nums">
        {formatDateFr(document.date_upload)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {linkage ? (
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${linkage.classes}`}
            title={linkage.id}
          >
            {linkage.label}: <span className="ml-1 tabular-nums">{truncateId(linkage.id)}</span>
          </span>
        ) : (
          <span className="text-xs text-slate-500 dark:text-slate-400 italic">Non lié</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        {isConfirming ? (
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Confirmer ?</span>
            <button
              onClick={() => onDelete(document.id_document)}
              disabled={isDeleting}
              className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-60"
            >
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Oui'}
            </button>
            <button
              onClick={onCancelDelete}
              disabled={isDeleting}
              className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              Non
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1">
            <a
              href={document.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Voir
            </a>

            {!isSigned && (
              <button
                onClick={() => onSign(document.id_document)}
                disabled={isSigning}
                title="Signer électroniquement le document"
                aria-label="Signer électroniquement le document"
                className="inline-flex items-center justify-center p-2 text-slate-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSigning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PenTool className="h-4 w-4" />
                )}
              </button>
            )}

            <button
              onClick={() => onRequestDelete(document.id_document)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              aria-label="Supprimer le document"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────
// Document Officiel Row (Tab 2 — "Documents Officiels")
// ─────────────────────────────────────────────────────────────

function DocumentOfficielRow({
  document,
  onDownload,
  downloadingId,
  onSign,
  signingId,
}: {
  document: DocumentOfficiel;
  onDownload: (id: string, nom: string) => void;
  downloadingId: string | null;
  onSign: (id: string) => void;
  signingId: string | null;
}) {
  const isDownloading = downloadingId === document.id_document_officiel;
  const isSigning = signingId === document.id_document_officiel;
  const isSigned = Boolean(document.hash);

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          {getFileIcon(document.type)}
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 dark:text-white truncate max-w-xs">
              {document.nom}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{document.type}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
          <Tag className="h-3 w-3" />
          {document.categorie}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 tabular-nums tracking-tight">
        {formatFileSize(document.taille)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 tabular-nums">
        {formatDateFr(document.date_generation)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 tabular-nums tracking-tight">
        <span className="inline-flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            <Download className="h-3.5 w-3.5" />
          </div>
          {document.nombre_telechargements}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onDownload(document.id_document_officiel, document.nom)}
            disabled={isDownloading}
            title="Télécharger le document"
            aria-label="Télécharger le document"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Télécharger
          </button>

          {isSigned ? (
            <span
              title={`Hash: ${document.hash}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Signé
            </span>
          ) : (
            <button
              onClick={() => onSign(document.id_document_officiel)}
              disabled={isSigning}
              title="Signer électroniquement le document"
              aria-label="Signer électroniquement le document"
              className="inline-flex items-center justify-center p-2 text-slate-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSigning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PenTool className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────

export default function GestionDocumentaire() {
  const [activeTab, setActiveTab] = useState<MainTab>('soumis');

  // --- Tab 1: Documents Soumis state ---
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(true);
  const [errorDocs, setErrorDocs] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [linkageFilter, setLinkageFilter] = useState<LinkageFilter>('all');

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);

  // --- Tab 2: Documents Officiels state ---
  const [documentsOfficiels, setDocumentsOfficiels] = useState<DocumentOfficiel[]>([]);
  const [loadingOfficiels, setLoadingOfficiels] = useState<boolean>(true);
  const [errorOfficiels, setErrorOfficiels] = useState<string | null>(null);
  const [officielsFetched, setOfficielsFetched] = useState(false);

  const [downloadingOfficielId, setDownloadingOfficielId] = useState<string | null>(null);
  const [signingOfficielId, setSigningOfficielId] = useState<string | null>(null);

  // --- Toasts (shared across both tabs) ---
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((type: Toast['type'], message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ── Fetch: Documents Soumis ──
  const fetchDocuments = useCallback(async (signal?: AbortSignal) => {
    setLoadingDocs(true);
    setErrorDocs(null);

    try {
      const response = await fetch(`${API_BASE}/documents`, { signal });

      if (!response.ok) {
        throw new Error(`Erreur serveur (code ${response.status})`);
      }

      const json: ApiDocumentsListResponse = await response.json();

      if (!json.success) {
        throw new Error('La requête a échoué côté serveur.');
      }

      setDocuments(json.data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message =
        err instanceof Error
          ? err.message
          : 'Impossible de contacter le serveur. Vérifiez que le backend est démarré.';
      setErrorDocs(message);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  // ── Fetch: Documents Officiels ──
  const fetchDocumentsOfficiels = useCallback(async (signal?: AbortSignal) => {
    setLoadingOfficiels(true);
    setErrorOfficiels(null);

    try {
      const response = await fetch(`${API_BASE}/documents-officiels`, { signal });

      if (!response.ok) {
        throw new Error(`Erreur serveur (code ${response.status})`);
      }

      const json: ApiDocumentsOfficielsListResponse = await response.json();

      if (!json.success) {
        throw new Error('La requête a échoué côté serveur.');
      }

      setDocumentsOfficiels(json.data);
      setOfficielsFetched(true);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message =
        err instanceof Error
          ? err.message
          : 'Impossible de contacter le serveur. Vérifiez que le backend est démarré.';
      setErrorOfficiels(message);
    } finally {
      setLoadingOfficiels(false);
    }
  }, []);

  // Always load Tab 1 data on mount
  useEffect(() => {
    const controller = new AbortController();
    fetchDocuments(controller.signal);
    return () => controller.abort();
  }, [fetchDocuments]);

  // Lazily load Tab 2 data the first time that tab becomes active
  useEffect(() => {
    if (activeTab === 'officiels' && !officielsFetched) {
      const controller = new AbortController();
      fetchDocumentsOfficiels(controller.signal);
      return () => controller.abort();
    }
  }, [activeTab, officielsFetched, fetchDocumentsOfficiels]);

  // ── Tab 1: Delete flow ──
  const handleRequestDelete = (id: string) => setConfirmingId(id);
  const handleCancelDelete = () => setConfirmingId(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);

    try {
      const response = await fetch(`${API_BASE}/documents/${id}`, {
        method: 'DELETE',
      });

      const json: ApiDeleteResponse = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || `Erreur serveur (code ${response.status})`);
      }

      setDocuments((prev) => prev.filter((d) => d.id_document !== id));
      pushToast('success', json.message || 'Document supprimé avec succès.');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de la suppression du document.';
      pushToast('error', message);
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  };

  // ── Tab 1: Sign flow ──
  const handleSignDocument = async (id_document: string) => {
    setSigningId(id_document);

    try {
      const response = await fetch(`${API_BASE}/documents/${id_document}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const json: ApiDocumentResponse = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(
          (json as any).message || `Erreur serveur (code ${response.status})`
        );
      }

      setDocuments((prev) =>
        prev.map((doc) => (doc.id_document === id_document ? json.data : doc))
      );

      pushToast('success', json.message || 'Document signé avec succès.');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de la signature du document.';
      pushToast('error', message);
    } finally {
      setSigningId(null);
    }
  };

  // ── Tab 2: Download flow (binary blob) ──
  const handleDownloadOfficiel = async (id: string, nom: string) => {
    setDownloadingOfficielId(id);

    try {
      const response = await fetch(`${API_BASE}/documents-officiels/${id}/download`);

      if (!response.ok) {
        let message = `Erreur serveur (code ${response.status})`;
        try {
          const errJson = await response.json();
          if (errJson?.message) message = errJson.message;
        } catch {
          // response wasn't JSON — keep the generic message
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = nom || `document_${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);

      // Reflect the incremented download count locally without a refetch
      setDocumentsOfficiels((prev) =>
        prev.map((doc) =>
          doc.id_document_officiel === id
            ? { ...doc, nombre_telechargements: doc.nombre_telechargements + 1 }
            : doc
        )
      );

      pushToast('success', 'Téléchargement démarré.');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors du téléchargement du document.';
      pushToast('error', message);
    } finally {
      setDownloadingOfficielId(null);
    }
  };

  // ── Tab 2: Sign flow ──
  const handleSignOfficiel = async (id: string) => {
    setSigningOfficielId(id);

    try {
      const response = await fetch(`${API_BASE}/documents-officiels/${id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const json: ApiDocumentOfficielResponse = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(
          (json as any).message || `Erreur serveur (code ${response.status})`
        );
      }

      setDocumentsOfficiels((prev) =>
        prev.map((doc) =>
          doc.id_document_officiel === id ? json.data : doc
        )
      );

      pushToast('success', json.message || 'Document signé avec succès.');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de la signature du document.';
      pushToast('error', message);
    } finally {
      setSigningOfficielId(null);
    }
  };

  // ── Tab 1: Client-side filtering (search + linkage) ──
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      !searchInput.trim() ||
      doc.nom.toLowerCase().includes(searchInput.trim().toLowerCase());

    const matchesLinkage =
      linkageFilter === 'all' ||
      (linkageFilter === 'demande' && doc.id_demande) ||
      (linkageFilter === 'reclamation' && doc.id_reclamation);

    return matchesSearch && matchesLinkage;
  });

  return (
    <div className="sc-portal min-h-screen p-6 md:p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
              Gestion Documentaire
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Consultez, filtrez et gérez les documents soumis et les documents officiels.
            </p>
          </div>

          {activeTab === 'soumis' && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-soft hover:shadow-soft-hover transition-all whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Ajouter un document
            </button>
          )}
        </header>

        {/* ── Tab menu ── */}
        <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1 mb-6">
          <button
            onClick={() => setActiveTab('soumis')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'soumis'
                ? 'bg-card dark:bg-card-dark text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <FolderOpen className="h-4 w-4" />
            Documents Soumis
          </button>
          <button
            onClick={() => setActiveTab('officiels')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'officiels'
                ? 'bg-card dark:bg-card-dark text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Landmark className="h-4 w-4" />
            Documents Officiels
          </button>
        </div>

        {/* ───────────────────────────────────────────── */}
        {/* TAB 1: Documents Soumis */}
        {/* ───────────────────────────────────────────── */}
        {activeTab === 'soumis' && (
          <>
            {/* Filter bar */}
            <div className="card p-4 mb-6 flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Rechercher par nom de fichier..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark text-slate-800 dark:text-white placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                />
              </div>

              <select
                value={linkageFilter}
                onChange={(e) => setLinkageFilter(e.target.value as LinkageFilter)}
                className="md:w-64 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark text-slate-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              >
                <option value="all">Tous</option>
                <option value="demande">Liés aux Demandes</option>
                <option value="reclamation">Liés aux Réclamations</option>
              </select>
            </div>

            {errorDocs && !loadingDocs && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 mb-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 mx-auto mb-2">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">{errorDocs}</p>
              </div>
            )}

            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200/70 dark:divide-slate-800">
                  <thead className="bg-surface dark:bg-surface-dark/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Document
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Taille
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Date d'upload
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Lié à
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                    {loadingDocs ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                              <div className="h-4 w-40 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-6 w-28 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse ml-auto" />
                          </td>
                        </tr>
                      ))
                    ) : filteredDocuments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                          Aucun document ne correspond aux critères sélectionnés.
                        </td>
                      </tr>
                    ) : (
                      filteredDocuments.map((doc) => (
                        <DocumentRow
                          key={doc.id_document}
                          document={doc}
                          onDelete={handleDelete}
                          deletingId={deletingId}
                          confirmingId={confirmingId}
                          onRequestDelete={handleRequestDelete}
                          onCancelDelete={handleCancelDelete}
                          onSign={handleSignDocument}
                          signingId={signingId}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ───────────────────────────────────────────── */}
        {/* TAB 2: Documents Officiels */}
        {/* ───────────────────────────────────────────── */}
        {activeTab === 'officiels' && (
          <>
            {errorOfficiels && !loadingOfficiels && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 mb-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 mx-auto mb-2">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">{errorOfficiels}</p>
              </div>
            )}

            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200/70 dark:divide-slate-800">
                  <thead className="bg-surface dark:bg-surface-dark/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Fichier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Catégorie
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Taille
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Date Génération
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Téléchargements
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                    {loadingOfficiels ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                              <div className="h-4 w-40 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-6 w-24 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-4 w-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded animate-pulse ml-auto" />
                          </td>
                        </tr>
                      ))
                    ) : documentsOfficiels.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                          Aucun document officiel disponible pour le moment.
                        </td>
                      </tr>
                    ) : (
                      documentsOfficiels.map((doc) => (
                        <DocumentOfficielRow
                          key={doc.id_document_officiel}
                          document={doc}
                          onDownload={handleDownloadOfficiel}
                          downloadingId={downloadingOfficielId}
                          onSign={handleSignOfficiel}
                          signingId={signingOfficielId}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Upload Modal (Tab 1 only) */}
      {showUploadModal && (
        <UploadDocumentModal
          onClose={() => setShowUploadModal(false)}
          onCreated={() => fetchDocuments()}
          pushToast={pushToast}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}