import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Bot, MessageSquarePlus, MessageSquare, Send, Sparkles, User, Loader2, X } from "lucide-react";
import { chatWithAssistant, getAssistantMessages } from "../../services/assistant.service";
import type { AssistantMessage } from "../../services/assistant.service";
import { searchKnowledge } from "../../services/student.service";
import { useUnreadCount } from "../../hooks/useUnreadCount";

const SUGGESTIONS = ["Bonjour", "Faire une demande", "Mes notes", "Calendrier", "Contacter la scolarité", "Menu"];

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

    const renderInline = (text: string, keyPrefix: string) => {
        const parts = text.split(/\*\*(.+?)\*\*/g);
        return parts.map((part, i) =>
            i % 2 === 1 ? (
                <strong key={`${keyPrefix}-${i}`} className="font-semibold text-slate-900 dark:text-white">{part}</strong>
            ) : (
                <span key={`${keyPrefix}-${i}`}>{part}</span>
            )
        );
    };

    const RichText = ({ text }: { text: string }) => {
        const lines = text.split("\n");
        return (
            <div className="space-y-0.5">
                {lines.map((line, i) => {
                    const trimmed = line.trim();
                    if (trimmed === "") return <div key={i} className="h-1.5" />;
                    const isBullet = trimmed.startsWith("•") || trimmed.startsWith("-");
                    return (
                        <p key={i} className={isBullet ? "flex items-start gap-1.5 pl-1" : ""}>
                            {isBullet && <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary-500" />}
                            <span>{renderInline(isBullet ? trimmed.slice(1).trim() : trimmed, `l${i}`)}</span>
                        </p>
                    );
                })}
            </div>
        );
    };

    const IDLE_DELAY = 15 * 60 * 1000;
    const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const resetIdle = () => {
        if (idleTimer.current) clearTimeout(idleTimer.current);
        idleTimer.current = setTimeout(() => {
            setConversationId(null);
            setMessages([]);
            setInput("");
        }, IDLE_DELAY);
    };

    useEffect(() => {
        resetIdle();
        return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
    }, []);

    useEffect(() => {
        if (!open || !conversationId) return;
        const load = async () => {
            try {
                setLoadingHistory(true);
                const data = await getAssistantMessages(conversationId);
                setMessages(data);
            } catch (err) { console.error(err); }
            finally { setLoadingHistory(false); }
        };
        load();
    }, [open, conversationId]);

    useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, loadingHistory]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
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
        resetIdle();

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
                    knowledgeResults.slice(1).forEach((r: any) => { response += `• ${r.titre}\n`; });
                }
            } else {
                const res = await chatWithAssistant({
                    conversationId: conversationId ?? undefined,
                    message,
                });
                if (!conversationId && res.conversationId) setConversationId(res.conversationId);
                response = res.answer;
                action = res.action || null;
            }

            setMessages((prev) => [...prev, {
                id: `assistant-${Date.now()}`,
                role: "Assistant",
                contenu: response,
                dateEnvoi: new Date().toISOString(),
                action,
            }]);
        } catch (err: any) {
            console.error(err);
            setMessages((prev) => [...prev, {
                id: `error-${Date.now()}`,
                role: "Assistant",
                contenu: "⚠️ Une erreur est survenue.",
                dateEnvoi: new Date().toISOString(),
            }]);
        } finally { setSending(false); }
    };

    const handleAction = (url: string) => { setOpen(false); navigate(url); };

    return (
        <>
            <div className="fixed bottom-16 right-4 z-40 flex flex-col items-center gap-3 sm:right-6">
                <motion.button
                    onClick={() => { setOpen(false); navigate("/student/messages"); }}
                    animate={{ y: open ? 61 : 0, x: open ? -90 : 0 }}
                    transition={{ type: "spring", stiffness: 280, damping: 28 }}
                    className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-xl shadow-primary-500/30 transition hover:scale-105 hover:shadow-2xl hover:shadow-primary-500/40 active:scale-95"
                    aria-label="Ouvrir la messagerie"
                >
                    <MessageSquare size={19} strokeWidth={2.5} />
                    {unreadCount > 0 && (
                        <>
                            <motion.span
                                className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full bg-rose-500 opacity-60"
                                animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                                className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900"
                            >
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </motion.span>
                        </>
                    )}
                </motion.button>

                <motion.button
                    onClick={() => { setOpen(!open); resetIdle(); }}
                    className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-xl shadow-primary-500/30 transition hover:scale-105 hover:shadow-2xl hover:shadow-primary-500/40 active:scale-95"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Ouvrir l'assistant"
                >
                    <AnimatePresence mode="wait">
                        {open ? (
                            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                                <X size={19} strokeWidth={2.5} />
                            </motion.div>
                        ) : (
                            <motion.div key="bot" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.15 }}>
                                <Bot size={19} strokeWidth={2.5} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {!open && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white shadow-md ring-2 ring-white dark:ring-slate-900">IA</span>
                    )}
                </motion.button>
            </div>

            <AnimatePresence>
                {open && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm sm:hidden" />

                       <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="fixed bottom-32 right-4 z-40 flex h-auto max-h-[calc(100vh-9rem)] w-[calc(100vw-2rem)] max-w-[360px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:right-6"
                    >
                            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-primary-600 to-primary-700 px-3 py-2.5 dark:from-primary-700 dark:to-primary-800">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white backdrop-blur-sm">
                                        <Bot size={15} strokeWidth={2} />
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-bold text-white">Assistant SmartCampus</p>
                                        <p className="flex items-center gap-0.5 text-[9.5px] text-primary-100">
                                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                                            En ligne
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-0.5">
                                    <button onClick={handleNewConversation} title="Nouvelle conversation" className="flex h-7 w-7 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white">
                                        <MessageSquarePlus size={13} />
                                    </button>
                                    <button onClick={() => setOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white">
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>

                            <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto px-2.5 py-3">
                                {messages.length === 0 && !loadingHistory && (
                                    <div className="flex h-full flex-col items-center justify-center text-center">
                                        <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-500/30">
                                            <Sparkles size={17} />
                                        </div>
                                        <p className="text-[12px] font-bold text-slate-900 dark:text-white">Bonjour ! 👋</p>
                                        <p className="mt-0.5 max-w-[220px] text-[11px] text-slate-500 dark:text-slate-400">Comment puis-je vous aider aujourd'hui ?</p>
                                        <div className="mt-3 grid w-full grid-cols-1 gap-1">
                                            {SUGGESTIONS.map((s) => (
                                                <button key={s} onClick={() => handleSend(s)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-[11px] font-medium text-slate-700 transition hover:border-primary-300 hover:bg-primary-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-primary-700 dark:hover:bg-primary-900/20">
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {loadingHistory && (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 size={16} className="animate-spin text-slate-400" />
                                    </div>
                                )}

                                <AnimatePresence initial={false}>
                                    {messages.map((msg, i) => {
                                        const isUser = msg.role === "User";
                                        return (
                                            <motion.div
                                                key={msg.id ?? i}
                                                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ duration: 0.18, ease: "easeOut" }}
                                                className={`flex items-end gap-1.5 ${isUser ? "flex-row-reverse" : ""}`}
                                            >
                                                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${isUser ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                                                    {isUser ? <User size={11} /> : <Bot size={11} />}
                                                </div>
                                                <div className={`max-w-[80%] space-y-1 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
                                                    <div className={`px-3 py-2 text-[12px] leading-relaxed shadow-sm ${isUser ? "rounded-2xl rounded-br-sm bg-gradient-to-br from-primary-600 to-primary-700 text-white" : "rounded-2xl rounded-bl-sm bg-white text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700"}`}>
                                                        {isUser ? <p className="whitespace-pre-wrap">{msg.contenu}</p> : <RichText text={msg.contenu} />}
                                                    </div>

                                                    {msg.role === "Assistant" && msg.action && (
                                                        <button onClick={() => handleAction(msg.action!.url)} className="flex w-full items-center justify-center gap-1 rounded-lg bg-primary-600 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-primary-700 active:scale-[0.98]">
                                                            {msg.action.label}
                                                            <Send size={10} />
                                                        </button>
                                                    )}

                                                    {msg.role === "Assistant" && msg.quickReplies && msg.quickReplies.length > 0 && i === messages.length - 1 && (
                                                        <div className="flex flex-wrap gap-1 pt-0.5">
                                                            {msg.quickReplies.map((qr) => (
                                                                <button key={qr} type="button" onClick={() => handleSend(qr)} className="rounded-full border border-primary-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-primary-700 shadow-sm transition hover:bg-primary-50 active:scale-95 dark:border-primary-800 dark:bg-slate-800 dark:text-primary-300 dark:hover:bg-primary-900/20">
                                                                    {qr}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <p className={`px-1 text-[9px] text-slate-400 dark:text-slate-500 ${isUser ? "text-right" : "text-left"}`}>
                                                        {new Date(msg.dateEnvoi).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>

                                {sending && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-1.5">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                            <Bot size={11} />
                                        </div>
                                        <div className="flex gap-0.5 rounded-2xl bg-slate-100 px-2.5 py-2 dark:bg-slate-800">
                                            <span className="h-1 w-1 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "0ms" }} />
                                            <span className="h-1 w-1 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "150ms" }} />
                                            <span className="h-1 w-1 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "300ms" }} />
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            <div className="border-t border-slate-100 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex items-end gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:border-primary-600 dark:focus-within:ring-primary-900/30">
                                    <textarea
                                        ref={inputRef}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        rows={1}
                                        placeholder="Écrivez votre message..."
                                        className="max-h-20 flex-1 border-none resize-none bg-transparent py-1 text-[12px] text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
                                    />
                                    <button onClick={() => handleSend()} disabled={!input.trim() || sending} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40">
                                        {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                    </button>
                                </div>
                                <p className="mt-1 text-center text-[9px] text-slate-400 dark:text-slate-500">Assistant IA · SmartCampus ERP</p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}