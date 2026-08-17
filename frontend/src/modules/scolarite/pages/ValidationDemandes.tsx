import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, CheckCircle, XCircle, Eye, X, Loader2, AlertTriangle, Clock,
  Download, FileText, Upload, FileUp, Info, Calendar, Hash, User,
  ArrowRight, Sparkles, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

type Statut =
  | 'Brouillon'
  | 'Soumise'
  | 'En_Traitement'
  | 'Validee'
  | 'Rejetee'
  | 'Cloturee';

interface TypeDemande {
  id_type: string;
  libelle: string;
  code: string;
}

interface Demande {
  id_demande: string;
  numero: string;
  objet: string;
  description: string;
  statut: Statut;
  date_creation: string;
  type_demande?: TypeDemande;
}

interface ApiListResponse {
  success: boolean;
  count: number;
  data: Demande[];
}

interface ApiUpdateResponse {
  success: boolean;
  message: string;
  data: Demande;
}

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

const API_BASE = 'http://localhost:3000/api/scolarite';

const STATUT_OPTIONS: Statut[] = [
  'Brouillon', 'Soumise', 'En_Traitement', 'Validee', 'Rejetee', 'Cloturee',
];

const DOCUMENT_OFFICIAL_CODES = [
  'ATTESTATION_SCOLARITE',
  'RELEVE_NOTES',
  'ATTESTATION',
  'RELEVE',
];

// ─────────────────────────────────────────────────────────────
// Design system pour chaque statut (modal)
// ─────────────────────────────────────────────────────────────

const STATUT_DESIGN: Record<Statut, {
  bg: string; text: string; border: string; dot: string; gradient: string;
}> = {
  Brouillon: {
    bg: 'bg-slate-50 dark:bg-slate-800/60',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
    gradient: 'from-slate-500 to-slate-600',
  },
  Soumise: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-900',
    dot: 'bg-blue-500',
    gradient: 'from-blue-500 to-indigo-600',
  },
  En_Traitement: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-900',
    dot: 'bg-amber-500',
    gradient: 'from-amber-500 to-orange-600',
  },
  Validee: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-900',
    dot: 'bg-emerald-500',
    gradient: 'from-emerald-500 to-teal-600',
  },
  Rejetee: {
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-900',
    dot: 'bg-rose-500',
    gradient: 'from-rose-500 to-red-600',
  },
  Cloturee: {
    bg: 'bg-slate-50 dark:bg-slate-800/60',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-500',
    gradient: 'from-slate-500 to-slate-600',
  },
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const formatDateFr = (isoDate: string): string => {
  try {
    return new Date(isoDate).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch { return isoDate; }
};

const formatStatutLabel = (statut: string): string => statut.replace(/_/g, ' ');

const getStatutBadgeClasses = (statut: Statut): string => {
  const map: Record<Statut, string> = {
    Brouillon: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    Soumise: 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800',
    En_Traitement: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    Validee: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800',
    Rejetee: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800',
    Cloturee: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  };
  return map[statut] ?? map.Brouillon;
};

const requiresOfficialDocument = (demande: Demande): boolean => {
  const code = demande.type_demande?.code?.toUpperCase() || '';
  const libelle = demande.type_demande?.libelle?.toLowerCase() || '';
  const objet = demande.objet?.toLowerCase() || '';

  return (
    DOCUMENT_OFFICIAL_CODES.some((c) => code.includes(c)) ||
    libelle.includes('attestation') ||
    libelle.includes('relevé') ||
    libelle.includes('releve') ||
    objet.includes('attestation') ||
    objet.includes('relevé') ||
    objet.includes('releve')
  );
};

const getDocumentLabel = (demande: Demande): string => {
  const libelle = demande.type_demande?.libelle?.toLowerCase() || '';
  const objet = demande.objet?.toLowerCase() || '';
  if (libelle.includes('relevé') || libelle.includes('releve') || objet.includes('relevé')) {
    return 'Relevé de notes';
  }
  return 'Attestation';
};

// ─────────────────────────────────────────────────────────────
// Toast Container
// ─────────────────────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;

  const colors = {
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300',
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`flex items-start gap-3 rounded-lg shadow-lg border p-3 ${colors[toast.type]}`}
          >
            <div className={`flex h-5 w-5 items-center justify-center rounded-full flex-shrink-0 mt-0.5 ${
              toast.type === 'success' ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' :
              toast.type === 'error' ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' :
              'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
            }`}>
              {toast.type === 'success' ? <CheckCircle className="h-3 w-3" /> :
               toast.type === 'error' ? <AlertTriangle className="h-3 w-3" /> :
               <Info className="h-3 w-3" />}
            </div>
            <p className="text-xs flex-1">{toast.message}</p>
            <button onClick={() => onDismiss(toast.id)} className="text-current opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5">
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// File Upload Input (Drag & Drop)
// ─────────────────────────────────────────────────────────────

function DocumentUploadInput({
  file, onFileChange, onClear, label,
}: {
  file: File | null;
  onFileChange: (f: File | null) => void;
  onClear: () => void;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (f: File | null) => {
    if (!f) { onFileChange(null); return; }
    const isPdf = f.type === 'application/pdf';
    const isImage = f.type.startsWith('image/');
    if (!isPdf && !isImage) {
      alert('Veuillez sélectionner un fichier PDF ou une image.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      alert('Le fichier ne doit pas dépasser 10 Mo.');
      return;
    }
    onFileChange(f);
  };

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
        <FileUp className="h-3.5 w-3.5" />
        {label}
        <span className="normal-case font-normal text-slate-400 dark:text-slate-500">(optionnel)</span>
      </label>

      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer.files?.[0] ?? null);
          }}
          className={`w-full flex flex-col items-center gap-1.5 py-5 rounded-lg border-2 border-dashed transition-all duration-200 ${
            dragging
              ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/10 scale-[1.01]'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50/30 dark:hover:bg-primary-900/10'
          }`}
        >
          <motion.div
            animate={{ y: dragging ? -4 : 0 }}
            transition={{ duration: 0.2 }}
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
              dragging
                ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}
          >
            <Upload className="h-5 w-5" />
          </motion.div>
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {dragging ? 'Déposez le fichier ici' : 'Glissez-déposez ou cliquez'}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              PDF ou image · max 10 Mo
            </p>
          </div>
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gradient-to-r from-emerald-50 to-emerald-50/50 dark:from-emerald-950/30 dark:to-emerald-950/20 border border-emerald-200 dark:border-emerald-900"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-800 dark:text-white">{file.name}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>{(file.size / 1024).toFixed(1)} Ko</span>
              <span className="h-1 w-1 rounded-full bg-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Prêt à envoyer</span>
            </p>
          </div>
          <button
            onClick={onClear}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        hidden
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ✨ Action Modal améliorée
// ─────────────────────────────────────────────────────────────

function DemandeModal({
  demande, onClose, onSave, saving,
}: {
  demande: Demande;
  onClose: () => void;
  onSave: (statut: Statut, commentaires: string, fichier: File | null) => Promise<void>;
  saving: boolean;
}) {
  const [selectedStatut, setSelectedStatut] = useState<Statut>(demande.statut);
  const [commentaires, setCommentaires] = useState<string>('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const isDocRequired = requiresOfficialDocument(demande);
  const isValidee = selectedStatut === 'Validee';
  const isRejetee = selectedStatut === 'Rejetee';
  const docLabel = getDocumentLabel(demande);

  const currentDesign = STATUT_DESIGN[demande.statut];
  const newDesign = STATUT_DESIGN[selectedStatut];

  const handleSave = () => onSave(selectedStatut, commentaires, documentFile);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-white dark:bg-slate-900 w-full max-w-xl max-h-[92vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ─── HEADER avec gradient dynamique ─── */}
          <div className={`relative overflow-hidden bg-gradient-to-br ${newDesign.gradient} p-5 text-white`}>
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-white/10 blur-xl" />

            <div className="relative flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-[10px] font-semibold uppercase tracking-wider">
                    <Hash className="h-2.5 w-2.5" />
                    {demande.numero}
                  </span>
                  {demande.type_demande && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-[10px] font-semibold">
                      <FileText className="h-2.5 w-2.5" />
                      {demande.type_demande.libelle}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold tracking-tight line-clamp-2">
                  {demande.objet}
                </h2>
                <div className="flex items-center gap-3 mt-2 text-white/80 text-[11px] flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDateFr(demande.date_creation)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Actuel : <span className="font-semibold text-white">{formatStatutLabel(demande.statut)}</span>
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ─── BODY scrollable ─── */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4
            [&::-webkit-scrollbar]:w-1.5
            [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb]:bg-slate-200
            dark:[&::-webkit-scrollbar-thumb]:bg-slate-700">

            {/* Description */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <User className="h-3 w-3 text-slate-400" />
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Description
                </p>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {demande.description || "Aucune description fournie par l'étudiant."}
              </p>
            </div>

            {/* ─── Transition de statut ─── */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-2">
                <Sparkles className="h-3.5 w-3.5 text-primary-500" />
                Changer le statut
              </label>

              {/* Visual transition */}
              <AnimatePresence>
                {selectedStatut !== demande.statut && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-3 flex items-center justify-center gap-3 py-2.5 rounded-lg bg-gradient-to-r from-slate-50 to-slate-50/50 dark:from-slate-800/30 dark:to-slate-800/20 border border-slate-200 dark:border-slate-800 overflow-hidden"
                  >
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold ${currentDesign.bg} ${currentDesign.text} border ${currentDesign.border}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${currentDesign.dot}`} />
                      {formatStatutLabel(demande.statut)}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold ${newDesign.bg} ${newDesign.text} border ${newDesign.border}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${newDesign.dot}`} />
                      {formatStatutLabel(selectedStatut)}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick action buttons */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setSelectedStatut('Validee')}
                  className={`group relative overflow-hidden flex items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                    selectedStatut === 'Validee'
                      ? 'border-emerald-500 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30'
                      : 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:border-emerald-400'
                  }`}
                >
                  <CheckCircle className="h-4 w-4" />
                  Valider
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatut('Rejetee')}
                  className={`group relative overflow-hidden flex items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                    selectedStatut === 'Rejetee'
                      ? 'border-rose-500 bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/30'
                      : 'border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 hover:border-rose-400'
                  }`}
                >
                  <XCircle className="h-4 w-4" />
                  Rejeter
                </button>
              </div>

              {/* Full status selector */}
              <select
                value={selectedStatut}
                onChange={(e) => setSelectedStatut(e.target.value as Statut)}
                className={`w-full rounded-lg border-2 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium focus:outline-none transition-colors ${newDesign.border} ${newDesign.text}`}
              >
                {STATUT_OPTIONS.map((s) => (
                  <option key={s} value={s} className="text-slate-800 dark:text-white">
                    {formatStatutLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            {/* ─── Upload document officiel ─── */}
            <AnimatePresence>
              {isDocRequired && isValidee && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl border-2 border-primary-200 dark:border-primary-900 bg-gradient-to-br from-primary-50/50 to-primary-50/20 dark:from-primary-950/20 dark:to-primary-950/10 p-3.5 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 text-white shadow-sm flex-shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-white">
                          Joindre le {docLabel.toLowerCase()} à envoyer
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          L'étudiant pourra le télécharger depuis son espace
                        </p>
                      </div>
                    </div>
                    <DocumentUploadInput
                      file={documentFile}
                      onFileChange={setDocumentFile}
                      onClear={() => setDocumentFile(null)}
                      label={`${docLabel} officiel`}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── Commentaires ─── */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                Commentaires
                <span className="normal-case font-normal text-slate-400 dark:text-slate-500">
                  (optionnel)
                </span>
                {isRejetee && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-[9px] font-semibold normal-case">
                    <AlertCircle className="h-2.5 w-2.5" />
                    Recommandé
                  </span>
                )}
              </label>
              <div className="relative">
                <textarea
                  value={commentaires}
                  onChange={(e) => setCommentaires(e.target.value.slice(0, 500))}
                  rows={4}
                  placeholder={isRejetee ? "Expliquez le motif du rejet à l'étudiant..." : 'Ajouter une note ou un motif...'}
                  className={`w-full rounded-lg border-2 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none transition-colors resize-none ${
                    isRejetee
                      ? 'border-rose-200 dark:border-rose-900 focus:border-rose-400'
                      : 'border-slate-200 dark:border-slate-700 focus:border-primary-400'
                  }`}
                />
                <div className="absolute bottom-2 right-2 text-[9px] text-slate-400 tabular-nums">
                  {commentaires.length}/500
                </div>
              </div>
            </div>
          </div>

          {/* ─── FOOTER ─── */}
          <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white rounded-lg shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.98] bg-gradient-to-r ${newDesign.gradient}`}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Traitement...
                </>
              ) : isDocRequired && isValidee && documentFile ? (
                <>
                  <Upload className="h-4 w-4" />
                  Valider et envoyer
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Confirmer
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────

export default function ValidationDemandes() {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statutFilter, setStatutFilter] = useState<string>('');

  const [selectedDemande, setSelectedDemande] = useState<Demande | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

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

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const fetchDemandes = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (statutFilter) params.set('statut', statutFilter);

        const url = `${API_BASE}/demandes${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await fetch(url, { signal });

        if (!response.ok) throw new Error(`Erreur serveur (code ${response.status})`);

        const json: ApiListResponse = await response.json();
        if (!json.success) throw new Error('La requête a échoué côté serveur.');

        setDemandes(json.data);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const message = err instanceof Error
          ? err.message
          : 'Impossible de contacter le serveur. Vérifiez que le backend est démarré.';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, statutFilter]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchDemandes(controller.signal);
    return () => controller.abort();
  }, [fetchDemandes]);

  const handleSaveStatus = async (statut: Statut, commentaires: string, fichier: File | null) => {
    if (!selectedDemande) return;

    setSaving(true);

    try {
      let response: Response;

      if (fichier) {
        const formData = new FormData();
        formData.append('statut', statut);
        if (commentaires) formData.append('commentaires', commentaires);
        formData.append('document', fichier);

        response = await fetch(`${API_BASE}/demandes/${selectedDemande.id_demande}/status`, {
          method: 'PATCH',
          body: formData,
        });
      } else {
        response = await fetch(`${API_BASE}/demandes/${selectedDemande.id_demande}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            statut,
            commentaires: commentaires || undefined,
          }),
        });
      }

      const json: ApiUpdateResponse = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || `Erreur serveur (code ${response.status})`);
      }

      pushToast('success', json.message || 'Statut mis à jour avec succès.');
      setSelectedDemande(null);

      await fetchDemandes();
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : "Une erreur est survenue lors de la mise à jour du statut.";
      pushToast('error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadDocument = async (id_demande: string) => {
    setDownloadingPdfId(id_demande);
    try {
      let response = await fetch(`${API_BASE}/demandes/${id_demande}/document`);
      if (!response.ok || response.status === 404) {
        response = await fetch(`${API_BASE}/demandes/${id_demande}/pdf`);
      }

      if (!response.ok) {
        let message = `Erreur serveur (code ${response.status})`;
        try {
          const errJson = await response.json();
          if (errJson?.message) message = errJson.message;
        } catch {}
        throw new Error(message);
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `Document_${id_demande}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : "Erreur lors du téléchargement.");
    } finally {
      setDownloadingPdfId(null);
    }
  };

  return (
    <div className="sc-portal min-h-screen p-5 md:p-6 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        <header className="mb-5">
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            Validation des Demandes Administratives
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Consultez, filtrez et traitez les demandes soumises par les étudiants.
          </p>
        </header>

        <div className="card p-3 mb-5 flex flex-col md:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher par numéro ou objet..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark text-slate-800 dark:text-white placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            />
          </div>

          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value)}
            className="md:w-48 px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 bg-card dark:bg-card-dark text-slate-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          >
            <option value="">Tous les statuts</option>
            {STATUT_OPTIONS.map((s) => (
              <option key={s} value={s}>{formatStatutLabel(s)}</option>
            ))}
          </select>
        </div>

        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5 mb-5 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 mx-auto mb-2">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="text-xs font-medium text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/70 dark:divide-slate-800">
              <thead className="bg-surface dark:bg-surface-dark/50">
                <tr>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Numéro</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Objet</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Statut</th>
                  <th className="px-5 py-2.5 text-right text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-5 py-3">
                          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" style={{ width: `${40 + Math.random() * 40}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : demandes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                      Aucune demande ne correspond aux critères sélectionnés.
                    </td>
                  </tr>
                ) : (
                  demandes.map((demande) => {
                    const isDocReq = requiresOfficialDocument(demande);
                    return (
                      <tr key={demande.id_demande} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-5 py-2.5 whitespace-nowrap text-xs font-medium text-slate-800 dark:text-white tabular-nums">
                          {demande.numero}
                        </td>
                        <td className="px-5 py-2.5 text-xs text-slate-600 dark:text-slate-300">
                          {isDocReq ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300">
                              <FileText className="h-2.5 w-2.5" />
                              {getDocumentLabel(demande)}
                            </span>
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400">
                              {demande.type_demande?.libelle || '—'}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate">
                          {demande.objet}
                        </td>
                        <td className="px-5 py-2.5 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {formatDateFr(demande.date_creation)}
                        </td>
                        <td className="px-5 py-2.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatutBadgeClasses(demande.statut)}`}>
                            {formatStatutLabel(demande.statut)}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              onClick={() => setSelectedDemande(demande)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md transition-colors"
                            >
                              {demande.statut === 'Soumise' || demande.statut === 'En_Traitement' ? (
                                <><CheckCircle className="h-3.5 w-3.5" />Traiter</>
                              ) : (
                                <><Eye className="h-3.5 w-3.5" />Voir</>
                              )}
                            </button>

                            {(demande.statut === 'Validee' || demande.statut === 'Cloturee') && (
                              <button
                                onClick={() => handleDownloadDocument(demande.id_demande)}
                                disabled={downloadingPdfId === demande.id_demande}
                                title="Télécharger le document"
                                aria-label="Télécharger le document"
                                className="inline-flex items-center justify-center p-1.5 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md transition-colors disabled:opacity-50"
                              >
                                {downloadingPdfId === demande.id_demande ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Download className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedDemande && (
        <DemandeModal
          demande={selectedDemande}
          onClose={() => setSelectedDemande(null)}
          onSave={handleSaveStatus}
          saving={saving}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}