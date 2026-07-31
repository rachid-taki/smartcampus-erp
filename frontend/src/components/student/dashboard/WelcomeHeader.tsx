import { motion } from 'framer-motion';
import { CalendarClock } from 'lucide-react';
import { Plus, Download } from 'lucide-react';
import { currentStudent, calendarEvents } from '../../../data/dummyData';
import welcomeBg from '../../../assets/students_portail.png';
import { useEffect, useState } from "react";
import { getCurrentStudent } from "../../../services/student.service";




 
export default function WelcomeHeader() {
  const today = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date('2026-07-30'));

  const todayLabel = today.charAt(0).toUpperCase() + today.slice(1);
  // const nextExam = calendarEvents.find((e) => e.kind === 'exam');
  const [student, setStudent] = useState<any>(null);
  useEffect(() => {
    const loadStudent = async () => {
        try {
            const data = await getCurrentStudent();
            console.log("Student:", data);

            setStudent(data.user);
        } catch (err) {
            console.error(err);
        }
    };

    loadStudent();
}, []);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="card relative overflow-hidden p-6 sm:p-8"
      
    >
     
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-300/70 dark:bg-primary-500/30"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-6 bottom-[-60px] h-40 w-40 rounded-full bg-sky-600/20 dark:bg-sky-500/50"
        aria-hidden
      />

      <img
          src={welcomeBg}
          alt=""
          className="pointer-events-none absolute bottom-0 right-12 w-60 opacity-90 select-none"
        />

      <div className="relative z-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          {/* <p className="text-[13px] font-semibold text-slate-400">{todayLabel}</p> */}
           <span className="inline-flex items-center gap-2 rounded-full  border border-slate-200 bg-blue px-4 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-90">
            <span className="size-1.5 rounded-full bg-primary  font-medium text-slate-700 dark:text-slate-200" />
            {todayLabel}
          </span>
          <h1 className="mt-1.5 text-[24px] font-bold tracking-tight text-slate-900 dark:text-white sm:text-[28px]">
            Bonjour {student?.prenom ?? "Étudiant"}
          </h1>
          <p className="mt-1.5 max-w-xl text-[14px] text-slate-500 dark:text-slate-400">
            Bienvenue sur SmartCampus ERP. Voici un aperçu de votre activité académique et
            administrative.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
        <button className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-primary-700 hover:shadow-xl">
          <Plus size={16} />
          Nouvelle demande
        </button>

        <button className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition-all duration-300 hover:-translate-y-1 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700">
          <Download size={16} />
          Attestation de scolarité
        </button>
</div>
        </div>
        

      
      </div>
    </motion.div>
  );
}
