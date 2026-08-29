import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Users, Mail, Paperclip, X, File, AlertTriangle, CheckCircle, 
  Search, Loader2, Image as ImageIcon, FileText, FileArchive
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface Utilisateur {
  id_utilisateur: string;
  nom: string;
  prenom: string;
  email: string;
}

interface Employe {
  id_employe: string;
  departement: string;
  fonction: string;
  utilisateur: Utilisateur;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const API_BASE = 'http://localhost:3000/api/rh';

// ─────────────────────────────────────────────────────────────
// Composant Principal
// ─────────────────────────────────────────────────────────────

export default function RhMessagerie() {
  // États de données
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [loadingEmployes, setLoadingEmployes] = useState(true);
  
  // États du formulaire
  const [targetType, setTargetType] = useState<'ALL' | 'SPECIFIC'>('ALL');
  const [selectedEmployes, setSelectedEmployes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  
  // États de l'UI
  const [sending, setSending] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Système de notifications (Toasts)
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((type: Toast['type'], message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  // ── Chargement des employés au montage ──
  useEffect(() => {
    const fetchEmployes = async () => {
      try {
        const response = await fetch(`${API_BASE}/employes`);
        const json = await response.json();
        if (json.success && json.data) {
          // Filtrer uniquement les employés actifs et ayant un email
          const validEmployes = json.data.filter((e: Employe) => e.utilisateur?.email);
          setEmployes(validEmployes);
        }
      } catch (err) {
        pushToast('error', 'Erreur lors du chargement des employés.');
      } finally {
        setLoadingEmployes(false);
      }
    };
    fetchEmployes();
  }, [pushToast]);

  // ── Gestion des Destinataires ──
  const toggleEmploye = (id: string) => {
    const newSet = new Set(selectedEmployes);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedEmployes(newSet);
  };

  const filteredEmployes = employes.filter(emp => {
    const searchStr = `${emp.utilisateur.prenom} ${emp.utilisateur.nom} ${emp.departement}`.toLowerCase();
    return searchStr.includes(searchQuery.toLowerCase());
  });

  // ── Gestion des Pièces Jointes ──
  const handleFiles = (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(file => {
      if (file.size > 15 * 1024 * 1024) {
        pushToast('error', `Le fichier ${file.name} dépasse 15 Mo.`);
        return false;
      }
      return true;
    });

    if (attachments.length + validFiles.length > 5) {
      pushToast('error', 'Vous ne pouvez pas envoyer plus de 5 fichiers.');
      return;
    }

    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon className="h-4 w-4 text-blue-500" />;
    if (type.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
    if (type.includes('zip') || type.includes('rar')) return <FileArchive className="h-4 w-4 text-amber-500" />;
    return <File className="h-4 w-4 text-slate-500" />;
  };

  // ── Soumission du Formulaire ──
  const handleSendMessage = async () => {
    if (!subject.trim()) return pushToast('error', 'Veuillez définir un sujet.');
    if (!messageBody.trim()) return pushToast('error', 'Le corps du message est vide.');
    if (targetType === 'SPECIFIC' && selectedEmployes.size === 0) {
      return pushToast('error', 'Veuillez sélectionner au moins un destinataire.');
    }

    setSending(true);

    try {
      const formData = new FormData();
      
      // 1. Destinataires
      if (targetType === 'ALL') {
        formData.append('target', 'ALL');
      } else {
        formData.append('target', JSON.stringify(Array.from(selectedEmployes)));
      }

      // 2. Sujet et Message (Conversion des retours à la ligne en balises <br/> pour le HTML)
      formData.append('subject', subject);
      const formattedHtmlBody = messageBody.replace(/\n/g, '<br/>');
      formData.append('messageBody', formattedHtmlBody);

      // 3. Fichiers
      attachments.forEach(file => {
        formData.append('attachments', file);
      });

      const token = localStorage.getItem('token');
      
      // Attention : Ne pas définir 'Content-Type' lors de l'utilisation de FormData !
      const response = await fetch(`${API_BASE}/communications/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Erreur serveur.');
      }

      pushToast('success', data.message || 'Message envoyé avec succès !');
      
      // Réinitialiser le formulaire
      setSubject('');
      setMessageBody('');
      setAttachments([]);
      setSelectedEmployes(new Set());
      setTargetType('ALL');

    } catch (err: any) {
      pushToast('error', err.message || 'Échec de l\'envoi du message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="sc-portal min-h-screen p-6 md:p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
            <Send className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">Messagerie RH</h1>
            <p className="text-sm text-slate-500 mt-0.5">Communiquez directement avec les employés (Email + Notification).</p>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* ───────────────────────────────────────────────────────────── */}
          {/* COLONNE GAUCHE : COMPOSITION DU MESSAGE */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="flex-1 space-y-6">
            <div className="card p-6 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-5">
              
              {/* Sujet */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Sujet de l'email <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex: Convocation, Information importante..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              {/* Corps du message */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                  <span>Message <span className="text-red-500">*</span></span>
                  <span className="text-xs font-normal text-slate-400">Le modèle visuel SmartCampus sera appliqué automatiquement.</span>
                </label>
                <textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  rows={10}
                  placeholder="Rédigez votre message ici..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-y"
                />
              </div>

              {/* Pièces jointes (Drag & Drop) */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Pièces jointes <span className="text-xs font-normal text-slate-400">(Max 5 fichiers, 15Mo/fichier)</span>
                </label>
                
                <div 
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    dragActive 
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                      : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Paperclip className={`h-8 w-8 mx-auto mb-2 ${dragActive ? 'text-indigo-500' : 'text-slate-400'}`} />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Cliquez pour ajouter ou glissez-déposez vos fichiers ici
                  </p>
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    multiple 
                    className="hidden" 
                    onChange={(e) => { if(e.target.files) handleFiles(e.target.files); e.target.value = ''; }} 
                  />
                </div>

                {/* Liste des fichiers attachés */}
                {attachments.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                        <div className="flex items-center gap-2 overflow-hidden">
                          {getFileIcon(file.type)}
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                            {file.name}
                          </span>
                        </div>
                        <button onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500 p-1">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Bouton d'envoi */}
            <div className="flex justify-end">
              <button
                onClick={handleSendMessage}
                disabled={sending}
                className="flex items-center gap-2 px-8 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all disabled:opacity-70"
              >
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                Envoyer le message
              </button>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* COLONNE DROITE : SÉLECTION DES DESTINATAIRES */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="w-full lg:w-96 flex flex-col gap-4">
            
            <div className="card p-5 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm bg-white dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                <Users className="h-4 w-4 text-indigo-500" />
                Destinataires
              </h3>

              <div className="space-y-3">
                <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${targetType === 'ALL' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                  <input type="radio" checked={targetType === 'ALL'} onChange={() => setTargetType('ALL')} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">Tous les employés</p>
                    <p className="text-xs text-slate-500 mt-0.5">{employes.length} destinataires valides</p>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${targetType === 'SPECIFIC' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                  <input type="radio" checked={targetType === 'SPECIFIC'} onChange={() => setTargetType('SPECIFIC')} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">Sélection personnalisée</p>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedEmployes.size} sélectionné(s)</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Liste de sélection affichée uniquement si 'SPECIFIC' est coché */}
            {targetType === 'SPECIFIC' && (
              <div className="card p-0 flex flex-col border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm bg-white dark:bg-slate-900 h-[500px]">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Rechercher un employé..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                  {loadingEmployes ? (
                    <div className="flex justify-center items-center h-full text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : filteredEmployes.length === 0 ? (
                    <div className="text-center p-6 text-sm text-slate-500">Aucun employé trouvé.</div>
                  ) : (
                    filteredEmployes.map((emp) => {
                      const isSelected = selectedEmployes.has(emp.id_employe);
                      return (
                        <div 
                          key={emp.id_employe}
                          onClick={() => toggleEmploye(emp.id_employe)}
                          className={`flex items-center justify-between p-3 mb-1 rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                              {emp.utilisateur.prenom[0]}{emp.utilisateur.nom[0]}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800 dark:text-white">
                                {emp.utilisateur.prenom} {emp.utilisateur.nom}
                              </p>
                              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {emp.utilisateur.email}
                              </p>
                            </div>
                          </div>
                          <div className={`flex h-5 w-5 items-center justify-center rounded border ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                            {isSelected && <CheckCircle className="h-3 w-3" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Rendu des Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
        {toasts.map((toast) => (
          <div key={toast.id} className={`flex items-center gap-3 rounded-lg shadow-lg border p-4 animate-fade-in ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800/50 dark:text-green-400' : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800/50 dark:text-red-400'}`}>
            {toast.type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertTriangle className="h-5 w-5 flex-shrink-0" />}
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button onClick={() => setToasts(t => t.filter(x => x.id !== toast.id))}><X className="h-4 w-4 opacity-50 hover:opacity-100" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}