import { useEffect, useState } from "react";
import { getConversations } from "../services/messaging.service";

export function useUnreadCount() {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const fetchUnread = async () => {
            try {
                const conversations = await getConversations();
                const total = conversations.reduce(
                    (sum: number, c: any) => sum + (c.nonLus || 0),
                    0
                );
                setUnreadCount(total);
            } catch (err) {
                console.error("Erreur compteur non-lus:", err);
            }
        };

        fetchUnread();
        const interval = setInterval(fetchUnread, 10000); // toutes les 10s
        return () => clearInterval(interval);
    }, []);

    return unreadCount;
}