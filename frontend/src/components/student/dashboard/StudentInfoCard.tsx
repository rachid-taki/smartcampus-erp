import { useEffect, useState } from "react";
import { BadgeCheck, CreditCard, GraduationCap, Hash, Layers, Mail, User } from "lucide-react";
import { getCurrentStudent } from "../../../services/student.service";

export default function StudentInfoCard() {
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

  const fields = [
    { icon: User, label: "Nom complet", value: `${student?.prenom ?? ""} ${student?.nom ?? ""}` },
    { icon: Hash, label: "Code Massar", value: student?.code_massar ?? "-" },
    { icon: CreditCard, label: "Code Apogée", value: student?.code_apogee ?? "-" },
    { icon: GraduationCap, label: "Filière", value: student?.filiere ?? "-" },
    { icon: Mail, label: "Email académique", value: student?.email ?? "-" },
    { icon: Layers, label: "Niveau", value: student?.niveau ?? "-" },
  ];

  return (
    <div className="card flex h-full flex-col p-4">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div>
            <h2 className="text-[13px] font-bold text-slate-900 dark:text-white">Informations académiques</h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Dossier étudiant officiel</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          <BadgeCheck size={11} />
          Inscrit — Actif
        </span>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.label} className="rounded-lg bg-slate-50 px-3 py-2 transition-colors hover:bg-slate-100/80 dark:bg-slate-800/50 dark:hover:bg-slate-800">
            <p className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <f.icon size={10} className="shrink-0 text-primary-500/80" />
              {f.label}
            </p>
            <p className="mt-0.5 truncate text-[12px] font-semibold text-slate-800 dark:text-slate-100" title={f.value}>
              {f.value || "-"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}