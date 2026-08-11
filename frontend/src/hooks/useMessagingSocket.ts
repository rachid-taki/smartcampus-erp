import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { Message } from "../services/messaging.service";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

interface UseMessagingSocketReturn {
    isConnected: boolean;
    sendMessage: (conversationId: string, contenu: string) => void;
    joinConversation: (conversationId: string) => void;
    leaveConversation: (conversationId: string) => void;
    markAsRead: (conversationId: string) => void;
    startTyping: (conversationId: string) => void;
    stopTyping: (conversationId: string) => void;
    onNewMessage: (handler: (msg: Message) => void) => () => void;
    onConversationsRefresh: (handler: () => void) => () => void;
    onTypingUpdate: (handler: (data: any) => void) => () => void;
}

export function useMessagingSocket(): UseMessagingSocketReturn {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const handlersRef = useRef({
        newMessage: new Set<(msg: Message) => void>(),
        conversationsRefresh: new Set<() => void>(),
        typingUpdate: new Set<(data: any) => void>(),
    });

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("🔌 WebSocket connecté");
            setIsConnected(true);
        });

        socket.on("disconnect", (reason) => {
            console.log("🔌 WebSocket déconnecté :", reason);
            setIsConnected(false);
        });

        socket.on("connect_error", (err) => {
            console.error(" Erreur connexion WebSocket :", err.message);
        });

        socket.on("message:new", (msg: Message) => {
            handlersRef.current.newMessage.forEach((h) => h(msg));
        });

        socket.on("conversations:refresh", () => {
            handlersRef.current.conversationsRefresh.forEach((h) => h());
        });

        socket.on("typing:update", (data: any) => {
            handlersRef.current.typingUpdate.forEach((h) => h(data));
        });

        socket.on("user:online", (data) => console.log("🟢 En ligne :", data));
        socket.on("user:offline", (data) => console.log("🔴 Hors ligne :", data));

        return () => {
            socket.disconnect();
        };
    }, []);

    const sendMessage = useCallback((conversationId: string, contenu: string) => {
        socketRef.current?.emit("message:send", { conversationId, contenu });
    }, []);

    const joinConversation = useCallback((conversationId: string) => {
        socketRef.current?.emit("conversation:join", conversationId);
    }, []);

    const leaveConversation = useCallback((conversationId: string) => {
        socketRef.current?.emit("conversation:leave", conversationId);
    }, []);

    const markAsRead = useCallback((conversationId: string) => {
        socketRef.current?.emit("message:read", { conversationId });
    }, []);

    const startTyping = useCallback((conversationId: string) => {
        socketRef.current?.emit("typing:start", { conversationId });
    }, []);

    const stopTyping = useCallback((conversationId: string) => {
        socketRef.current?.emit("typing:stop", { conversationId });
    }, []);

    const onNewMessage = useCallback((handler: (msg: Message) => void) => {
        handlersRef.current.newMessage.add(handler);
        return () => handlersRef.current.newMessage.delete(handler);
    }, []);

    const onConversationsRefresh = useCallback((handler: () => void) => {
        handlersRef.current.conversationsRefresh.add(handler);
        return () => handlersRef.current.conversationsRefresh.delete(handler);
    }, []);

    const onTypingUpdate = useCallback((handler: (data: any) => void) => {
        handlersRef.current.typingUpdate.add(handler);
        return () => handlersRef.current.typingUpdate.delete(handler);
    }, []);

    return {
        isConnected,
        sendMessage,
        joinConversation,
        leaveConversation,
        markAsRead,
        startTyping,
        stopTyping,
        onNewMessage,
        onConversationsRefresh,
        onTypingUpdate,
    };
}