import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, Users, Shield, ArrowRight } from "lucide-react";

export default function RoleSelector() {
  const navigate = useNavigate();

  return (
    <div className="sc-auth min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: "#F4F7FD", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        .sc-display { font-family: 'Fraunces', serif; }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-10"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: "#071433" }}>
            <GraduationCap size={22} color="#8FC4FB" />
          </div>
        </div>
        <h1 className="sc-display text-4xl md:text-5xl font-semibold" style={{ color: "#0F1B3D" }}>
          SmartCampus ERP
        </h1>
        <p className="mt-3 text-sm md:text-base" style={{ color: "#4B5165" }}>
          Sélectionnez l'espace auquel vous souhaitez accéder
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-3xl">
        {/* Étudiant */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          onClick={() => navigate("/login")}
          className="group relative overflow-hidden rounded-3xl p-8 text-left transition-all hover:scale-[1.02] hover:-translate-y-1"
          style={{
            background: "radial-gradient(circle at 15% 8%, #16337A 0%, #071433 55%), #071433",
            boxShadow: "0 24px 60px -20px rgba(7,20,51,0.42)",
          }}
        >
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-400/10 blur-2xl pointer-events-none" />
          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl mb-5"
              style={{ background: "rgba(90,169,245,0.15)", border: "1px solid rgba(90,169,245,0.3)" }}>
              <GraduationCap size={26} color="#8FC4FB" />
            </div>
            <h2 className="sc-display text-2xl font-semibold text-white mb-2">Étudiant</h2>
            <p className="text-sm text-blue-100 mb-6">
              Demandes administratives, réclamations, notes, attestations, messagerie et assistant IA.
            </p>
            <div className="flex items-center gap-2 text-sm font-semibold text-white group-hover:gap-3 transition-all">
              Accéder <ArrowRight size={16} />
            </div>
          </div>
        </motion.button>

        {/* Personnel */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          onClick={() => navigate("/login-personnel")}
          className="group relative overflow-hidden rounded-3xl p-8 text-left transition-all hover:scale-[1.02] hover:-translate-y-1"
          style={{
            background: "radial-gradient(circle at 15% 8%, #065F46 0%, #022C22 55%), #022C22",
            boxShadow: "0 24px 60px -20px rgba(2,44,34,0.42)",
          }}
        >
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />
          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl mb-5"
              style={{ background: "rgba(110,231,183,0.15)", border: "1px solid rgba(110,231,183,0.3)" }}>
              <Shield size={26} color="#6EE7B7" />
            </div>
            <h2 className="sc-display text-2xl font-semibold text-white mb-2">Personnel</h2>
            <p className="text-sm text-emerald-100 mb-6">
              Scolarité, enseignants, RH et administrateurs — gestion complète de la plateforme.
            </p>
            <div className="flex items-center gap-2 text-sm font-semibold text-white group-hover:gap-3 transition-all">
              Accéder <ArrowRight size={16} />
            </div>
          </div>
        </motion.button>
      </div>

      <p className="text-center text-xs mt-10" style={{ color: "#9AA6C4" }}>
        © {new Date().getFullYear()} SmartCampus ERP — ENSIASD Université Ibn Zohr
      </p>
    </div>
  );
}