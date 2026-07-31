import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../../student/common/Icon';
import type { QuickAction } from '../../../types';

const quickActions: QuickAction[] = [
  { id: 'qa-1', label: 'Nouvelle Demande', icon: 'FilePlus2', to: '/demandes/nouvelle' },
  { id: 'qa-2', label: 'Déposer un document', icon: 'Upload', to: '/documents' },
  { id: 'qa-3', label: 'Télécharger Attestation', icon: 'Download', to: '/documents' },
  { id: 'qa-4', label: 'Réclamation', icon: 'MessageSquareWarning', to: '/demandes/nouvelle' },
  { id: 'qa-5', label: 'Prendre rendez-vous', icon: 'CalendarDays', to: '/calendrier' },
];

export default function QuickActions() {
  return (
    <div className="card p-5">
      <h3 className="mb-4 text-[14px] font-bold text-slate-800 dark:text-slate-100">
        Actions rapides
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {quickActions.map((action, i) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.04 }}
          >
            <Link
              to={action.to}
              className="group relative flex flex-col items-center justify-center gap-2.5 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-5 text-center transition-all duration-200 hover:-translate-y-1 hover:border-primary-200 hover:shadow-softHover dark:border-slate-800 dark:bg-slate-800/40"
            >
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-600/0 via-primary-600/0 to-primary-600/0 opacity-0 transition-opacity duration-300 group-hover:from-primary-50 group-hover:via-transparent group-hover:to-transparent group-hover:opacity-100 dark:group-hover:from-primary-500/10" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm ring-1 ring-slate-100 transition-all duration-200 group-hover:scale-110 group-hover:bg-primary-600 group-hover:text-white group-hover:ring-primary-600 dark:bg-slate-900 dark:text-primary-400 dark:ring-slate-700">
                <Icon name={action.icon} className="h-[18px] w-[18px]" strokeWidth={2} />
              </div>
              <span className="relative text-[12px] font-medium leading-tight text-slate-600 transition-colors group-hover:text-primary-700 dark:text-slate-300 dark:group-hover:text-primary-300">
                {action.label}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
