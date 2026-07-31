import { motion } from 'framer-motion';
import Icon from '../../student/common/Icon';
import AnimatedCounter from '../../student/common/AnimatedCounter';
import type { StatCardData } from '../../../types';

interface StatCardProps {
  data: StatCardData;
  accent: 'blue' | 'sky' | 'indigo' | 'cyan';
  index?: number;
}

// All accents stay within the blue family to respect the academic blue & white theme —
// only the intensity/hue shifts slightly so the four cards stay visually distinct.
const accentStyles: Record<StatCardProps['accent'], { bg: string; text: string; line: string }> = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    line: '#2563EB',
  },
  sky: {
    bg: 'bg-sky-50 dark:bg-sky-500/10',
    text: 'text-sky-600 dark:text-sky-400',
    line: '#0EA5E9',
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    text: 'text-indigo-600 dark:text-indigo-400',
    line: '#4F46E5',
  },
  cyan: {
    bg: 'bg-cyan-50 dark:bg-cyan-500/10',
    text: 'text-cyan-600 dark:text-cyan-400',
    line: '#0891B2',
  },
};

function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (!points || points.length < 2) return null;
  const w = 96;
  const h = 28;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = i * step;
    const y = h - ((p - min) / range) * h;
    return [x, y] as const;
  });

  const linePath = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-24 overflow-visible">
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-${color.replace('#', '')})`} stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]} r="2.5" fill={color} />
    </svg>
  );
}

export default function StatCard({ data, accent, index = 0 }: StatCardProps) {
  const styles = accentStyles[accent];
  const numericValue = typeof data.value === 'number' ? data.value : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
      className="card group relative overflow-hidden p-5 transition-shadow duration-200 hover:shadow-softHover hover:ring-1 hover:ring-primary-100 dark:hover:ring-primary-500/20"
    >
      {/* Subtle corner wash in the card's accent, revealed on hover */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(circle, ${styles.line}14 0%, transparent 70%)` }}
        aria-hidden
      />

      <div className="relative flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${styles.bg} ${styles.text} transition-transform duration-200 group-hover:scale-110`}
        >
          <Icon name={data.icon} className="h-5 w-5" strokeWidth={2} />
        </div>

        {data.trend && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              data.trend.direction === 'up'
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
            }`}
          >
            {data.trend.direction === 'up' ? '+' : '-'}
            {data.trend.value}%
          </span>
        )}
      </div>

      <p className="relative mt-4 text-[28px] font-bold leading-none tracking-tight text-slate-900 dark:text-white">
        {numericValue !== null ? <AnimatedCounter value={numericValue} /> : data.value}
      </p>
      <p className="relative mt-2 text-[13.5px] font-semibold text-slate-700 dark:text-slate-200">
        {data.title}
      </p>

      <div className="relative mt-3 flex items-end justify-between gap-2">
        <p className="text-[12.5px] text-slate-400">{data.description}</p>
        {data.sparkline && <Sparkline points={data.sparkline} color={styles.line} />}
      </div>
    </motion.div>
  );
}
