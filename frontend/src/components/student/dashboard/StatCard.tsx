import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp } from 'lucide-react';
import Icon from '../../student/common/Icon';
import AnimatedCounter from '../../student/common/AnimatedCounter';
import type { StatCardData } from '../../../types';



interface StatCardProps {
  data: StatCardData;
  accent: 'blue' | 'sky' | 'indigo' | 'cyan';
  index?: number;
}

const accentStyles: Record<
  StatCardProps['accent'],
  { bg: string; text: string; border: string }
> = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-l-4 border-l-blue-500',
  },
  sky: {
    bg: 'bg-sky-50 dark:bg-sky-500/10',
    text: 'text-sky-600 dark:text-sky-400',
    border: 'border-l-4 border-l-sky-500',
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-l-4 border-l-indigo-500',
  },
  cyan: {
    bg: 'bg-cyan-50 dark:bg-cyan-500/10',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-l-4 border-l-cyan-500',
  },
};

export default function StatCard({ data, accent, index = 0 }: StatCardProps) {
  const styles = accentStyles[accent] ?? accentStyles.blue;
  const numericValue = typeof data.value === 'number' ? data.value : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
      className={`card group relative flex h-full flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft-hover ${styles.border}`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles.bg} ${styles.text} transition-transform duration-200 group-hover:scale-110`}
        >
          <Icon name={data.icon} className="h-5 w-5" strokeWidth={2} />
        </div>

        {data.trend && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              data.trend.direction === 'up'
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
            }`}
          >
            {data.trend.direction === 'up' ? (
              <TrendingUp size={12} />
            ) : (
              <TrendingDown size={12} />
            )}
            {data.trend.value}%
          </span>
        )}
      </div>

      <div className="mt-4">
        <p className="text-[26px] font-extrabold leading-none tracking-tight text-slate-900 dark:text-white">
          {numericValue !== null ? (
            <AnimatedCounter value={numericValue} />
          ) : (
            data.value
          )}
        </p>
        <p className="mt-1.5 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
          {data.title}
        </p>
      </div>

      <div className="mt-auto pt-4">
        <p className="border-t border-slate-100 pt-3 text-[12px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
          {data.description}
        </p>
      </div>
    </motion.div>
  );
}