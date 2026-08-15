import { FilePlus2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CertificatMedicalWidget() {
    const navigate = useNavigate();
    const handleClick = () => { navigate("/student/reclamations?new=1&category=CertificatMedical"); };

    return (
        <button onClick={handleClick} className="card group relative overflow-hidden p-3 text-left transition-all hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-emerald-100/40 blur-xl transition-all group-hover:bg-emerald-200/50 dark:bg-emerald-900/20 dark:group-hover:bg-emerald-900/30" />
            <div className="relative flex items-start gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm transition-transform group-hover:scale-105">
                    <FilePlus2 size={15} strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-[12px] font-semibold text-slate-800 dark:text-white">Certificat médical</h3>
                    <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-500 dark:text-slate-400">Justifiez une absence en déposant votre certificat médical</p>
                </div>
                <ArrowRight size={14} className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:text-slate-500 dark:group-hover:text-emerald-400" />
            </div>
        </button>
    );
}