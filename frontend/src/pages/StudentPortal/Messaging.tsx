import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageSquare,
    Plus,
    Send,
    Paperclip,
    X,
    FileText,
    Loader2,
    Inbox,
    Search,
    Users,
    ArrowLeft,
    Check,
    CheckCheck,
    GraduationCap,
} from "lucide-react";
import {
    getConversations,
    createConversation,
    getMessages,
    sendMessage,
} from "../../services/messaging.service";
import type { Conversation, Message } from "../../services/messaging.service";
import { downloadDocument as downloadDocumentService } from "../../services/student.service";
import { useMessagingSocket } from "../../hooks/useMessagingSocket";

const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `il y a ${minutes} min`;
    if (hours < 24) return `il y a ${hours}h`;
    if (days < 7) return `il y a ${days}j`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return "Aujourd'hui";
    if (isYesterday) return "Hier";
    return date.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
    });
};

const shouldShowDateSeparator = (currentDate: string, prevDate?: string) => {
    if (!prevDate) return true;
    const curr = new Date(currentDate).toDateString();
    const prev = new Date(prevDate).toDateString();
    return curr !== prev;
};

export default function Messaging() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConv, setActiveConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
    const [sending, setSending] = useState(false);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [showNewModal, setShowNewModal] = useState(false);
    const [newSujet, setNewSujet] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [showMobileChat, setShowMobileChat] = useState(false);
   const [typingUsers, setTypingUsers] = useState<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
   const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const {
        isConnected,
        sendMessage: socketSendMessage,
        joinConversation,
        leaveConversation,
        markAsRead: socketMarkAsRead,
        startTyping,
        stopTyping,
        onNewMessage,
        onConversationsRefresh,
        onTypingUpdate,
    } = useMessagingSocket();

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getConversations();
                setConversations(data);
            } catch (err) {
                console.error(err);
            }
        };
        load();
    }, []);

    useEffect(() => {
        const unsub = onConversationsRefresh(async () => {
            const data = await getConversations();
            setConversations(data);
        });
        return unsub;
    }, [onConversationsRefresh]);

    useEffect(() => {
        const unsub = onNewMessage((msg) => {
            if (activeConv && (msg as any).id_conversation === activeConv.id) {
                setMessages((prev) => {
                    if (prev.some((m) => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
                if (!msg.isMine) {
                    socketMarkAsRead(activeConv.id);
                }
            }
            getConversations().then(setConversations);
        });
        return unsub;
    }, [onNewMessage, activeConv, socketMarkAsRead]);

    useEffect(() => {
        if (activeConv) {
            joinConversation(activeConv.id);
            return () => leaveConversation(activeConv.id);
        }
    }, [activeConv, joinConversation, leaveConversation]);

    useEffect(() => {
        if (!activeConv) {
            setMessages([]);
            return;
        }

        const load = async () => {
            try {
                setLoadingMsgs(true);
                const data = await getMessages(activeConv.id);
                setMessages(data);
                socketMarkAsRead(activeConv.id);
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingMsgs(false);
            }
        };

        load();
    }, [activeConv, socketMarkAsRead]);

    useEffect(() => {
        const unsub = onTypingUpdate((data) => {
            if (!activeConv || data.conversationId !== activeConv.id) return;
            if (data.isTyping) {
                setTypingUsers((prev) => {
                    const next = new Map(prev);
                    if (next.has(data.userId)) clearTimeout(next.get(data.userId));
                    const timeout = setTimeout(() => {
                        setTypingUsers((p) => {
                            const n = new Map(p);
                            n.delete(data.userId);
                            return n;
                        });
                    }, 3000);
                    next.set(data.userId, timeout);
                    return next;
                });
            } else {
                setTypingUsers((prev) => {
                    const next = new Map(prev);
                    if (next.has(data.userId)) clearTimeout(next.get(data.userId));
                    next.delete(data.userId);
                    return next;
                });
            }
        });
        return unsub;
    }, [onTypingUpdate, activeConv]);

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
            if (attachedFiles.length > 0) {
                const sent = await sendMessage(activeConv.id, input.trim(), attachedFiles);
                setMessages((prev) => [
                    ...prev,
                    {
                        id: sent.id,
                        contenu: input.trim(),
                        dateEnvoi: sent.dateEnvoi,
                        lu: true,
                        isMine: true,
                        expediteur: "Moi",
                        piecesJointes: attachedFiles.map((f) => ({
                            id_document: `temp-${Date.now()}-${Math.random()}`,
                            nom: f.name,
                            type: f.type,
                            taille: f.size,
                            url: "",
                        })),
                    },
                ]);
            } else {
                socketSendMessage(activeConv.id, input.trim());
                setMessages((prev) => [
                    ...prev,
                    {
                        id: `temp-${Date.now()}`,
                        contenu: input.trim(),
                        dateEnvoi: new Date().toISOString(),
                        lu: false,
                        isMine: true,
                        expediteur: "Moi",
                        piecesJointes: [],
                    },
                ]);
            }
            setInput("");
            setAttachedFiles([]);
            if (activeConv) stopTyping(activeConv.id);
        } catch (err) {
            console.error(err);
        } finally {
            setSending(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        if (!activeConv) return;

        if (e.target.value.trim()) {
            startTyping(activeConv.id);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                if (activeConv) stopTyping(activeConv.id);
            }, 2000);
        } else {
            stopTyping(activeConv.id);
        }
    };

    const handleCreateConversation = async () => {
        if (!newSujet.trim()) return;
        try {
            const conv = await createConversation(newSujet.trim());
            setConversations((prev) => [conv, ...prev]);
            setActiveConv(conv);
            setShowNewModal(false);
            setShowMobileChat(true);
            setNewSujet("");
        } catch (err) {
            console.error(err);
        }
    };

    const handleSelectConversation = (conv: Conversation) => {
        setActiveConv(conv);
        setShowMobileChat(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const filteredConversations = conversations.filter((c) =>
        c.sujet.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalUnread = conversations.reduce((sum, c) => sum + c.nonLus, 0);

    const handleDownloadAttachment = async (documentId: string, fileName: string) => {
        if (!documentId || documentId.startsWith("temp-")) {
            alert("Ce fichier n'a pas encore été envoyé.");
            return;
        }

        try {
            const blob = await downloadDocumentService(documentId);

            if (blob.type === "application/json" || blob.size < 500) {
                const text = await blob.text();
                try {
                    const errorData = JSON.parse(text);
                    alert(`Erreur serveur: ${errorData.message || text}`);
                } catch {
                    alert(`Erreur serveur: ${text}`);
                }
                return;
            }

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            if (err.response?.data instanceof Blob) {
                const text = await err.response.data.text();
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

    return (
        <div className="animate-fade-in flex h-[calc(100vh-7rem)] flex-col overflow-hidden">
            <div className="flex items-center gap-3 pb-4">
                <span />
                <div>
                    <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white">
                        Messagerie
                    </h1>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400">
                        Espace de communication avec la scolarité
                    </p>
                </div>
                {totalUnread > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="inline-flex h-5 items-center rounded-full bg-primary-600 px-2 text-[10px] font-bold text-white"
                    >
                        {totalUnread} non lu{totalUnread > 1 ? "s" : ""}
                    </motion.span>
                )}
            </div>

            <div className="card flex flex-1 overflow-hidden p-0">
                <aside
                    className={`${
                        showMobileChat ? "hidden md:flex" : "flex"
                    } w-full flex-col border-r border-slate-200 dark:border-slate-800 md:w-[340px] md:shrink-0`}
                >
                    <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-[15px] font-bold text-slate-800 dark:text-white">
                                Conversations
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowNewModal(true)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white transition hover:bg-primary-700 active:scale-95"
                                title="Nouvelle conversation"
                            >
                                <Plus size={16} />
                            </button>
                        </div>

                        <div className="relative">
                            <Search
                                size={14}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Rechercher..."
                                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[12px] text-slate-700 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {filteredConversations.length === 0 ? (
                            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                                    <Inbox size={24} className="text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                                        {searchQuery ? "Aucun résultat" : "Aucune conversation"}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                        {searchQuery
                                            ? "Essayez un autre terme"
                                            : "Commencez par créer une conversation"}
                                    </p>
                                </div>
                                {!searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setShowNewModal(true)}
                                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-primary-700"
                                    >
                                        <Plus size={12} />
                                        Créer
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="py-1">
                                {filteredConversations.map((conv) => (
                                    <button
                                        type="button"
                                        key={conv.id}
                                        onClick={() => handleSelectConversation(conv)}
                                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                                            activeConv?.id === conv.id
                                                ? "bg-primary-50 dark:bg-primary-900/20"
                                                : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        }`}
                                    >
                                        <div className="relative shrink-0">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-sm">
                                                <GraduationCap size={18} />
                                            </div>
                                            {conv.nonLus > 0 && (
                                                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                                                    {conv.nonLus}
                                                </span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p
                                                    className={`truncate text-[13px] ${
                                                        conv.nonLus > 0
                                                            ? "font-bold text-slate-900 dark:text-white"
                                                            : "font-semibold text-slate-700 dark:text-slate-200"
                                                    }`}
                                                >
                                                    {conv.sujet}
                                                </p>
                                                {conv.derniereActivite && (
                                                    <span className="shrink-0 text-[10px] font-medium text-slate-400 tabular-nums">
                                                        {formatRelativeTime(conv.derniereActivite)}
                                                    </span>
                                                )}
                                            </div>
                                            <p
                                                className={`mt-0.5 truncate text-[11.5px] ${
                                                    conv.nonLus > 0
                                                        ? "font-medium text-slate-600 dark:text-slate-300"
                                                        : "text-slate-500 dark:text-slate-400"
                                                }`}
                                            >
                                                {conv.dernierMessage ?? "Aucun message"}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </aside>

                <section
                    className={`${
                        showMobileChat ? "flex" : "hidden md:flex"
                    } flex-1 flex-col overflow-hidden`}
                >
                    {!activeConv ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                            <div className="relative">
                                <div className="absolute -inset-4 animate-pulse rounded-full bg-primary-100/50 dark:bg-primary-900/20" />
                                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-500/30">
                                    <MessageSquare size={32} />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Bienvenue dans votre messagerie
                                </h2>
                                <p className="mt-1 max-w-sm text-[13px] text-slate-500 dark:text-slate-400">
                                    Sélectionnez une conversation existante ou créez-en une nouvelle pour communiquer avec la scolarité.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowNewModal(true)}
                                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-primary-700 active:scale-[0.98]"
                            >
                                <Plus size={15} />
                                Nouvelle conversation
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowMobileChat(false)}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 md:hidden dark:hover:bg-slate-800"
                                    >
                                        <ArrowLeft size={18} />
                                    </button>
                                    <div className="relative">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-sm">
                                            <GraduationCap size={18} />
                                        </div>
                                        <span
                                            className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                                                isConnected ? "bg-green-500" : "bg-amber-500"
                                            }`}
                                        />
                                    </div>
                                    <div>
                                        <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">
                                            {activeConv.sujet}
                                        </h3>
                                        <div className="flex items-center gap-1.5">
                                            <span
                                                className={`h-1.5 w-1.5 rounded-full ${
                                                    isConnected ? "bg-emerald-500" : "bg-amber-500"
                                                }`}
                                            />
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                Service de la scolarité ·{" "}
                                                {isConnected ? "Connecté" : "Reconnexion..."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600 sm:inline-flex dark:bg-slate-800 dark:text-slate-300">
                                    {activeConv.statut}
                                </span>
                            </div>

                            <div
                                ref={scrollRef}
                                className="flex-1 space-y-1 overflow-y-auto bg-gradient-to-b from-slate-50/50 to-white px-5 py-4 dark:from-slate-900/50 dark:to-slate-900"
                            >
                                {loadingMsgs && messages.length === 0 ? (
                                    <div className="flex items-center justify-center py-16">
                                        <Loader2 size={22} className="animate-spin text-slate-400" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                                            <Send size={20} className="text-slate-400" />
                                        </div>
                                        <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                                            Commencez la conversation
                                        </p>
                                        <p className="max-w-xs text-[11.5px] text-slate-500 dark:text-slate-400">
                                            Envoyez votre premier message ci-dessous.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {messages.map((msg, i) => {
                                            const prevMsg = messages[i - 1];
                                            const showDate = shouldShowDateSeparator(
                                                msg.dateEnvoi,
                                                prevMsg?.dateEnvoi
                                            );
                                            const isGroupedWithPrev =
                                                !showDate &&
                                                prevMsg?.isMine === msg.isMine &&
                                                new Date(msg.dateEnvoi).getTime() -
                                                    new Date(prevMsg!.dateEnvoi).getTime() <
                                                    5 * 60 * 1000;

                                            return (
                                                <div key={msg.id}>
                                                    {showDate && (
                                                        <div className="my-4 flex items-center gap-3">
                                                            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                                                {formatDateSeparator(msg.dateEnvoi)}
                                                            </span>
                                                            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                                                        </div>
                                                    )}
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className={`flex items-end gap-2 ${
                                                            msg.isMine ? "flex-row-reverse" : "flex-row"
                                                        } ${isGroupedWithPrev ? "mt-0.5" : "mt-3"}`}
                                                    >
                                                        {!msg.isMine && !isGroupedWithPrev && (
                                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-sm">
                                                                <Users size={12} />
                                                            </div>
                                                        )}
                                                        {!msg.isMine && isGroupedWithPrev && (
                                                            <div className="w-7 shrink-0" />
                                                        )}
                                                        <div
                                                            className={`flex max-w-[75%] flex-col space-y-1 ${
                                                                msg.isMine ? "items-end" : "items-start"
                                                            }`}
                                                        >
                                                            {!isGroupedWithPrev && !msg.isMine && (
                                                                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                                                    Scolarité
                                                                </p>
                                                            )}
                                                            <div
                                                                className={`rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                                                                    msg.isMine
                                                                        ? "bg-primary-600 text-white"
                                                                        : "bg-white text-slate-800 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
                                                                } ${
                                                                    msg.isMine
                                                                        ? isGroupedWithPrev
                                                                            ? "rounded-2xl rounded-tr-sm"
                                                                            : "rounded-2xl rounded-tr-sm"
                                                                        : isGroupedWithPrev
                                                                          ? "rounded-2xl rounded-tl-sm"
                                                                          : "rounded-2xl rounded-tl-sm"
                                                                }`}
                                                            >
                                                                {msg.contenu && (
                                                                    <p className="whitespace-pre-wrap">
                                                                        {msg.contenu}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            {msg.piecesJointes && msg.piecesJointes.length > 0 && (
                                                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                                    {msg.piecesJointes.map((pj) => (
                                                                        <button
                                                                            key={pj.id_document}
                                                                            type="button"
                                                                            onClick={() =>
                                                                                handleDownloadAttachment(
                                                                                    pj.id_document,
                                                                                    pj.nom
                                                                                )
                                                                            }
                                                                            className={`group inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-[11.5px] font-medium transition hover:shadow-sm ${
                                                                                msg.isMine
                                                                                    ? "border-primary-500/30 bg-primary-500/10 text-primary-100 hover:bg-primary-500/20"
                                                                                    : "border-slate-200 bg-white text-slate-700 hover:border-primary-300 hover:bg-primary-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-primary-700 dark:hover:bg-primary-900/20"
                                                                            }`}
                                                                        >
                                                                            <div
                                                                                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                                                                                    msg.isMine
                                                                                        ? "bg-primary-500/30"
                                                                                        : "bg-primary-100 dark:bg-primary-900/40"
                                                                                }`}
                                                                            >
                                                                                <FileText
                                                                                    size={13}
                                                                                    className={
                                                                                        msg.isMine
                                                                                            ? "text-white"
                                                                                            : "text-primary-600 dark:text-primary-400"
                                                                                    }
                                                                                />
                                                                            </div>
                                                                            <div className="text-left">
                                                                                <p className="max-w-[160px] truncate font-semibold">
                                                                                    {pj.nom}
                                                                                </p>
                                                                                <p
                                                                                    className={`text-[10px] opacity-75 ${
                                                                                        msg.isMine
                                                                                            ? ""
                                                                                            : "text-slate-500 dark:text-slate-400"
                                                                                    }`}
                                                                                >
                                                                                    {formatSize(pj.taille)}
                                                                                </p>
                                                                            </div>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            <div
                                                                className={`flex items-center gap-1.5 px-1 ${
                                                                    msg.isMine ? "flex-row-reverse" : ""
                                                                }`}
                                                            >
                                                                <span className="text-[10px] text-slate-400 tabular-nums">
                                                                    {formatTime(msg.dateEnvoi)}
                                                                </span>
                                                                {msg.isMine &&
                                                                    (msg.lu ? (
                                                                        <CheckCheck
                                                                            size={11}
                                                                            className="text-primary-500"
                                                                        />
                                                                    ) : (
                                                                        <Check
                                                                            size={11}
                                                                            className="text-slate-400"
                                                                        />
                                                                    ))}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {typingUsers.size > 0 && (
                                <div className="flex items-center gap-2 px-5 py-1.5">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white">
                                        <Users size={10} />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Scolarité tape
                                        </span>
                                        <div className="flex gap-0.5">
                                            <span
                                                className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                                                style={{ animationDelay: "0ms" }}
                                            />
                                            <span
                                                className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                                                style={{ animationDelay: "150ms" }}
                                            />
                                            <span
                                                className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                                                style={{ animationDelay: "300ms" }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                                {attachedFiles.length > 0 && (
                                    <div className="mb-2 flex flex-wrap gap-2">
                                        {attachedFiles.map((f, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                            >
                                                <FileText size={11} className="text-primary-500" />
                                                <span className="max-w-[120px] truncate">{f.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setAttachedFiles((prev) =>
                                                            prev.filter((_, idx) => idx !== i)
                                                        )
                                                    }
                                                    className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-slate-700 dark:hover:text-primary-400"
                                        title="Joindre un fichier"
                                    >
                                        <Paperclip size={16} />
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
                                        onChange={handleInputChange}
                                        onKeyDown={handleKeyDown}
                                        rows={1}
                                        placeholder="Écrivez votre message..."
                                        className="max-h-28 flex-1 resize-none border-0 bg-transparent py-2 text-[13px] text-slate-800 placeholder:text-slate-400 outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
                                        style={{ outline: "none", boxShadow: "none" }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSend}
                                        disabled={
                                            (!input.trim() && attachedFiles.length === 0) || sending
                                        }
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
                                    >
                                        {sending ? (
                                            <Loader2 size={15} className="animate-spin" />
                                        ) : (
                                            <Send size={15} />
                                        )}
                                    </button>
                                </div>
                                <p className="mt-2 text-center text-[10px] text-slate-400 dark:text-slate-500">
                                    Appuyez sur{" "}
                                    <kbd className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-semibold dark:bg-slate-800">
                                        Entrée
                                    </kbd>{" "}
                                    pour envoyer,{" "}
                                    <kbd className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-semibold dark:bg-slate-800">
                                        Maj+Entrée
                                    </kbd>{" "}
                                    pour un saut de ligne
                                </p>
                            </div>
                        </>
                    )}
                </section>
            </div>

            <AnimatePresence>
                {showNewModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
                        onClick={() => setShowNewModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.96 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                        >
                            <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                                    <MessageSquare size={18} />
                                </div>
                                <div>
                                    <h2 className="text-[15px] font-bold text-slate-800 dark:text-white">
                                        Nouvelle conversation
                                    </h2>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Décrivez le sujet de votre échange
                                    </p>
                                </div>
                            </div>
                            <div className="p-6">
                                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Sujet
                                </label>
                                <input
                                    value={newSujet}
                                    onChange={(e) => setNewSujet(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleCreateConversation()}
                                    autoFocus
                                    placeholder="Ex : Question sur ma bourse"
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[13px] text-slate-700 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-primary-900/30"
                                />
                                <div className="mt-5 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowNewModal(false)}
                                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCreateConversation}
                                        disabled={!newSujet.trim()}
                                        className="rounded-lg bg-primary-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Créer la conversation
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}