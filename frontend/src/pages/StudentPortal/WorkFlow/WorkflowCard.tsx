import { CheckCircle2, Circle, Loader2, XCircle, FileText } from "lucide-react";
import { LuWorkflow } from "react-icons/lu";

interface Props {
  request: any;
}

const STATUS_BADGE: Record<string, string> = {
  Soumise: "bg-sky-100 text-sky-700 ring-1 ring-inset ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20",
  En_Traitement: "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
  Validee: "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
  Rejetee: "bg-red-100 text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20",
};

const STATUS_LABEL: Record<string, string> = {
  Soumise: "Soumise",
  En_Traitement: "En traitement",
  Validee: "Validée",
  Rejetee: "Rejetée",
};

export default function WorkflowCard({ request }: Props) {
  const steps = ["Soumise", "Vérification", "Traitement", "Validation", "Disponible"];

  const currentIndex = (() => {
    switch (request.status) {
      case "Soumise":
        return 0;
      case "En_Traitement":
        return 2;
      case "Validee":
        return 4;
      case "Rejetee":
        return 3;
      default:
        return 0;
    }
  })();

  const progressPercent = (() => {
    switch (request.status) {
      case "Soumise":
        return 20;
      case "En_Traitement":
        return 60;
      case "Validee":
        return 100;
      case "Rejetee":
        return 60;
      default:
        return 0;
    }
  })();

  return (
    <div className="card-hover card group flex h-full flex-col overflow-hidden transition-all duration-200">
      <div className="flex items-start gap-3 border-b border-slate-200/70 p-5 dark:border-slate-800">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
          <LuWorkflow size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-bold text-slate-900 dark:text-white">
            {request.type}
          </h3>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {request.reference}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
            {new Date(request.createdAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric"
            })}
          </p>
        </div>

        <span
          className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold ${
            STATUS_BADGE[request.status] ?? "bg-slate-100 text-slate-700"
          }`}
        >
          {STATUS_LABEL[request.status] ?? request.status}
        </span>
      </div>

      <div className="px-5 pt-4">
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-400">Progression</span>
            <span className="font-bold text-primary-600 dark:text-primary-400">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                request.status === "Rejetee"
                  ? "bg-gradient-to-r from-red-500 to-red-600"
                  : request.status === "Validee"
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                  : "bg-gradient-to-r from-primary-500 to-primary-600"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="space-y-0">
          {steps.map((step, index) => {
            const rejected = request.status === "Rejetee";
            const done = rejected ? index < 3 : index < currentIndex;
            const current = !rejected && index === currentIndex;
            const rejectedStep = rejected && index === 3;
            const isLast = index === steps.length - 1;

            return (
              <div key={step} className="relative flex gap-3 pb-4 last:pb-0">
                {!isLast && (
                  <span
                    className={`absolute left-[9px] top-[22px] h-[calc(100%-22px)] w-0.5 transition-colors ${
                      done ? "bg-emerald-400 dark:bg-emerald-600" : "bg-slate-200 dark:bg-slate-800"
                    }`}
                  />
                )}

                <span className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center">
                  {done ? (
                    <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400" />
                  ) : rejectedStep ? (
                    <XCircle size={20} className="text-red-600 dark:text-red-400" />
                  ) : current ? (
                    <Loader2 size={20} className="animate-spin text-primary-600 dark:text-primary-400" />
                  ) : (
                    <Circle size={20} className="text-slate-300 dark:text-slate-700" />
                  )}
                </span>

                <span
                  className={`flex-1 text-[13px] leading-5 ${
                    rejectedStep
                      ? "font-bold text-red-600 dark:text-red-400"
                      : current
                      ? "font-bold text-primary-600 dark:text-primary-400"
                      : done
                      ? "font-semibold text-slate-700 dark:text-slate-200"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {request.objet && (
        <div className="mt-auto border-t border-slate-200/70 px-5 py-3 dark:border-slate-800">
          <div className="flex items-start gap-2">
            <FileText size={14} className="mt-0.5 shrink-0 text-slate-400" />
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
              {request.objet}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}