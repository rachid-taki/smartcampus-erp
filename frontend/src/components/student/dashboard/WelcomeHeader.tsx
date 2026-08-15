import { motion } from 'framer-motion';
import { Plus, Download } from 'lucide-react';
import welcomeBg from '../../../assets/students_portail.png';
import { useEffect, useState } from "react";
import { getCurrentStudent, getLatestAttestation, downloadDocumentOfficiel } from "../../../services/student.service";
import { useNavigate } from "react-router-dom";
import AttestationDialog from "./AttestationDialog";
import NewRequest from '../../../pages/StudentPortal/NewRequest/NewRequest';

export default function WelcomeHeader() {
    const today = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
    const todayLabel = today.charAt(0).toUpperCase() + today.slice(1);
    const [student, setStudent] = useState<any>(null);
    const [attestation, setAttestation] = useState<any>(null);
    const navigate = useNavigate();
    const [openRequestModal, setOpenRequestModal] = useState(false);
    const [openAttestationDialog, setOpenAttestationDialog] = useState(false);

    useEffect(() => {
        const loadStudent = async () => {
            try {
                const data = await getCurrentStudent();
                setStudent(data.user);
            } catch (err) { console.error("Error loading student:", err); }
        };
        loadStudent();
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getLatestAttestation();
                setAttestation(data);
            } catch (err) { console.error(err); }
        };
        load();
    }, []);

    const handleAttestation = async () => {
        if (!attestation || !attestation.exists || attestation.expired) { setOpenAttestationDialog(true); return; }
        try {
            const blob = await downloadDocumentOfficiel(attestation.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = attestation.nom;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            const latest = await getLatestAttestation();
            setAttestation(latest);
        } catch (err) { console.error(err); }
    };

    const handleCertificatMedical = () => { navigate("/student/reclamations?new=1&category=CertificatMedical"); };

    return (
        <>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="card relative overflow-hidden p-5 sm:p-6">
                <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-300/70 dark:bg-primary-500/30" aria-hidden />
                <div className="pointer-events-none absolute -right-6 bottom-[-60px] h-40 w-40 rounded-full bg-sky-600/20 dark:bg-sky-500/50" aria-hidden />
                <img src={welcomeBg} alt="" className="pointer-events-none absolute bottom-0 right-0 w-52 opacity-80 select-none sm:right-6 sm:w-64 md:w-72" />

                <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                            <span className="size-1 rounded-full bg-primary" />
                            <span className="text-[12px] font-medium text-slate-700 dark:text-slate-200">{todayLabel}</span>
                        </span>

                        <h1 className="mt-1.5 text-[20px] font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                            Bonjour {student?.prenom ?? "Étudiant"}
                        </h1>
                        <p className="mt-1 max-w-xl text-[13px] text-slate-500 dark:text-slate-400">
                            Bienvenue sur SmartCampus ERP. Voici un aperçu de votre activité académique et administrative.
                        </p>

                        <motion.button
                            onClick={handleCertificatMedical}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4, duration: 0.3 }}
                            className="group mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50/50 px-2.5 py-1 text-[10px] font-medium text-emerald-700 transition-all hover:border-emerald-300 hover:bg-emerald-100/70 hover:shadow-sm dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/40"
                        >
                            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-200 text-emerald-700 transition-transform group-hover:scale-110 dark:bg-emerald-800 dark:text-emerald-300">
                                <svg className="h-2 w-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            </span>
                            <span>Absent ? Déposez votre certificat médical</span>
                            <svg className="h-2.5 w-2.5 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </motion.button>

                        <div className="mt-5 flex flex-wrap items-center gap-2">
                            <button onClick={() => setOpenRequestModal(true)} className="group inline-flex items-center gap-1.5 rounded-full bg-primary-600 px-4 py-2 text-[12px] font-semibold text-white shadow-lg shadow-primary-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-xl hover:shadow-primary-500/40">
                                <Plus size={14} className="transition-transform group-hover:rotate-90" />
                                Nouvelle demande
                            </button>
                            <div className="relative">
                                <button onClick={handleAttestation} className="group inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-[12px] font-semibold text-slate-800 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-primary-700 dark:hover:bg-primary-900/20 dark:hover:text-primary-300">
                                    <Download size={14} className="transition-transform group-hover:translate-y-0.5" />
                                    Attestation de scolarité
                                </button>
                                {attestation?.exists && !attestation?.expired && (
                                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-700 text-[9px] font-bold text-white">1</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            <NewRequest open={openRequestModal} onClose={() => setOpenRequestModal(false)} onSuccess={() => { console.log("Demande créée"); }} />
            <AttestationDialog open={openAttestationDialog} onClose={() => setOpenAttestationDialog(false)} onNewRequest={() => { setOpenAttestationDialog(false); setOpenRequestModal(true); }} />
        </>
    );
}