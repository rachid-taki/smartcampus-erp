import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, CheckCircle, XCircle, Eye, X, Loader2, AlertTriangle, Clock,
  Download, FileText, Upload, FileUp, Info, Calendar, Hash, User,
  ArrowRight, Sparkles, AlertCircle, Mail, Phone, BookOpen, CheckSquare,
  Filter, History, Inbox, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Statut = 'Brouillon' | 'Soumise' | 'En_Traitement' | 'Validee' | 'Rejetee' | 'Cloturee';

interface Etudiant {
  cne: string;
  utilisateur: {
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
  };
  filiere: {
    nom: string;
    code: string;
  };
}

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
  etudiant?: Etudiant;
}

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

const API_BASE = 'http://localhost:3000/api/scolarite';

const STATUT_DESIGN: Record<Statut, {
  bg: string;
  text: string;
  border: string;
  dot: string;
  gradient: string;
  label: string;
}> = {
  Brouillon: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-600',
    dot: 'bg-slate-400',
    gradient: 'from-slate-600 to-slate-700',
    label: 'Brouillon'
  },
  Soumise: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-700/60',
    dot: 'bg-blue-500',
    gradient: 'from-blue-600 to-indigo-600',
    label: 'Nouvelle (Soumise)'
  },
  En_Traitement: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-700/60',
    dot: 'bg-amber-500',
    gradient: 'from-amber-500 to-orange-600',
    label: 'En Traitement'
  },
  Validee: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-700/60',
    dot: 'bg-emerald-500',
    gradient: 'from-emerald-500 to-teal-600',
    label: 'Validée (Prête)'
  },
  Rejetee: {
    bg: 'bg-rose-50 dark:bg-rose-900/30',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-700/60',
    dot: 'bg-rose-500',
    gradient: 'from-rose-500 to-red-600',
    label: 'Rejetée'
  },
  Cloturee: {
    bg: 'bg-purple-50 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-700/60',
    dot: 'bg-purple-500',
    gradient: 'from-purple-600 to-indigo-700',
    label: 'Servée / Clôturée'
  },
};

const formatDateTimeFr = (isoDate: string): string => {
  try {
    return new Date(isoDate).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(',', ' à');
  } catch {
    return isoDate;
  }
};

const DOCUMENT_OFFICIAL_CODES = ['ATTESTATION_SCOLARITE', 'RELEVE_NOTES', 'ATTESTATION', 'RELEVE'];

const requiresOfficialDocument = (demande: Demande): boolean => {
  const code = demande.type_demande?.code?.toUpperCase() || '';
  const libelle = demande.type_demande?.libelle?.toLowerCase() || '';
  return DOCUMENT_OFFICIAL_CODES.some((c) => code.includes(c)) ||
         libelle.includes('attestation') || libelle.includes('relevé') || libelle.includes('releve');
};

const getDocumentLabel = (demande: Demande): string => {
  const libelle = demande.type_demande?.libelle?.toLowerCase() || '';
  return (libelle.includes('relevé') || libelle.includes('releve')) ? 'Relevé de notes' : 'Attestation';
};

function DocumentUploadInput({
  file,
  onFileChange,
  onClear,
  label
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
    if (f.size > 10 * 1024 * 1024) { alert('Le fichier ne doit pas dépasser 10 Mo.'); return; }
    onFileChange(f);
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
        <FileUp className="h-3.5 w-3.5 text-indigo-500" /> {label} <span className="normal-case font-normal text-slate-400 dark:text-slate-500">(optionnel)</span>
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
          className={`w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed transition-all duration-200 ${
            dragging
              ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 scale-[1.01]'
              : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-100/60 dark:hover:bg-slate-800/80'
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            <Upload className="h-5 w-5" />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Glissez-déposez le PDF ou cliquez pour sélectionner</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Format PDF ou image · Max 10 Mo</p>
          </div>
        </button>
      ) : (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm flex-shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-bold text-slate-800 dark:text-white">{file.name}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{(file.size / 1024).toFixed(1)} Ko · Prêt à être joint</p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
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

function DemandeModal({
  demande,
  onClose,
  onSave,
  saving
}: {
  demande: Demande;
  onClose: () => void;
  onSave: (statut: Statut, commentaires: string, fichier: File | null) => Promise<void>;
  saving: boolean;
}) {
  const [selectedStatut, setSelectedStatut] = useState<Statut>(demande.statut);
  const [commentaires, setCommentaires] = useState<string>('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [sendEmail, setSendEmail] = useState<boolean>(true); // Coché par défaut
  const [collectBureau, setCollectBureau] = useState<boolean>(false);

  const isDocRequired = requiresOfficialDocument(demande);
  const newDesign = STATUT_DESIGN[selectedStatut];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Gradient */}
          <div className={`relative overflow-hidden bg-gradient-to-br ${newDesign.gradient} p-5 text-white shadow-md`}>
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-[11px] font-mono font-bold tracking-wide">
                    #{demande.numero}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-[11px] font-medium">
                    {demande.type_demande?.libelle || 'Demande administrative'}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold leading-snug line-clamp-2">{demande.objet}</h2>
                <div className="flex items-center flex-wrap gap-1.5 text-white/90 text-xs mt-2 font-medium">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0 text-white/80" />
                  <span>Dépôt le :</span>
                  <span className="font-semibold text-white bg-white/10 px-2 py-0.5 rounded-md backdrop-blur-sm whitespace-nowrap">
                    {formatDateTimeFr(demande.date_creation)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Corps de la Modale */}
          <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5 scrollbar-thin">
            {/* Carte Étudiant */}
            {demande.etudiant && (
              <div className="bg-slate-50 dark:bg-slate-800/70 rounded-xl p-4 border border-slate-200 dark:border-slate-700/80">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-indigo-500" /> Informations Demandeur
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Nom & Prénom</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">
                      {demande.etudiant.utilisateur.nom} {demande.etudiant.utilisateur.prenom}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Code CNE</p>
                    <p className="text-sm font-mono font-bold text-slate-800 dark:text-white mt-0.5">
                      {demande.etudiant.cne}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Filière / Programme</p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-0.5 flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
                      {demande.etudiant.filiere?.nom} {demande.etudiant.filiere?.code ? `(${demande.etudiant.filiere.code})` : ''}
                    </p>
                  </div>
                  <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300">
                      <Mail className="h-3.5 w-3.5 text-slate-400" /> {demande.etudiant.utilisateur.email}
                    </span>
                    {demande.etudiant.utilisateur.telephone && (
                      <span className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300">
                        <Phone className="h-3.5 w-3.5 text-slate-400" /> {demande.etudiant.utilisateur.telephone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Description de la demande */}
            <div>
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Motif & Description de la Demande
              </h3>
              <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 leading-relaxed whitespace-pre-wrap">
                {demande.description || "Aucune précision complémentaire fournie par l'étudiant."}
              </div>
            </div>

            {/* Décision Administrative (Affiché uniquement si la demande n'est pas déjà servée) */}
            {demande.statut !== 'Cloturee' && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Mettre à jour le Statut
                </h3>

                {demande.statut === 'Validee' ? (
                  <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 p-4 rounded-xl">
                    <p className="text-xs text-indigo-900 dark:text-indigo-200 font-semibold mb-3">
                      Cette demande a été validée. L'étudiant s'est-il présenté pour récupérer son document ou a-t-il été notifié ?
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedStatut('Cloturee')}
                      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs border-2 transition-all ${
                        selectedStatut === 'Cloturee'
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                          : 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800 hover:border-indigo-500'
                      }`}
                    >
                      <CheckSquare className="h-4 w-4" /> Marquer comme Servée (Archiver vers l'Historique)
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedStatut('En_Traitement')}
                      className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                        selectedStatut === 'En_Traitement'
                          ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/20'
                          : 'border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/20 hover:border-amber-400'
                      }`}
                    >
                      En Traitement
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStatut('Validee')}
                      className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                        selectedStatut === 'Validee'
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/20'
                          : 'border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20 hover:border-emerald-400'
                      }`}
                    >
                      Valider
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStatut('Rejetee')}
                      className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                        selectedStatut === 'Rejetee'
                          ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-600/20'
                          : 'border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 bg-rose-50/60 dark:bg-rose-950/20 hover:border-rose-400'
                      }`}
                    >
                      Rejeter
                    </button>
                  </div>
                )}

                {/* Avertissement point de non-retour si Servée */}
                <AnimatePresence>
                  {selectedStatut === 'Cloturee' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
                        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                          <strong>Action irréversible :</strong> En confirmant, la demande sera définitivement archivée dans l'historique. Vous ne pourrez plus modifier son statut, ses documents ni ses commentaires. Vérifiez bien les informations avant de procéder.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Upload Document Officiel */}
                {isDocRequired && selectedStatut === 'Validee' && (
                  <div className="mt-4">
                    <DocumentUploadInput
                      file={documentFile}
                      onFileChange={setDocumentFile}
                      onClear={() => setDocumentFile(null)}
                      label={`${getDocumentLabel(demande)} officiel`}
                    />
                  </div>
                )}

                {/* --- NOUVEAU BLOC : MODE DE DÉLIVRANCE --- */}
                {selectedStatut === 'Validee' && (
                  <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                      Mode de délivrance & Notification
                    </h4>
                    <div className="space-y-2.5">
                      <label className="flex items-center gap-2.5 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={sendEmail} 
                          onChange={(e) => setSendEmail(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-900 dark:border-slate-600"
                        />
                        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">
                          <Mail className="h-3.5 w-3.5" /> Envoyer par E-mail à l'étudiant
                        </span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={collectBureau} 
                          onChange={(e) => setCollectBureau(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-900 dark:border-slate-600"
                        />
                        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">
                          <Building2 className="h-3.5 w-3.5" /> Notifier pour retrait physique au bureau
                        </span>
                      </label>
                    </div>
                  </div>
                )}
                {/* --- FIN NOUVEAU BLOC --- */}

                {/* Champ Commentaire */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                    Commentaire / Motif <span className="normal-case font-normal text-slate-400 dark:text-slate-500">(visible lors du traitement)</span>
                  </label>
                  <textarea
                    value={commentaires}
                    onChange={(e) => setCommentaires(e.target.value)}
                    rows={3}
                    placeholder={selectedStatut === 'Rejetee' ? "Précisez obligatoirement la raison du rejet..." : "Ajouter une remarque interne ou instructions pour l'étudiant..."}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-3 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Modale */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
            {/* FIXED: The Cancel button now just closes the modal */}
            <button
              type="button"
              onClick={onClose} 
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Annuler
            </button>
            
            {/* FIXED: The Save button now passes sendEmail and collectBureau */}
            <button
              type="button"
              onClick={() => onSave(selectedStatut, commentaires, documentFile, sendEmail, collectBureau)}
              disabled={saving || selectedStatut === demande.statut}
              className={`inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedStatut === 'Cloturee' 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700' 
                  : `bg-gradient-to-r ${newDesign.gradient}`
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...
                </>
              ) : selectedStatut === 'Cloturee' ? (
                <>
                  <CheckSquare className="h-4 w-4" /> Confirmer & Archiver définitivement
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" /> Enregistrer le Changement
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function ValidationDemandes() {
  const [activeTab, setActiveTab] = useState<'actives' | 'historique'>('actives');
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDemande, setSelectedDemande] = useState<Demande | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

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

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const fetchDemandes = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${API_BASE}/demandes?tab=${activeTab}${debouncedSearch ? `&search=${debouncedSearch}` : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setDemandes(json.data);
    } catch (err) {
      pushToast('error', 'Erreur de chargement des demandes.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch, pushToast]);

  useEffect(() => {
    fetchDemandes();
  }, [fetchDemandes]);

  // On ajoute sendEmail et collectBureau aux paramètres
  const handleSaveStatus = async (
    statut: Statut, 
    commentaires: string, 
    fichier: File | null, 
    sendEmail?: boolean, 
    collectBureau?: boolean
  ) => {
    if (!selectedDemande) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('statut', statut);
      if (commentaires) formData.append('commentaires', commentaires);
      if (fichier) formData.append('document', fichier);
      
      // Ajout des options de notification
      if (sendEmail !== undefined) formData.append('sendEmail', String(sendEmail));
      if (collectBureau !== undefined) formData.append('collectBureau', String(collectBureau));

      const res = await fetch(`${API_BASE}/demandes/${selectedDemande.id_demande}/status`, {
        method: 'PATCH',
        body: formData, // On utilise formData dans tous les cas pour supporter ces nouveaux champs
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.message || 'Erreur lors de la mise à jour.');

      pushToast('success', json.message || 'Statut mis à jour.');
      setSelectedDemande(null);
      fetchDemandes();
    } catch (err: any) {
      pushToast('error', err.message || 'Échec de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadDocument = async (id_demande: string) => {
    setDownloadingPdfId(id_demande);
    try {
      const response = await fetch(`${API_BASE}/demandes/${id_demande}/document`);
      if (!response.ok) throw new Error('Document introuvable.');

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `Document_${id_demande}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (err: any) {
      pushToast('error', err.message || 'Erreur de téléchargement.');
    } finally {
      setDownloadingPdfId(null);
    }
  };

  return (
    <div className="min-h-screen p-5 md:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Guichet Scolarité & Demandes
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Traitement administratif, validation et traçabilité des demandes étudiantes.
          </p>
        </div>
      </header>

      {/* Onglets Actifs vs Historique */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('actives')}
          className={`flex items-center gap-2 py-3 px-6 text-xs md:text-sm font-bold border-b-2 transition-all ${
            activeTab === 'actives'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Inbox className="h-4 w-4" /> Demandes en Cours
        </button>
        <button
          onClick={() => setActiveTab('historique')}
          className={`flex items-center gap-2 py-3 px-6 text-xs md:text-sm font-bold border-b-2 transition-all ${
            activeTab === 'historique'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <History className="h-4 w-4" /> Historique & Servées
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Rechercher par étudiant (nom, prénom), CNE ou numéro..."
            className="w-full pl-9 pr-3 py-2 text-xs md:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Tableau des Demandes */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">Demandeur</th>
                <th className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">Demande</th>
                <th className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">Date & Heure de Dépôt</th>
                {/* Condition : on cache le statut dans l'historique */}
                {activeTab === 'actives' && (
                  <th className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">Statut</th>
                )}
                <th className="px-5 py-3.5 text-right font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">
                  {activeTab === 'actives' ? 'Action' : 'Document'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Loader2 className="h-7 w-7 animate-spin mx-auto text-indigo-500" />
                    <p className="text-xs text-slate-400 mt-2">Chargement des demandes...</p>
                  </td>
                </tr>
              ) : demandes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
                    Aucune demande correspondante dans cet onglet.
                  </td>
                </tr>
              ) : (
                demandes.map((d) => {
                  const design = STATUT_DESIGN[d.statut];
                  return (
                    <tr key={d.id_demande} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {d.etudiant ? `${d.etudiant.utilisateur.nom} ${d.etudiant.utilisateur.prenom}` : 'Étudiant Inconnu'}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                          {d.etudiant?.cne} · {d.etudiant?.filiere?.code || 'Sans Filière'}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[240px]" title={d.objet}>
                          {d.objet}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {d.type_demande?.libelle || `#${d.numero}`}
                        </p>
                      </td>
                      {/* Structure de date scindée sur deux lignes */}
                      <td className="px-5 py-3.5">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {new Date(d.date_creation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                          à {new Date(d.date_creation).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      
                      {/* Badge statut uniquement si Actif */}
                      {activeTab === 'actives' && (
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${design.bg} ${design.text} ${design.border}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${design.dot}`} />
                            {design.label}
                          </span>
                        </td>
                      )}
                      
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">

                          {/* Le téléchargement du document reste possible pour l'Historique (si pertinent) */}
                          {(d.statut === 'Validee' || d.statut === 'Cloturee') && (
                            <button
                              onClick={() => handleDownloadDocument(d.id_demande)}
                              disabled={downloadingPdfId === d.id_demande}
                              title="Télécharger le document officiel"
                              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
                            >
                              {downloadingPdfId === d.id_demande ? (
                                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </button>
                          )}


                          {/* Bouton Traiter caché dans l'historique */}
                          {activeTab === 'actives' && (
                            <button
                              onClick={() => setSelectedDemande(d)}
                              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                            >
                              Traiter
                            </button>
                          )}
              
                          
                          {/* Message si pas de document dans l'historique */}
                          {activeTab === 'historique' && d.statut === 'Rejetee' && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">—</span>
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

      {/* Modal d'Action */}
      {selectedDemande && (
        <DemandeModal
          demande={selectedDemande}
          onClose={() => setSelectedDemande(null)}
          onSave={handleSaveStatus}
          saving={saving}
        />
      )}

      {/* Système de Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 w-full max-w-sm">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className={`flex items-start gap-3 p-3.5 rounded-xl border shadow-xl ${
                toast.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              )}
              <p className="text-xs font-semibold flex-1 mt-0.5">{toast.message}</p>
              <button onClick={() => dismissToast(toast.id)} className="opacity-60 hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}