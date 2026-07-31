import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CalendarDays, GraduationCap } from 'lucide-react';
interface Announcement {
  id: string;
  title: string;
  description: string;
  date: string;
  category: string;
  isNew: boolean;
}

interface Props {
  announcements: Announcement[];
}


export default function UniversityAnnouncements({
  announcements,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-2"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-bold text-slate-800 dark:text-white">
          📢 Annonces académiques
        </h3>

        <Link
          to="/annonces"
          className="text-[10px] font-semibold text-primary-600 hover:text-primary-700"
        >
          Voir tout
        </Link>
      </div>

      <div className="space-y-2">
        {announcements.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-1 transition-all duration-300 hover:border-primary-300 hover:bg-white hover:shadow-md dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
          >
            <div className="flex gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-500/20">
                <GraduationCap size={16} />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-slate-800 dark:text-white">
                    {item.title}
                  </h4>

                  {item.isNew && (
                    <span className="rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      NOUVEAU
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {item.description}
                </p>

                <div className="mt-3 flex items-center gap-5 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <CalendarDays size={13} />
                    {item.date}
                  </span>

                  <span>{item.category}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
