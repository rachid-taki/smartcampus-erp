import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    Bot,
    MessageSquarePlus,
    MessageSquare,
    Send,
    Sparkles,
    User,
    Loader2,
    X,
} from "lucide-react";
import {
    chatWithAssistant,
    getAssistantMessages,
} from "../../services/assistant.service";
import type { AssistantMessage } from "../../services/assistant.service";
import { searchKnowledge } from "../../services/student.service";
import { useUnreadCount } from "../../hooks/useUnreadCount";

const SUGGESTIONS = [
    "Faire une demande d'attestation",
    "Contester une note",
    "Prochains examens",
    "Problème email académique",
    "Déposer certificat médical",
    "Problème bourse",
];

export default function AssistantWidget() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<AssistantMessage[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const unreadCount = useUnreadCount();

    useEffect(() => {
        if (!open || !conversationId) return;
        const load = async () => {
            try {
                setLoadingHistory(true);
                const data = await getAssistantMessages(conversationId);
                setMessages(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingHistory(false);
            }
        };
        load();
    }, [open, conversationId]);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    useEffect(() => {
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [messages, loadingHistory]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleNewConversation = () => {
        setConversationId(null);
        setMessages([]);
        setInput("");
        inputRef.current?.focus();
    };

    const handleSend = async (text?: string) => {
        const message = (text ?? input).trim();
        if (!message || sending) return;

        setInput("");
        setSending(true);

        const userMsg: AssistantMessage = {
            id: `temp-${Date.now()}`,
            role: "User",
            contenu: message,
            dateEnvoi: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMsg]);

        try {
            const knowledgeResults = await searchKnowledge(message);
            let response = "";
            let action = null;

            if (knowledgeResults.length > 0 && knowledgeResults[0].relevance > 0.1) {
                const bestResult = knowledgeResults[0];
                response = `📚 **${bestResult.titre}**\n\n${bestResult.contenu}`;
                if (knowledgeResults.length > 1) {
                    response += `\n\n📖 Autres résultats :\n`;
                    knowledgeResults.slice(1).forEach((r: any) => {
                        response += `• ${r.titre}\n`;
                    });
                }
            } else {
                const res = await chatWithAssistant({
                    conversationId: conversationId ?? undefined,
                    message,
                });
                if (!conversationId && res.conversationId) {
                    setConversationId(res.conversationId);
                }
                response = res.answer;
                action = res.action || null;
            }

            setMessages((prev) => [
                ...prev,
                {
                    id: `assistant-${Date.now()}`,
                    role: "Assistant",
                    contenu: response,
                    dateEnvoi: new Date().toISOString(),
                    action,
                },
            ]);
        } catch (err: any) {
            console.error(err);
            setMessages((prev) => [
                ...prev,
                {
                    id: `error-${Date.now()}`,
                    role: "Assistant",
                    contenu: "⚠️ Une erreur est survenue.",
                    dateEnvoi: new Date().toISOString(),
                },
            ]);
        } finally {
            setSending(false);
        }
    };

    const handleAction = (url: string) => {
        setOpen(false);
        navigate(url);
    };

    return (
        <>
            {/* Conteneur vertical des 2 boutons */}
            <div className="fixed bottom-16 right-4 z-40 flex flex-col items-center gap-3 sm:right-6">
                
                {/* Icône Messagerie - AU-DESSUS du chatbot */}
                <motion.button
                    onClick={() => {
                        setOpen(false);
                        navigate("/student/messages");
                    }}
                    animate={{
                        // Quand le chat s'ouvre, se déplace vers le header du chatbot
                        // Position : top du header + centrage vertical
                        y: open ? 68 : 0,
                        x: open ? -120 : 0,
                    }}
                    transition={{
                        type: "spring",
                        stiffness: 280,
                        damping: 28,
                    }}
                    className="relative flex h-15 w-15 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-xl shadow-primary-500/30 transition hover:scale-105 hover:shadow-2xl hover:shadow-primary-500/40 active:scale-95"
                    aria-label="Ouvrir la messagerie"
                >
                    <MessageSquare size={22} strokeWidth={2.5} />
                    {unreadCount > 0 && (
                        <>
                            {/* Halo pulsant */}
                            <motion.span
                                className="absolute -right-0.5 -top-0.5 h-5 w-5 rounded-full bg-rose-500 opacity-60"
                                animate={{
                                    scale: [1, 1.5, 1],
                                    opacity: [0.6, 0, 0.6],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                            />
                            {/* Badge nombre */}
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                                className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900"
                            >
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </motion.span>
                        </>
                    )}
                </motion.button>

                {/* Bouton Assistant IA */}
                <motion.button
                    onClick={() => setOpen(!open)}
                    className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-xl shadow-primary-500/30 transition hover:scale-105 hover:shadow-2xl hover:shadow-primary-500/40 active:scale-95"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Ouvrir l'assistant"
                >
                    <AnimatePresence mode="wait">
                        {open ? (
                            <motion.div
                                key="close"
                                initial={{ rotate: -90, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                exit={{ rotate: 90, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                            >
                                <X size={22} strokeWidth={2.5} />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="bot"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                            >
                                <Bot size={22} strokeWidth={2.5} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!open && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow-md ring-2 ring-white dark:ring-slate-900">
                            IA
                        </span>
                    )}
                </motion.button>
            </div>

            {/* Chat popup */}
            <AnimatePresence>
                {open && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setOpen(false)}
                            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm sm:hidden"
                        />

                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="fixed bottom-34 right-4 z-40 flex h-[540px] w-[calc(100vw-2rem)] max-w-[380px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:right-6 sm:h-[580px]"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-3 dark:from-primary-700 dark:to-primary-800">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm">
                                        <Bot size={17} strokeWidth={2} />
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-bold text-white">
                                            Assistant SmartCampus
                                        </p>
                                        <p className="flex items-center gap-1 text-[10px] text-primary-100">
                                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                                            En ligne
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={handleNewConversation}
                                        title="Nouvelle conversation"
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
                                    >
                                        <MessageSquarePlus size={15} />
                                    </button>
                                    <button
                                        onClick={() => setOpen(false)}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Messages area */}
                            <div
                                ref={scrollRef}
                                className="flex-1 space-y-3 overflow-y-auto px-3 py-4"
                            >
                                {messages.length === 0 && !loadingHistory && (
                                    <div className="flex h-full flex-col items-center justify-center text-center">
                                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-500/30">
                                            <Sparkles size={20} />
                                        </div>
                                        <p className="text-[13px] font-bold text-slate-900 dark:text-white">
                                            Bonjour ! 👋
                                        </p>
                                        <p className="mt-1 max-w-[240px] text-[11.5px] text-slate-500 dark:text-slate-400">
                                            Comment puis-je vous aider aujourd'hui ?
                                        </p>

                                        <div className="mt-4 grid w-full grid-cols-1 gap-1.5">
                                            {SUGGESTIONS.map((s) => (
                                                <button
                                                    key={s}
                                                    onClick={() => handleSend(s)}
                                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-[11.5px] font-medium text-slate-700 transition hover:border-primary-300 hover:bg-primary-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-primary-700 dark:hover:bg-primary-900/20"
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {loadingHistory && (
                                    <div className="flex items-center justify-center py-10">
                                        <Loader2 size={18} className="animate-spin text-slate-400" />
                                    </div>
                                )}

                                <AnimatePresence initial={false}>
                                    {messages.map((msg, i) => (
                                        <motion.div
                                            key={msg.id ?? i}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.15 }}
                                            className={`flex items-start gap-2 ${
                                                msg.role === "User" ? "flex-row-reverse" : ""
                                            }`}
                                        >
                                            <div
                                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                                                    msg.role === "User"
                                                        ? "bg-primary-600 text-white"
                                                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                                }`}
                                            >
                                                {msg.role === "User" ? (
                                                    <User size={12} />
                                                ) : (
                                                    <Bot size={12} />
                                                )}
                                            </div>
                                            <div className="max-w-[78%] space-y-1.5">
                                                <div
                                                    className={`rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed ${
                                                        msg.role === "User"
                                                            ? "bg-primary-600 text-white"
                                                            : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                                                    }`}
                                                >
                                                    {msg.contenu}
                                                </div>

                                                {msg.role === "Assistant" && msg.action && (
                                                    <button
                                                        onClick={() => handleAction(msg.action!.url)}
                                                        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-primary-700 active:scale-[0.98]"
                                                    >
                                                        {msg.action.label}
                                                        <Send size={11} />
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {sending && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex items-start gap-2"
                                    >
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                            <Bot size={12} />
                                        </div>
                                        <div className="flex gap-1 rounded-2xl bg-slate-100 px-3 py-2.5 dark:bg-slate-800">
                                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "0ms" }} />
                                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "150ms" }} />
                                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "300ms" }} />
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* Input */}
                            <div className="border-t border-slate-100 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex items-end gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:border-primary-600 dark:focus-within:ring-primary-900/30">
                                    <textarea
                                        ref={inputRef}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        rows={1}
                                        placeholder="Écrivez votre message..."
                                        className="max-h-24 flex-1 border-none resize-none bg-transparent py-1.5 text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
                                    />
                                    <button
                                        onClick={() => handleSend()}
                                        disabled={!input.trim() || sending}
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {sending ? (
                                            <Loader2 size={13} className="animate-spin" />
                                        ) : (
                                            <Send size={13} />
                                        )}
                                    </button>
                                </div>
                                <p className="mt-1.5 text-center text-[9.5px] text-slate-400 dark:text-slate-500">
                                    Assistant IA · SmartCampus ERP
                                </p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}