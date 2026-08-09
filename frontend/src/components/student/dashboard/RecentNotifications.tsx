import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, FileText, FolderOpen, CalendarDays, Settings } from 'lucide-react';
import { formatRelative } from '../../../utils/format';
import { useEffect, useState } from "react";
import { getRecentNotifications } from "../../../services/student.service";

const categoryIcon: Record<string, typeof Bell> = {
  demande: FileText,
  document: FolderOpen,
  calendrier: CalendarDays,
  systeme: Settings,
  info: Bell,
  succes: FileText,
  alerte: CalendarDays,
  urgent: Settings,
};

export default function RecentNotifications() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getRecentNotifications();
        setItems(data);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  return (
    <div className="card h-[320px] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">
          Notifications récentes
        </h3>
        <Link
          to="/notifications"
          className="text-[12.5px] font-semibold text-primary-600 hover:text-primary-700"
        >
          Voir tout
        </Link>
      </div>

      <ul className="space-y-1">
        {items.slice(0, 4).map((item, i) => {
          const ItemIcon = item.read
            ? categoryIcon[item.category?.toLowerCase()] || Bell
            : Bell;
          const tileClass = item.read
            ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400";

          return (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
              className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tileClass}`}>
                <ItemIcon size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                    {item.title}
                  </p>
                  {!item.read && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  )}
                </div>
                <p className="line-clamp-1 text-[12px] text-slate-400">{item.message}</p>
              </div>
              <span className="shrink-0 whitespace-nowrap text-[11px] text-slate-400">
                {formatRelative(item.createdAt)}
              </span>
            </motion.li>
          );
        })}
      </ul>

      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-10">
          <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
            <Bell size={24} className="text-slate-400" />
          </div>
          <p className="text-[13px] text-slate-400 dark:text-slate-500">
            Aucune notification
          </p>
        </div>
      )}
    </div>
  );
}