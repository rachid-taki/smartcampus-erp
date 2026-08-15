import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { useUnreadCount } from "../../../hooks/useUnreadCount";

export default function MessagingStatCard() {
    const navigate = useNavigate();
    const unreadCount = useUnreadCount();

    return (
        <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => navigate("/student/messages")}
            className="card group flex items-center justify-between p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-primary-900/20"
        >
            <div className="flex items-center gap-3">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-primary-700 transition-colors group-hover:bg-primary-600 group-hover:text-white dark:bg-primary-900/30 dark:text-primary-300">
                    <MessageSquare size={17} />
                    {unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </div>
                <div>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Messagerie</p>
                    <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">
                        {unreadCount > 0 ? <>{unreadCount} non lu{unreadCount > 1 ? "s" : ""}</> : "À jour"}
                    </p>
                </div>
            </div>
            <div className="text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-primary-500 dark:text-slate-600">→</div>
        </motion.button>
    );
}