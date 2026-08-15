import { motion } from "framer-motion";
import { Hourglass } from "lucide-react";
import { getCurrentStudent } from "../../../services/student.service";
import { useEffect, useState } from "react";

export default function SemesterProgress() {
  const [student, setStudent] = useState<any>(null);

  useEffect(() => {
    const loadStudent = async () => {
      try {
        const data = await getCurrentStudent();
        setStudent(data.user);
      } catch (err) { console.error(err); }
    };
    loadStudent();
  }, []);

  const today = new Date();
  const year = today.getFullYear();
  let semester = "";
  let start: Date;
  let end: Date;

  if (today >= new Date(year, 8, 1) || today <= new Date(year, 0, 31)) {
    semester = "S1";
    if (today.getMonth() >= 8) { start = new Date(year, 8, 1); end = new Date(year + 1, 0, 31); }
    else { start = new Date(year - 1, 8, 1); end = new Date(year, 0, 31); }
  } else if (today >= new Date(year, 1, 1) && today <= new Date(year, 5, 30)) {
    semester = "S2";
    start = new Date(year, 1, 1);
    end = new Date(year, 5, 30);
  } else {
    semester = "Vacances d'été";
    start = new Date(year, 6, 1);
    end = new Date(year, 7, 31);
  }

  const total = end.getTime() - start.getTime();
  const elapsed = today.getTime() - start.getTime();
  const pct = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000));

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

  return (
    <div className="card flex h-full flex-col p-4">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Progression du semestre</h3>
          <p className="mt-0.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">{fmt(start)} → {fmt(end)}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          semester === "S1" ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
            : semester === "S2" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
            : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
        }`}>{semester}</span>
      </div>

      <div className="flex flex-1 items-center gap-4">
        <div className="relative flex h-[100px] w-[100px] shrink-0 items-center justify-center">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="10" />
            <motion.circle cx="60" cy="60" r={radius} fill="none" stroke="#2563EB" strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ duration: 1, ease: "easeOut" }} />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-xl font-bold leading-none text-slate-900 dark:text-white">{pct}%</span>
            <span className="text-[9.5px] text-slate-400">complété</span>
          </div>
        </div>

        <div className="flex-1 space-y-2.5">
          <div>
            <p className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Filière</p>
            <p className="mt-0.5 text-[12px] font-semibold text-slate-700 dark:text-slate-200">{student?.filiere ?? "—"} · {student?.niveau ?? "—"}</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 dark:bg-blue-500/10">
            <Hourglass size={12} className="text-primary-700 dark:text-primary-300" />
            <p className="text-[11px] font-semibold text-primary-700 dark:text-primary-300">{daysLeft} jours restants</p>
          </div>
        </div>
      </div>
    </div>
  );
}