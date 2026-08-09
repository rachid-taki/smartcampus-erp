import { useEffect, useMemo, useState } from "react";
import {
    CalendarDays,
    Download,
    File,
    FileText,
    FolderOpen,
    HardDrive,
    Loader2,
    Search,
    Award,
    Clock,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";
import {
    getRecentDocuments,
    downloadDocument,
    getDocumentsOfficiels,
    downloadDocumentOfficiel,
} from "../../../services/student.service";
import type { DocumentOfficiel } from "../../../services/student.service";

interface DocumentItem {
    id: string;
    name: string;
    uploadedAt: string;
    sizeKb: number;
}

type SortBy = "date" | "name" | "size";

const getExtension = (name: string) =>
    name.split(".").pop()?.toLowerCase() ?? "";

const isPdf = (name: string) => getExtension(name) === "pdf";

const formatSize = (kb: number) =>
    kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;

const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

const formatDateTime = (date: string) =>
    new Date(date).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

function LoadingSkeleton() {
    return (
        <div className="space-y-6">
            <div className="h-9 w-52 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="card h-24 animate-pulse" />
                ))}
            </div>
            <div className="card h-96 animate-pulse" />
        </div>
    );
}

export default function Documents() {
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [documentsOfficiels, setDocumentsOfficiels] = useState<DocumentOfficiel[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [formatFilter, setFormatFilter] = useState("all");
    const [sortBy, setSortBy] = useState<SortBy>("date");
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [downloadingOfficielId, setDownloadingOfficielId] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [docsData, officielsData] = await Promise.all([
                    getRecentDocuments(),
                    getDocumentsOfficiels(),
                ]);
                setDocuments(docsData);
                setDocumentsOfficiels(officielsData);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const totalSizeKb = documents.reduce((acc, d) => acc + (d.sizeKb || 0), 0);
    const now = new Date();
    const thisMonthCount = documents.filter((d) => {
        const u = new Date(d.uploadedAt);
        return (
            u.getMonth() === now.getMonth() &&
            u.getFullYear() === now.getFullYear()
        );
    }).length;

    const filtered = useMemo(() => {
        let list = documents.filter((d) =>
            d.name.toLowerCase().includes(search.toLowerCase())
        );
        if (formatFilter !== "all") {
            list = list.filter((d) => getExtension(d.name) === formatFilter);
        }
        return [...list].sort((a, b) => {
            if (sortBy === "date")
                return (
                    new Date(b.uploadedAt).getTime() -
                    new Date(a.uploadedAt).getTime()
                );
            if (sortBy === "name") return a.name.localeCompare(b.name);
            return (b.sizeKb || 0) - (a.sizeKb || 0);
        });
    }, [documents, search, formatFilter, sortBy]);

    const filteredOfficiels = useMemo(() => {
        return documentsOfficiels.filter((d) =>
            d.nom.toLowerCase().includes(search.toLowerCase())
        );
    }, [documentsOfficiels, search]);

    const handleDownload = async (doc: DocumentItem) => {
        try {
            setDownloadingId(doc.id);
            const res: any = await downloadDocument(doc.id);

            const blob: Blob =
                res instanceof Blob
                    ? res
                    : res.data instanceof Blob
                      ? res.data
                      : new Blob([res.data ?? res]);

            const disposition: string =
                res?.headers?.["content-disposition"] ?? "";
            const match = disposition.match(/filename="?(.+?)"?$/);
            const filename = match?.[1] ?? doc.name;

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert("Impossible de télécharger ce document.");
        } finally {
            setDownloadingId(null);
        }
    };

    const handleDownloadOfficiel = async (doc: DocumentOfficiel) => {
        try {
            setDownloadingOfficielId(doc.id);
            const blob = await downloadDocumentOfficiel(doc.id);

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = doc.nom;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert("Impossible de télécharger ce document.");
        } finally {
            setDownloadingOfficielId(null);
        }
    };

    if (loading) return <LoadingSkeleton />;

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Mes documents
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Retrouvez vos documents officiels et ceux déposés lors de vos demandes.
                    </p>
                </div>
                <span className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200/70 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 sm:self-auto">
                    <FolderOpen size={13} className="text-primary-500" />
                    {documents.length + documentsOfficiels.length} document{(documents.length + documentsOfficiels.length) > 1 ? "s" : ""}
                </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="card flex items-center gap-4 border-l-4 border-l-amber-500 p-5 dark:border-l-amber-400">
                    <div className="rounded-xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        <Award size={20} />
                    </div>
                    <div>
                        <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                            {documentsOfficiels.length}
                        </p>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Documents officiels
                        </p>
                    </div>
                </div>

                <div className="card flex items-center gap-4 border-l-4 border-l-primary-500 p-5 dark:border-l-primary-400">
                    <div className="rounded-xl bg-primary-100 p-3 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                        <FolderOpen size={20} />
                    </div>
                    <div>
                        <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                            {documents.length}
                        </p>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Documents déposés
                        </p>
                    </div>
                </div>

                <div className="card flex items-center gap-4 border-l-4 border-l-emerald-500 p-5 dark:border-l-emerald-400">
                    <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        <HardDrive size={20} />
                    </div>
                    <div>
                        <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                            {formatSize(totalSizeKb)}
                        </p>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Espace utilisé
                        </p>
                    </div>
                </div>

                <div className="card flex items-center gap-4 border-l-4 border-l-sky-500 p-5 dark:border-l-sky-400">
                    <div className="rounded-xl bg-sky-100 p-3 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                        <CalendarDays size={20} />
                    </div>
                    <div>
                        <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                            {thisMonthCount}
                        </p>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Déposés ce mois
                        </p>
                    </div>
                </div>
            </div>

            {/* Documents officiels */}
            {documentsOfficiels.length > 0 && (
                <div className="card overflow-hidden">
                    <div className="border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 dark:border-slate-800 dark:from-amber-900/10 dark:to-orange-900/10">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-amber-500 p-2 text-white">
                                <Award size={18} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    Documents officiels
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Attestations, relevés de notes et certificats générés par l'administration
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
                        {filteredOfficiels.map((doc) => {
                            const daysUntilExpiration = doc.dateExpiration
                                ? Math.ceil((new Date(doc.dateExpiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                                : null;

                            return (
                                <div
                                    key={doc.id}
                                    className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="rounded-lg bg-amber-100 p-3 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                            <FileText size={20} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                                    {doc.nom}
                                                </p>
                                                {doc.expired ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                                                        <AlertCircle size={10} />
                                                        Expiré
                                                    </span>
                                                ) : daysUntilExpiration !== null && daysUntilExpiration <= 30 ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                                        <Clock size={10} />
                                                        Expire dans {daysUntilExpiration}j
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                        <CheckCircle2 size={10} />
                                                        Valide
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                                <span>Généré le {formatDate(doc.dateGeneration)}</span>
                                                {doc.dateExpiration && (
                                                    <span>· Expire le {formatDate(doc.dateExpiration)}</span>
                                                )}
                                                <span>· {doc.nombreTelechargements} téléchargement{doc.nombreTelechargements > 1 ? "s" : ""}</span>
                                                {doc.dernierTelechargement && (
                                                    <span>· Dernier : {formatDateTime(doc.dernierTelechargement)}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleDownloadOfficiel(doc)}
                                        disabled={downloadingOfficielId === doc.id}
                                        className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {downloadingOfficielId === doc.id ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            <Download size={14} />
                                        )}
                                        Télécharger
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Documents déposés */}
            <div className="card p-4">
                <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-lg bg-primary-500 p-2 text-white">
                        <FolderOpen size={18} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            Mes documents déposés
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                            Documents que vous avez uploadés lors de vos demandes
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative flex-1">
                        <Search
                            size={16}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher un document..."
                            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                        />
                    </div>

                    <select
                        value={formatFilter}
                        onChange={(e) => setFormatFilter(e.target.value)}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                        <option value="all">Tous les formats</option>
                        <option value="pdf">PDF</option>
                        <option value="doc">DOC</option>
                        <option value="docx">DOCX</option>
                    </select>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortBy)}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                        <option value="date">Plus récents</option>
                        <option value="name">Nom (A → Z)</option>
                        <option value="size">Taille</option>
                    </select>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="card flex flex-col items-center justify-center gap-3 p-14 text-center">
                    <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
                        <FolderOpen
                            size={28}
                            className="text-slate-400"
                        />
                    </div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-white">
                        Aucun document trouvé
                    </h3>
                    <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
                        {documents.length === 0
                            ? "Les documents que vous déposez lors de vos demandes apparaîtront ici."
                            : "Aucun document ne correspond à votre recherche ou à vos filtres."}
                    </p>
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-left">
                            <thead>
                                <tr className="border-b border-slate-200/70 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
                                    <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Document
                                    </th>
                                    <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Format
                                    </th>
                                    <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Taille
                                    </th>
                                    <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Date de dépôt
                                    </th>
                                    <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                                {filtered.map((doc) => (
                                    <tr
                                        key={doc.id}
                                        className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`rounded-lg p-2 ${
                                                        isPdf(doc.name)
                                                            ? "bg-red-100 dark:bg-red-900/30"
                                                            : "bg-primary-100 dark:bg-primary-900/30"
                                                    }`}
                                                >
                                                    {isPdf(doc.name) ? (
                                                        <FileText
                                                            size={18}
                                                            className="text-red-600 dark:text-red-400"
                                                        />
                                                    ) : (
                                                        <File
                                                            size={18}
                                                            className="text-primary-600 dark:text-primary-400"
                                                        />
                                                    )}
                                                </div>
                                                <p className="max-w-[240px] truncate text-sm font-semibold text-slate-800 dark:text-white">
                                                    {doc.name}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${
                                                    isPdf(doc.name)
                                                        ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                                        : "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                                                }`}
                                            >
                                                {getExtension(doc.name)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                            {formatSize(doc.sizeKb || 0)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                            {formatDate(doc.uploadedAt)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleDownload(doc)
                                                }
                                                disabled={
                                                    downloadingId === doc.id
                                                }
                                                className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {downloadingId === doc.id ? (
                                                    <Loader2
                                                        size={14}
                                                        className="animate-spin"
                                                    />
                                                ) : (
                                                    <Download size={14} />
                                                )}
                                                Télécharger
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[11px] font-medium text-slate-400 dark:border-slate-800 dark:text-slate-500">
                        <span className="tabular-nums">
                            {filtered.length} document{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
                        </span>
                        <span>
                            Taille totale : {formatSize(filtered.reduce((acc, d) => acc + (d.sizeKb || 0), 0))}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}