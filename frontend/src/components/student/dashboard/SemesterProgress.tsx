import { motion } from 'framer-motion';
import { currentStudent } from '../../../data/dummyData';

// Semester window used purely for the progress illustration (dummy academic calendar).
const SEMESTER_START = new Date('2026-02-02');
const SEMESTER_END = new Date('2026-08-31');
const TODAY = new Date('2026-07-30');

function computeProgress() {
  const total = SEMESTER_END.getTime() - SEMESTER_START.getTime();
  const elapsed = TODAY.getTime() - SEMESTER_START.getTime();
  const pct = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  const daysLeft = Math.max(0, Math.ceil((SEMESTER_END.getTime() - TODAY.getTime()) / 86400000));
  return { pct, daysLeft };
}

export default function SemesterProgress() {
  const { pct, daysLeft } = computeProgress();
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="card p-5">
      <h3 className="mb-4 text-[14px] font-bold text-slate-800 dark:text-slate-100">
        Progression du semestre
      </h3>

      <div className="flex items-center gap-5">
        <div className="relative flex h-[120px] w-[120px] shrink-0 items-center justify-center">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-slate-100 dark:text-slate-800"
              strokeWidth="10"
            />
            <motion.circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="#2563EB"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-[22px] font-bold leading-none text-slate-900 dark:text-white">
              {pct}%
            </span>
            <span className="text-[10.5px] text-slate-400">complété</span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <p className="text-[12px] text-slate-400">Filière</p>
            <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
              {currentStudent.filiere.split(' — ')[0]} · {currentStudent.niveau}
            </p>
          </div>
          <div>
            <p className="text-[12px] text-slate-400">Semestre en cours</p>
            <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
              {currentStudent.semestre}
            </p>
          </div>
          <div className="rounded-lg bg-blue-50 px-3 py-2 dark:bg-blue-500/10">
            <p className="text-[12px] font-semibold text-primary-700 dark:text-primary-300">
              {daysLeft} jours restants
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
