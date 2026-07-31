import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye } from 'lucide-react';
import type { RequestStatus, StudentRequest } from '../../../types';
import { formatDate, statusStyles } from '../../../utils/format';

interface RecentRequestsTableProps {
  requests: StudentRequest[];
}

const FILTERS: Array<{ label: string; value: RequestStatus | 'Tous' }> = [
  { label: 'Tous', value: 'Tous' },
  { label: 'En attente', value: 'En attente' },
  { label: 'En cours', value: 'En cours' },
  { label: 'Validées', value: 'Validée' },
];

export default function RecentRequestsTable({ requests }: RecentRequestsTableProps) {
  const [filter, setFilter] = useState<RequestStatus | 'Tous'>('Tous');

  const filtered = useMemo(
    () => (filter === 'Tous' ? requests : requests.filter((r) => r.status === filter)),
    [requests, filter],
  );

  return (
    <div className="card">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">
          Demandes récentes
        </h3>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-slate-50 p-1 dark:bg-slate-800/60">
            {FILTERS.slice(0, 4).map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`relative rounded-md px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors ${
                  filter === f.value
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                {filter === f.value && (
                  <motion.span
                    layoutId="request-filter-pill"
                    className="absolute inset-0 rounded-md bg-white shadow-sm dark:bg-slate-700"
                    // transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 20,
                  }}
                  />
                )}
                <span className="relative z-10">{f.label}</span>
              </button>
            ))}
          </div>
          <Link
            to="/demandes"
            className="hidden text-[12.5px] font-semibold text-primary-600 hover:text-primary-700 sm:inline"
          >
            Voir tout
          </Link>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-400">
              <th className="whitespace-nowrap px-5 py-3">Référence</th>
              <th className="whitespace-nowrap px-5 py-3">Type</th>
              <th className="whitespace-nowrap px-5 py-3">Date</th>
              <th className="whitespace-nowrap px-5 py-3">Statut</th>
              <th className="whitespace-nowrap px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="wait">
              {filtered.map((req) => (
                <motion.tr
                  key={req.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="border-t border-slate-50 text-[13px] transition-colors hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/40"
                >
                  <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-200">
                    {req.reference}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-500 dark:text-slate-400">
                    {req.type}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-500 dark:text-slate-400">
                    {formatDate(req.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${statusStyles[req.status]}`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right">
                    <button
                      aria-label="Voir la demande"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-slate-800"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p className="px-5 py-8 text-center text-[13px] text-slate-400">
            Aucune demande pour ce filtre.
          </p>
        )}
      </div>
    </div>
  );
}
