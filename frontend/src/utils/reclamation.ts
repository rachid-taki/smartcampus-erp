import { PenLine, HeartPulse, Wallet, Mail, MessageSquareWarning, Stethoscope } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ReclamationCategory {
    label: string;
    icon: LucideIcon;
    tile: string;
    dot: string;
}

export const RECLAMATION_CATEGORIES: Record<string, ReclamationCategory> = {
    Note: {
        label: "Note",
        icon: PenLine,
        tile: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
        dot: "bg-blue-500",
    },
    AMO: {
        label: "AMO",
        icon: HeartPulse,
        tile: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
        dot: "bg-rose-500",
    },
    Bourse: {
        label: "Bourse",
        icon: Wallet,
        tile: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
        dot: "bg-amber-500",
    },
    Email: {
        label: "Email",
        icon: Mail,
        tile: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",
        dot: "bg-sky-500",
    },
    CertificatMedical: {
        label: "Certificat médical",
        icon: Stethoscope,
        tile: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
        dot: "bg-emerald-500",
    },
    Autre: {
        label: "Autre",
        icon: MessageSquareWarning,
        tile: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
        dot: "bg-slate-500",
    },
};

export const RECLAMATION_STATUS: Record<string, { label: string; cls: string }> = {
    Soumise: { label: "Soumise", cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" },
    Recue: { label: "Reçue", cls: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" },
    Transmise: { label: "Transmise", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
    Acceptee: { label: "Acceptée", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
    Rejetee: { label: "Rejetée", cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" },
    Cloturee: { label: "Clôturée", cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
};