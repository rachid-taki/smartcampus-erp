import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, FileText, Route, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StudentRequest } from '../../../types';
import { formatDate, statusStyles } from '../../../utils/format';
import { getRecentDocuments } from '../../../services/student.service';

interface RecentRequestsTableProps {
  requests: StudentRequest[];
}

const FILTERS = [
  { label: "Tous", value: "Tous" },
  { label: "Soumises", value: "Soumise" },
  { label: "En attente", value: "En_Traitement" },
  { label: "Validées", value: "Validee" },
  { label: "Refusées", value: "Rejetee" },
  { label: "Clôturées", value: "Cloturee" },
];

export default function RecentRequestsTable({ requests }: RecentRequestsTableProps) {
  const [filter, setFilter] = useState<string>("Tous");
  const [documents, setDocuments] = useState<any[]>([]);
  const [viewingRequest, setViewingRequest] = useState<any | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getRecentDocuments();
        setDocuments(data);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "Tous") return requests;
    const map: Record<string, string> = {
      Soumise: "Soumise",
      En_Traitement: "En_Traitement",
      Validee: "Validee",
      Rejetee: "Rejetee",
      Cloturee: "Cloturee",
    };
    return requests.filter((r: any) => {
      return (r.status ?? r.statut) === map[filter];
    });
  }, [requests, filter]);

  const getDocumentsForRequest = (requestId: string) =>
    documents.filter((d) => d.id_demande === requestId);

  return (
    <>
      <div className="card">
        <div className="flex flex-col gap-3 border-b border-slate-200/70 px-6 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">
            Demandes récentes
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`relative rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition-colors ${
                    filter === f.value
                      ? 'text-primary-700 dark:text-primary-300'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {filter === f.value && (
                    <motion.span
                      layoutId="request-filter-pill"
                      className="absolute inset-0 rounded-lg bg-white shadow-sm dark:bg-slate-700"
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
              to="/student/requests"
              className="hidden text-[12.5px] font-semibold text-primary-600 hover:text-primary-700 sm:inline dark:text-primary-400"
            >
              Voir tout
            </Link>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200/70 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-500">
                <th className="whitespace-nowrap px-6 py-3">Référence</th>
                <th className="whitespace-nowrap px-6 py-3">Type</th>
                <th className="whitespace-nowrap px-6 py-3">Date</th>
                <th className="whitespace-nowrap px-6 py-3">Statut</th>
                <th className="whitespace-nowrap px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
              <AnimatePresence mode="wait">
                {filtered.slice(0, 4).map((req) => (
                  <motion.tr
                    key={req.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200">
                        {req.reference}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="text-[13px] text-slate-600 dark:text-slate-400">
                        {req.type}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="text-[13px] text-slate-600 dark:text-slate-400">
                        {formatDate(req.createdAt)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[req.status]}`}
                      >
                        {req.status
                          .replace("En_Traitement", "En attente")
                          .replace("Validee", "Validée")
                          .replace("Rejetee", "Refusée")
                          .replace("Cloturee", "Clôturée")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        aria-label="Voir la demande"
                        onClick={() => setViewingRequest(req)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-primary-900/50 dark:hover:bg-primary-900/20 dark:hover:text-primary-300"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-12">
              <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
                <FileText size={24} className="text-slate-400" />
              </div>
              <p className="text-[13px] text-slate-400 dark:text-slate-500">
                Aucune demande pour ce filtre
              </p>
            </div>
          )}
        </div>
      </div>

      {viewingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary-100 p-2 dark:bg-primary-900/30">
                  <FileText size={18} className="text-primary-700 dark:text-primary-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                    Détails de la demande
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {viewingRequest.reference}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingRequest(null)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Type
                  </p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">
                    {viewingRequest.type}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Date de création
                  </p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">
                    {formatDate(viewingRequest.createdAt)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Statut
                  </p>
                  <div className="mt-1">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[viewingRequest.status]}`}
                    >
                      {viewingRequest.status
                        .replace("En_Traitement", "En attente")
                        .replace("Validee", "Validée")
                        .replace("Rejetee", "Refusée")
                        .replace("Cloturee", "Clôturée")}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Objet
                </h3>
                <p className="text-base font-semibold text-slate-800 dark:text-white">
                  {viewingRequest.objet}
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Description
                </h3>
                <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                  {viewingRequest.description || "Aucune description fournie."}
                </p>
              </div>

              <div>
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Documents joints
                </h3>
                {getDocumentsForRequest(viewingRequest.id).length > 0 ? (
                  <div className="space-y-2">
                    {getDocumentsForRequest(viewingRequest.id).map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
                          <FileText size={18} className="text-red-600 dark:text-red-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                            {doc.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {doc.sizeKb} KB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl bg-slate-50 p-4 text-center text-sm italic text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                    Aucun document joint à cette demande.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-700">
    <button
        onClick={() => {
            navigate(`/student/workflow?type=${encodeURIComponent(viewingRequest.type)}`);
            setViewingRequest(null);
        }}
        className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-5 py-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-100 dark:border-primary-900/50 dark:bg-primary-900/20 dark:text-primary-300 dark:hover:bg-primary-900/30"
    >
        <Route size={15} />
        Voir le workflow
    </button>
    <button
        onClick={() => setViewingRequest(null)}
        className="rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
    >
        Fermer
    </button>
</div>
          </div>
        </div>
      )}
    </>
  );
}