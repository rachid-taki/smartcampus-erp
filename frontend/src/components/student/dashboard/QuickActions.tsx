import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, Download, FilePlus2, FolderOpen, Loader2, Route } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { downloadDocument, getLatestAttestation } from '../../../services/student.service';

interface QuickActionItem { id: string; label: string; desc: string; icon: LucideIcon; to?: string; tile: string; }

const quickActions: QuickActionItem[] = [
  { id: 'qa-1', label: 'Nouvelle demande', desc: 'Créer une démarche', icon: FilePlus2, to: '/student/requests?new=1', tile: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
  { id: 'qa-2', label: 'Mes documents', desc: 'Voir mes fichiers', icon: FolderOpen, to: '/student/documents', tile: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
  { id: 'qa-3', label: 'Attestation', desc: 'Télécharger la dernière', icon: Download, tile: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400' },
  { id: 'qa-4', label: 'Suivi des demandes', desc: 'Avancement en direct', icon: Route, to: '/student/workflow', tile: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
  { id: 'qa-5', label: 'Notifications', desc: 'Rester informé', icon: Bell, to: '/student/notifications', tile: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' },
];

export default function QuickActions() {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);

  const handleDownloadAttestation = async () => {
    try {
      setDownloading(true);
      const att: any = await getLatestAttestation();
      if (!att || !att.exists) { navigate('/student/documents'); return; }
      const res: any = await downloadDocument(att.id);
      const blob: Blob = res instanceof Blob ? res : res.data instanceof Blob ? res.data : new Blob([res.data ?? res]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = att.nom || 'attestation.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      navigate('/student/documents');
    } finally { setDownloading(false); }
  };

  const handleClick = (action: QuickActionItem) => {
    if (action.id === 'qa-3') handleDownloadAttestation();
    else if (action.to) navigate(action.to);
  };

  return (
    <div className="card p-5">
      <h3 className="mb-4 text-[13px] font-bold text-slate-800 dark:text-slate-100">Actions rapides</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {quickActions.map((action, i) => {
          const ItemIcon = action.icon;
          return (
            <motion.div key={action.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.04 }}>
              <button type="button" onClick={() => handleClick(action)} disabled={action.id === 'qa-3' && downloading} className="group relative flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50 px-3 py-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-soft-hover dark:border-slate-800 dark:from-slate-900 dark:to-slate-800/50 disabled:cursor-not-allowed disabled:opacity-60">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg shadow-sm transition-all duration-200 group-hover:scale-110 ${action.tile}`}>
                  {action.id === 'qa-3' && downloading ? <Loader2 size={17} className="animate-spin" /> : <ItemIcon size={17} />}
                </div>
                <span className="text-[11.5px] font-semibold leading-tight text-slate-700 transition-colors group-hover:text-primary-700 dark:text-slate-300 dark:group-hover:text-primary-300">{action.label}</span>
                <span className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">{action.desc}</span>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}