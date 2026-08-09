import { Download, FileText, FolderOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getRecentDocuments, downloadDocument } from "../../../services/student.service";
import { formatDate } from "../../../utils/format";

export default function RecentDocuments() {
  const [documents, setDocuments] = useState<any[]>([]);

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

  const handleDownload = async (doc: any) => {
    try {
      const blob = await downloadDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const getFileColor = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
    if (["doc", "docx"].includes(ext || "")) return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
    return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  };

  return (
    <div className="card p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">
            Documents récents
          </h2>
          <p className="mt-0.5 text-[11.5px] text-slate-400 dark:text-slate-500">
            Vos derniers fichiers
          </p>
        </div>
        <Link
          to="/student/documents"
          className="text-[12.5px] font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          Voir tout
        </Link>
      </div>

      <div className="space-y-2.5">
        {documents.slice(0, 3).map((doc) => (
          <div
            key={doc.id}
            className="group flex items-center justify-between rounded-xl border border-slate-200/70 bg-white p-4 transition-all duration-200 hover:border-primary-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center gap-3.5">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getFileColor(doc.name)}`}>
                <FileText size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-[13.5px] font-semibold text-slate-900 dark:text-white">
                  {doc.name}
                </h3>
                <p className="text-[11.5px] text-slate-400 dark:text-slate-500">
                  {formatDate(doc.uploadedAt)} • {doc.sizeKb} Ko
                </p>
              </div>
            </div>
            <button
              onClick={() => handleDownload(doc)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-primary-900/50 dark:hover:bg-primary-900/20 dark:hover:text-primary-300"
              aria-label="Télécharger"
            >
              <Download size={15} />
            </button>
          </div>
        ))}
        {documents.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
              <FolderOpen size={24} className="text-slate-400" />
            </div>
            <p className="text-[13px] text-slate-400 dark:text-slate-500">
              Aucun document
            </p>
          </div>
        )}
      </div>
    </div>
  );
}