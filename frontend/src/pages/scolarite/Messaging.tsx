import { useEffect, useRef, useState } from "react";
import {
    MessageSquare,
    Send,
    Paperclip,
    X,
    FileText,
    Loader2,
    Inbox,
    User,
    Users,
    GraduationCap,
    Mail,
    Phone,
    Hash,
    Building2,
    BookOpen,
    Calendar,
} from "lucide-react";
import {
    getScolariteConversations,
    getScolariteMessages,
    sendScolariteMessage,
    markScolariteConversationRead,
} from "../../services/scolarite.service";
import type { ScolariteConversation } from "../../services/scolarite.service";
import { downloadDocument as downloadDocumentService } from "../../services/student.service";

interface Message {
    id: string;
    contenu: string;
    dateEnvoi: string;
    lu: boolean;
    expediteur: {
        id: string;
        nom: string;
        role: string;
    };
    piecesJointes: any[];
}

// Couleurs par code de filière
const FILIERE_COLORS: Record<string, { bg: string; text: string }> = {
    MGSI: {
        bg: "bg-emerald-100 dark:bg-emerald-900/30",
        text: "text-emerald-700 dark:text-emerald-300",
    },
    SITCN: {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        text: "text-blue-700 dark:text-blue-300",
    },
    SDBDIA: {
        bg: "bg-violet-100 dark:bg-violet-900/30",
        text: "text-violet-700 dark:text-violet-300",
    },
    IL: {
        bg: "bg-amber-100 dark:bg-amber-900/30",
        text: "text-amber-700 dark:text-amber-300",
    },
    DEIS: {
        bg: "bg-rose-100 dark:bg-rose-900/30",
        text: "text-rose-700 dark:text-rose-300",
    },
};

const getFilierStyle = (code?: string | null) => {
    if (!code) return FILIERE_COLORS.MGSI;
    const upper = code.toUpperCase();
    return FILIERE_COLORS[upper] ?? {
        bg: "bg-slate-100 dark:bg-slate-800",
        text: "text-slate-700 dark:text-slate-300",
    };
};

export default function ScolariteMessaging() {
    const [conversations, setConversations] = useState<ScolariteConversation[]>([]);
    const [activeConv, setActiveConv] = useState<ScolariteConversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
    const [sending, setSending] = useState(false);
    const [loadingMsgs, setLoadingMsgs] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getScolariteConversations();
                setConversations(data);
            } catch (err) {
                console.error(err);
            }
        };
        load();
    }, []);

    useEffect(() => {
        if (!activeConv) {
            setMessages([]);
            return;
        }

        const load = async () => {
            try {
                setLoadingMsgs(messages.length === 0);
                const data = await getScolariteMessages(activeConv.id);
                setMessages(data);
                await markScolariteConversationRead(activeConv.id);
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingMsgs(false);
            }
        };

        load();
        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
    }, [activeConv]);

    useEffect(() => {
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [messages, loadingMsgs]);

    const handleSend = async () => {
        if ((!input.trim() && attachedFiles.length === 0) || sending || !activeConv) return;

        setSending(true);
        try {
            const sent = await sendScolariteMessage(activeConv.id, input.trim(), attachedFiles);
            setMessages((prev) => [
                ...prev,
                {
                    id: sent.id,
                    contenu: input.trim(),
                    dateEnvoi: sent.dateEnvoi,
                    lu: true,
                    expediteur: {
                        id: "me",
                        nom: "Scolarité",
                        role: "SCOLARITE",
                    },
                    piecesJointes: attachedFiles.map((f) => ({
                        id_document: `temp-${Date.now()}`,
                        nom: f.name,
                        type: f.type,
                        taille: f.size,
                        url: "",
                    })),
                },
            ]);
            setInput("");
            setAttachedFiles([]);
        } catch (err) {
            console.error(err);
        } finally {
            setSending(false);
        }
    };

    const handleDownloadAttachment = async (documentId: string, fileName: string) => {
        console.log("🔍 Tentative de téléchargement:", { documentId, fileName });

        if (!documentId || documentId.startsWith("temp-")) {
            alert("Ce fichier n'a pas encore été envoyé.");
            return;
        }

        try {
            const blob = await downloadDocumentService(documentId);

            // Si c'est une erreur JSON déguisée en blob
            if (blob.type === "application/json" || blob.size < 500) {
                const text = await blob.text();
                console.error("❌ Erreur du serveur:", text);

                try {
                    const errorData = JSON.parse(text);
                    alert(`Erreur serveur: ${errorData.message || text}`);
                } catch {
                    alert(`Erreur serveur: ${text}`);
                }
                return;
            }

            // Téléchargement normal
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            console.log("✅ Téléchargement lancé");
        } catch (err: any) {
            console.error("❌ Erreur téléchargement:", err);

            if (err.response?.data instanceof Blob) {
                const text = await err.response.data.text();
                console.error("❌ Contenu erreur:", text);
                try {
                    const errorData = JSON.parse(text);
                    alert(`Erreur: ${errorData.message || text}`);
                } catch {
                    alert(`Erreur: ${text}`);
                }
            } else {
                alert(`Erreur: ${err.response?.status ?? "Inconnue"}`);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="animate-fade-in space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <span />
                        <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white">
                            Messagerie étudiants
                        </h1>
                    </div>
                    <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400">
                        Communiquez avec les étudiants et répondez à leurs demandes.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr_300px]">
                {/* Liste des conversations */}
                <div className="card overflow-hidden p-0">
                    <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">
                                Conversations
                            </h3>
                            <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                                {conversations.length}
                            </span>
                        </div>
                    </div>
                    <div className="max-h-[650px] overflow-y-auto">
                        {conversations.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                                <Inbox size={24} className="text-slate-400" />
                                <p className="text-[13px] text-slate-500 dark:text-slate-400">
                                    Aucune conversation
                                </p>
                            </div>
                        ) : (
                            conversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => setActiveConv(conv)}
                                    className={`flex w-full items-start gap-3 border-b border-slate-100 px-5 py-4 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40 ${
                                        activeConv?.id === conv.id ? "bg-primary-50 dark:bg-primary-900/20" : ""
                                    }`}
                                >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                                        <User size={18} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <p className="truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">
                                                    {conv.etudiant.nom}
                                                </p>
                                                {conv.etudiant.filiere && (() => {
                                                    const style = getFilierStyle(conv.etudiant.filiere);
                                                    return (
                                                        <span
                                                            className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${style.bg} ${style.text}`}
                                                        >
                                                            {conv.etudiant.filiere}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                            {conv.nonLus > 0 && (
                                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
                                                    {conv.nonLus}
                                                </span>
                                            )}
                                        </div>
                                        <p className="truncate text-[12px] font-medium text-slate-600 dark:text-slate-300">
                                            {conv.sujet}
                                        </p>
                                        <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                                            {conv.dernierMessage ?? "Aucun message"}
                                        </p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Zone de chat */}
                <div className="card flex flex-col overflow-hidden p-0">
                    {!activeConv ? (
                        <div className="flex h-full min-h-[500px] flex-col items-center justify-center gap-3 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                                <MessageSquare size={24} className="text-slate-400" />
                            </div>
                            <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-200">
                                Sélectionnez une conversation
                            </p>
                            <p className="max-w-xs text-[12.5px] text-slate-500 dark:text-slate-400">
                                Choisissez une conversation à gauche pour commencer à répondre.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                                        <GraduationCap size={18} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">
                                                {activeConv.etudiant.nom}
                                            </h3>
                                            {activeConv.etudiant.filiere && (() => {
                                                const style = getFilierStyle(activeConv.etudiant.filiere);
                                                return (
                                                    <span
                                                        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${style.bg} ${style.text}`}
                                                    >
                                                        {activeConv.etudiant.filiere}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {activeConv.sujet}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4" style={{ maxHeight: "500px" }}>
                                {loadingMsgs ? (
                                    <div className="flex items-center justify-center py-10">
                                        <Loader2 size={20} className="animate-spin text-slate-400" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <p className="py-10 text-center text-[13px] text-slate-400 dark:text-slate-500">
                                        Aucun message. Envoyez le premier !
                                    </p>
                                ) : (
                                    messages.map((msg) => {
                                        const isMine = msg.expediteur.role === "SCOLARITE";
                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex items-start gap-2 ${isMine ? "flex-row-reverse" : ""}`}
                                            >
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                    {isMine ? <Users size={14} /> : <User size={14} />}
                                                </div>
                                                <div className="max-w-[75%] space-y-1">
                                                    <div
                                                        className={`rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                                                            isMine
                                                                ? "bg-primary-600 text-white"
                                                                : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                                                        }`}
                                                    >
                                                        {msg.contenu}
                                                    </div>
                                                    {msg.piecesJointes.length > 0 && (
                                                        <div className={`flex flex-wrap gap-1.5 ${isMine ? "justify-end" : ""}`}>
                                                            {msg.piecesJointes.map((pj, i) => (
                                                                <button
                                                                    key={i}
                                                                    type="button"
                                                                    onClick={() => handleDownloadAttachment(pj.id_document, pj.nom)}
                                                                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition hover:opacity-80 ${
                                                                        isMine
                                                                            ? "bg-primary-500/50 text-white"
                                                                            : "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200"
                                                                    }`}
                                                                >
                                                                    <FileText size={12} />
                                                                    {pj.nom}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <p className={`text-[10px] text-slate-400 ${isMine ? "text-right" : ""}`}>
                                                        {msg.expediteur.nom} · {new Date(msg.dateEnvoi).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Input fixe */}
                            <div className="border-t border-slate-100 p-4 dark:border-slate-800">
                                {attachedFiles.length > 0 && (
                                    <div className="mb-2 flex flex-wrap gap-2">
                                        {attachedFiles.map((f, i) => (
                                            <span key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                <FileText size={11} />
                                                {f.name}
                                                <button
                                                    type="button"
                                                    onClick={() => setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                                                    className="text-slate-400 hover:text-slate-600"
                                                >
                                                    <X size={11} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 transition-all dark:border-slate-700 dark:bg-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-slate-700 dark:hover:text-primary-400"
                                        title="Joindre un fichier"
                                    >
                                        <Paperclip size={15} />
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => {
                                            const files = Array.from(e.target.files ?? []);
                                            setAttachedFiles((prev) => [...prev, ...files]);
                                            if (e.target) e.target.value = "";
                                        }}
                                    />
                                    <textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        rows={1}
                                        placeholder="Répondre à l'étudiant..."
                                        className="max-h-24 flex-1 resize-none border-0 bg-transparent py-1.5 text-[13px] text-slate-800 placeholder:text-slate-400 outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
                                        style={{ outline: "none", boxShadow: "none" }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSend}
                                        disabled={(!input.trim() && attachedFiles.length === 0) || sending}
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
                                    >
                                        {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                    </button>
                                </div>
                                <p className="mt-1.5 text-center text-[10px] text-slate-400 dark:text-slate-500">
                                    <kbd className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-semibold dark:bg-slate-800">Entrée</kbd> pour envoyer · <kbd className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-semibold dark:bg-slate-800">Maj+Entrée</kbd> saut de ligne
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {activeConv && (
                    <div className="card overflow-hidden p-0">
                        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                            <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">
                                Informations étudiant
                            </h3>
                        </div>

                        <div className="space-y-5 p-5">
                            <div className="flex flex-col items-center text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/30">
                                    <GraduationCap size={28} />
                                </div>
                                <h4 className="mt-3 text-[15px] font-bold text-slate-900 dark:text-white">
                                    {activeConv.etudiant.nom}
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Étudiant
                                </p>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    Informations académiques
                                </p>

                                {activeConv.etudiant.filiere && (
                                    <InfoRow
                                        icon={BookOpen}
                                        label="Filière"
                                        value={activeConv.etudiant.filiere}
                                        color="primary"
                                    />
                                )}

                                {activeConv.etudiant.niveau && (
                                    <InfoRow
                                        icon={GraduationCap}
                                        label="Niveau"
                                        value={activeConv.etudiant.niveau}
                                        color="emerald"
                                    />
                                )}

                                {activeConv.etudiant.groupe && (
                                    <InfoRow
                                        icon={Users}
                                        label="Groupe"
                                        value={activeConv.etudiant.groupe}
                                        color="sky"
                                    />
                                )}

                                {activeConv.etudiant.departement && (
                                    <InfoRow
                                        icon={Building2}
                                        label="Département"
                                        value={activeConv.etudiant.departement}
                                        color="amber"
                                    />
                                )}
                            </div>

                            <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    Identifiants
                                </p>

                                {activeConv.etudiant.cne && (
                                    <InfoRow icon={Hash} label="CNE" value={activeConv.etudiant.cne} color="indigo" mono />
                                )}

                                {activeConv.etudiant.cin && (
                                    <InfoRow icon={Hash} label="CIN" value={activeConv.etudiant.cin} color="rose" mono />
                                )}

                                {activeConv.etudiant.codeApogee && (
                                    <InfoRow icon={Hash} label="Code Apogée" value={activeConv.etudiant.codeApogee} color="violet" mono />
                                )}
                            </div>

                            <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    Contact
                                </p>

                                <InfoRow icon={Mail} label="Email" value={activeConv.etudiant.email} color="primary" small />

                                {activeConv.etudiant.telephone && (
                                    <InfoRow icon={Phone} label="Téléphone" value={activeConv.etudiant.telephone} color="emerald" />
                                )}
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Statut
                                    </p>
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                        {activeConv.statut}
                                    </span>
                                </div>
                                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                    <Calendar size={11} />
                                    Créée le {new Date(activeConv.createdAt).toLocaleDateString("fr-FR")}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function InfoRow({
    icon: Icon,
    label,
    value,
    color = "slate",
    mono = false,
    small = false,
}: {
    icon: any;
    label: string;
    value: string;
    color?: string;
    mono?: boolean;
    small?: boolean;
}) {
    const colors: any = {
        primary: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300",
        emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
        sky: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
        amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
        rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
        indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
        violet: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
        slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    };

    return (
        <div className="flex items-start gap-3">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colors[color]}`}>
                <Icon size={14} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {label}
                </p>
                <p
                    className={`mt-0.5 truncate text-[12.5px] font-semibold text-slate-800 dark:text-white ${
                        mono ? "font-mono tabular-nums" : ""
                    } ${small ? "text-[11px]" : ""}`}
                    title={value}
                >
                    {value}
                </p>
            </div>
        </div>
    );
}