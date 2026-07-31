interface PageComingSoonProps {
  title: string;
}

export default function PageComingSoon({ title }: PageComingSoonProps) {
  return (
    <div className="card flex min-h-[50vh] flex-col items-center justify-center gap-2 p-10 text-center">
      <p className="text-[15px] font-bold text-slate-700 dark:text-slate-200">{title}</p>
      <p className="max-w-sm text-[13px] text-slate-400">
        Cette page sera construite dans une prochaine étape.
      </p>
    </div>
  );
}
