import { Download, FileText, ArrowUpRight } from "lucide-react";
import { Link } from 'react-router-dom';
import { studentDocuments } from "../../../data/dummyData";
import { formatDate } from "../../../utils/format";

export default function RecentDocuments() {
  return (
    <div className="card  p-5">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Documents récents
          </h2>
        </div>
          <Link
    to="/documents"
    className="text-sm font-semibold text-primary-600 hover:text-primary-700"
  >
    Voir tout
  </Link>
      </div>

      {/* Documents */}
<div className="space-y-3">
  {studentDocuments.slice(0, 4).map((doc) => (
    <div
      key={doc.id}
      className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 transition hover:border-primary-200 hover:shadow-sm dark:border-slate-700"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-red-100 text-red-500">
          <FileText size={24} />
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {doc.name}
          </h3>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            Déposé le {formatDate(doc.uploadedAt)} • {doc.sizeKb} Ko
          </p>
        </div>
      </div>

      <button className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-primary-100 hover:text-primary-600 dark:bg-slate-800">
        <Download size={16} />
      </button>
    </div>
  ))}
</div>
    </div>
  );
}