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

const getFileIcon = (type: string) => {
  if (type.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
  if (type.includes('image')) return <ImageIcon className="h-5 w-5 text-purple-500" />;
  if (type.includes('excel') || type.includes('spreadsheet'))
    return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  if (type.includes('word') || type.includes('document'))
    return <FileText className="h-5 w-5 text-blue-500" />;
  return <FileIcon className="h-5 w-5 text-gray-400" />;
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
          className={`flex items-start gap-3 rounded-lg shadow-lg border p-4 ${
            toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
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
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-xl z-10">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Ajouter un document
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Enregistrez les métadonnées d'un fichier déjà téléversé.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 space-y-5">
          {formError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Nom du fichier <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex: certificat_medical_janvier.pdf"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              URL du fichier <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://storage.smartcampus.ma/docs/..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Taille (octets) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={taille}
                onChange={(e) => setTaille(e.target.value)}
                placeholder="Ex: 204800"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>
          </div>

          <hr className="border-gray-100" />

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Lier le document à <span className="text-red-500">*</span>
            </label>

            <div className="flex gap-3 mb-3">
              <label
                className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                  linkage === 'demande'
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
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
                  className="accent-indigo-600"
                />
                <ClipboardList className="h-4 w-4" />
                <span className="text-sm font-medium">Une Demande</span>
              </label>

              <label
                className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                  linkage === 'reclamation'
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
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
                  className="accent-indigo-600"
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
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-xl">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
    ? { label: 'Demande', id: document.id_demande, classes: 'bg-blue-100 text-blue-700 border-blue-200' }
    : document.id_reclamation
    ? {
        label: 'Réclamation',
        id: document.id_reclamation,
        classes: 'bg-orange-100 text-orange-700 border-orange-200',
      }
    : null;

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          {getFileIcon(document.type)}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-800 truncate max-w-xs">
                {document.nom}
              </p>
              {isSigned && (
                <span
                  title={`Hash: ${document.hash}`}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 border border-green-200 flex-shrink-0"
                >
                  <ShieldCheck className="h-3 w-3" />
                  Signé
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">{document.type}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        {formatFileSize(document.taille)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatDateFr(document.date_upload)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {linkage ? (
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${linkage.classes}`}
            title={linkage.id}
          >
            {linkage.label}: {truncateId(linkage.id)}
          </span>
        ) : (
          <span className="text-xs text-gray-400 italic">Non lié</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        {isConfirming ? (
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-gray-500">Confirmer ?</span>
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
              className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
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
                className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          {getFileIcon(document.type)}
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate max-w-xs">
              {document.nom}
            </p>
            <p className="text-xs text-gray-400">{document.type}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700 border border-violet-200">
          <Tag className="h-3 w-3" />
          {document.categorie}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        {formatFileSize(document.taille)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatDateFr(document.date_generation)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <Download className="h-3.5 w-3.5 text-gray-400" />
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200"
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
              className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Gestion Documentaire
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Consultez, filtrez et gérez les documents soumis et les documents officiels.
            </p>
          </div>

          {activeTab === 'soumis' && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Ajouter un document
            </button>
          )}
        </header>

        {/* ── Tab menu ── */}
        <div className="inline-flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          <button
            onClick={() => setActiveTab('soumis')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'soumis'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FolderOpen className="h-4 w-4" />
            Documents Soumis
          </button>
          <button
            onClick={() => setActiveTab('officiels')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'officiels'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Rechercher par nom de fichier..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>

              <select
                value={linkageFilter}
                onChange={(e) => setLinkageFilter(e.target.value as LinkageFilter)}
                className="md:w-64 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white"
              >
                <option value="all">Tous</option>
                <option value="demande">Liés aux Demandes</option>
                <option value="reclamation">Liés aux Réclamations</option>
              </select>
            </div>

            {errorDocs && !loadingDocs && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-6 mb-6 text-center">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-red-700">{errorDocs}</p>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Document
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Taille
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Date d'upload
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Lié à
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loadingDocs ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 bg-gray-100 rounded animate-pulse" />
                              <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-6 w-28 bg-gray-100 rounded-full animate-pulse" />
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-4 w-20 bg-gray-100 rounded animate-pulse ml-auto" />
                          </td>
                        </tr>
                      ))
                    ) : filteredDocuments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400">
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
              <div className="bg-red-50 border border-red-100 rounded-xl p-6 mb-6 text-center">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-red-700">{errorOfficiels}</p>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Fichier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Catégorie
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Taille
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Date Génération
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Téléchargements
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loadingOfficiels ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 bg-gray-100 rounded animate-pulse" />
                              <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-6 w-24 bg-gray-100 rounded-full animate-pulse" />
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-4 w-10 bg-gray-100 rounded animate-pulse" />
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse ml-auto" />
                          </td>
                        </tr>
                      ))
                    ) : documentsOfficiels.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">
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