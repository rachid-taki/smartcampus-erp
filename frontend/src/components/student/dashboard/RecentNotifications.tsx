import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, FileText, FolderOpen, CalendarDays, Settings } from 'lucide-react';
import type { AppNotification, NotificationCategory } from '../../../types';
import { formatRelative } from '../../../utils/format';

interface RecentNotificationsProps {
  items: AppNotification[];
}

const categoryIcon: Record<NotificationCategory, typeof Bell> = {
  demande: FileText,
  document: FolderOpen,
  calendrier: CalendarDays,
  systeme: Settings,
};

export default function RecentNotifications({ items }: RecentNotificationsProps) {
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
          const ItemIcon = categoryIcon[item.category];
          return (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
              className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <ItemIcon size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                    {item.title}
                  </p>
                  {!item.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600" />}
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
    </div>
  );
}
