import { currentStudent } from "../../../data/dummyData";

export default function StudentInfoCard() {
  return (
    <div className="card p-5">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Informations académiques
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Dossier étudiant officiel
          </p>
        </div>

        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          Inscrit — Actif
        </span>
      </div>

      {/* Informations */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-5">
        <InfoItem
          label="Nom complet"
          value={`${currentStudent.firstName} ${currentStudent.lastName}`}
        />

        <InfoItem
          label="Code massar"
          value="D132524637"
        />

        <InfoItem
          label="apoge"
          value="23435342"
        />
        <InfoItem
          label="Filière"
          value="MGSI"
        />

        <InfoItem
          label="Année"
          value="2025 / 2026"
        />

        <InfoItem
          label="Semestre"
          value="S5"
        />

        
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-slate-200 pb-3 dark:border-slate-700">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}