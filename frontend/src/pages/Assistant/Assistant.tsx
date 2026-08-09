import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bot,
    MessageSquarePlus,
    Send,
    Sparkles,
    User,
    Loader2,
    MessageSquare,
} from "lucide-react";
import {
    chatWithAssistant,
    getAssistantConversations,
    getAssistantMessages,
} from "../../services/assistant.service";
import type {
    AssistantConversation,
    AssistantMessage,
} from "../../services/assistant.service";

const SUGGESTIONS = [
    "Comment faire une demande d'attestation ?",
    "Je veux contester une note",
    "Quand sont les prochains examens ?",
    "Problème avec mon email académique",
    "Déposer un certificat médical",
    "Problème avec ma bourse",
];

export default function Assistant() {
    const [conversations, setConversations] = useState<AssistantConversation[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<AssistantMessage[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getAssistantConversations();
                setConversations(data);
            } catch (err) {
                console.error(err);
            }
        };
        load();
    }, []);

    useEffect(() => {
        if (!activeConvId) {
            setMessages([]);
            return;
        }
        const load = async () => {
            try {
                setLoadingHistory(true);
                const data = await getAssistantMessages(activeConvId);
                setMessages(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingHistory(false);
            }
        };
        load();
    }, [activeConvId]);

    useEffect(() => {
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [messages, loadingHistory]);

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
            const res = await chatWithAssistant({
                conversationId: activeConvId ?? undefined,
                message,
            });

            if (!activeConvId && res.conversationId) {
                setActiveConvId(res.conversationId);
            }

            const assistantMsg: AssistantMessage = {
                id: `assistant-${Date.now()}`,
                role: "Assistant",
                contenu: res.answer,
                dateEnvoi: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, assistantMsg]);

            if (!activeConvId) {
                setConversations((prev) => [
                    {
                        id: res.conversationId,
                        titre: message.slice(0, 60),
                        createdAt: new Date().toISOString(),
                        statut: "Active",
                    },
                    ...prev,
                ]);
            }
       } catch (err: any) {
    console.error("Erreur assistant:", err);
    const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Une erreur est survenue. Veuillez réessayer.";
    setMessages((prev) => [
        ...prev,
        {
            id: `error-${Date.now()}`,
            role: "Assistant",
            contenu: `⚠️ ${errorMessage}`,
            dateEnvoi: new Date().toISOString(),
        },
    ]);
} finally {
    setSending(false);
}
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleNewConversation = () => {
        setActiveConvId(null);
        setMessages([]);
        setInput("");
        inputRef.current?.focus();
    };

    return (
        <div className="animate-fade-in flex h-[calc(100vh-7rem)] flex-col overflow-hidden">
            <div className="flex items-center gap-2 pb-4">
                <span className="inline-flex h-7 w-1 rounded-full bg-slate-900 dark:bg-white" />
                <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white">
                    Assistant IA
                </h1>
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                    <Sparkles size={11} />
                    SmartCampus
                </span>
            </div>

            <div className="flex flex-1 gap-4 overflow-hidden">
                <aside className="card flex w-64 shrink-0 flex-col overflow-hidden p-3">
                    <button
                        onClick={handleNewConversation}
                        className="mb-3 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-[12.5px] font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                    >
                        <MessageSquarePlus size={14} />
                        Nouvelle conversation
                    </button>

                    <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Historique
                    </p>

                    <div className="flex-1 space-y-1 overflow-y-auto pr-1">
                        {conversations.length === 0 ? (
                            <p className="px-2 py-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
                                Aucune conversation
                            </p>
                        ) : (
                            conversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => setActiveConvId(conv.id)}
                                    className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] transition ${
                                        activeConvId === conv.id
                                            ? "bg-primary-50 font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                                            : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                                    }`}
                                >
                                    <MessageSquare size={13} className="shrink-0 opacity-60" />
                                    <span className="line-clamp-1 flex-1">{conv.titre}</span>
                                </button>
                            ))
                        )}
                    </div>
                </aside>

                <main className="card flex flex-1 flex-col overflow-hidden p-0">
                    <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                        {messages.length === 0 && !loadingHistory && (
                            <div className="flex h-full flex-col items-center justify-center text-center">
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-500/30">
                                    <Bot size={28} />
                                </div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Bonjour, comment puis-je vous aider ?
                                </h2>
                                <p className="mt-1 max-w-md text-[13px] text-slate-500 dark:text-slate-400">
                                    Posez-moi une question sur vos demandes, réclamations, le calendrier académique, vos documents ou votre compte.
                                </p>

                                <div className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
                                    {SUGGESTIONS.map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => handleSend(s)}
                                            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-[12.5px] font-medium text-slate-700 transition hover:border-primary-300 hover:bg-primary-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-primary-700 dark:hover:bg-primary-900/20"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {loadingHistory && (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 size={20} className="animate-spin text-slate-400" />
                            </div>
                        )}

                        <AnimatePresence initial={false}>
                            {messages.map((msg, i) => (
                                <motion.div
                                    key={msg.id ?? i}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className={`flex items-start gap-3 ${
                                        msg.role === "User" ? "flex-row-reverse" : ""
                                    }`}
                                >
                                    <div
                                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                                            msg.role === "User"
                                                ? "bg-primary-600 text-white"
                                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                        }`}
                                    >
                                        {msg.role === "User" ? <User size={14} /> : <Bot size={14} />}
                                    </div>
                                    <div
                                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                                            msg.role === "User"
                                                ? "bg-primary-600 text-white"
                                                : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                                        }`}
                                    >
                                        {msg.contenu}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {sending && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-start gap-3"
                            >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    <Bot size={14} />
                                </div>
                                <div className="flex gap-1 rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
                                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "0ms" }} />
                                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "150ms" }} />
                                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "300ms" }} />
                                </div>
                            </motion.div>
                        )}
                    </div>

                    <div className="border-t border-slate-100 p-4 dark:border-slate-800">
                        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2  focus-within:ring-primary-100 dark:border-slate-700 dark:bg-slate-800  ">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={1}
                                placeholder="Écrivez votre message..."
                                className="max-h-32 flex-1 resize-none bg-transparent py-2 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim() || sending}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                            </button>
                        </div>
                        <p className="mt-2 text-center text-[10.5px] text-slate-400 dark:text-slate-500">
                            Assistant basé sur des règles · Les réponses sont informatives et ne remplacent pas un service officiel.
                        </p>
                    </div>
                </main>
            </div>
        </div>
    );
}