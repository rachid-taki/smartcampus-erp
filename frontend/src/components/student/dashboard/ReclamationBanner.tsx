import { motion } from "framer-motion";
import { Megaphone, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ReclamationBanner() {
    const navigate = useNavigate();

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 p-6 shadow-lg shadow-primary-500/20"
        >
            <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-14 right-32 h-36 w-36 rounded-full bg-white/10 blur-xl" />

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-sm">
                        <Megaphone size={24} strokeWidth={1.8} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">
                            Un problème ? Faites-vous entendre
                        </h3>
                        <p className="mt-0.5 text-[13px] text-primary-100">
                            Notes, AMO, bourse, email académique — soumettez votre réclamation en quelques clics.
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => navigate("/student/reclamations?new=1")}
                    className="group inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-primary-700 shadow-sm transition hover:bg-primary-50 active:scale-[0.98] sm:self-auto"
                >
                    Faire une réclamation
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </button>
            </div>
        </motion.div>
    );
}