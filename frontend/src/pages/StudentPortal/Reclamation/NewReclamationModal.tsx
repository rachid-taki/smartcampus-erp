import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, Upload,Sparkles } from "lucide-react";
import {
    createReclamation,
    getReclamationTypes,
    getProfessors,
} from "../../../services/student.service";
import { RECLAMATION_CATEGORIES } from "../../../utils/reclamation";
import { classifyReclamationText } from "../../../services/student.service";

interface Professor {
    id: string;
    nom: string;
    specialite: string;
}

interface NewReclamationModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialCategory?: string | null;
}

export default function NewReclamationModal({
    open,
    onClose,
    onSuccess,
    initialCategory,
}: NewReclamationModalProps) {
    const [types, setTypes] = useState<any[]>([]);
    const [professors, setProfessors] = useState<Professor[]>([]);
    const [loadingTypes, setLoadingTypes] = useState(false);
    const [idType, setIdType] = useState("");
    const [categorie, setCategorie] = useState("");
    const [objet, setObjet] = useState("");
    const [description, setDescription] = useState("");

    const [idProfesseur, setIdProfesseur] = useState("");
    const [nomProfesseurManuel, setNomProfesseurManuel] = useState("");

    const [certificatFile, setCertificatFile] = useState<File | null>(null);
    const [dateDebut, setDateDebut] = useState("");
    const [dateFin, setDateFin] = useState("");

    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        const load = async () => {
            try {
                setLoadingTypes(true);
                const [typesData, profsData] = await Promise.all([
                    getReclamationTypes(),
                    getProfessors(),
                ]);
                setTypes(typesData ?? []);
                setProfessors(profsData ?? []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingTypes(false);
            }
        };
        load();
    }, [open]);

    useEffect(() => {
        if (open && initialCategory && types.length > 0) {
            const match = types.find((t) => t.categorie === initialCategory);
            if (match) {
                setIdType(match.id);
                setCategorie(match.categorie);
            }
        }
    }, [open, initialCategory, types]);

    const reset = () => {
        setIdType("");
        setCategorie("");
        setObjet("");
        setDescription("");
        setIdProfesseur("");
        setNomProfesseurManuel("");
        setCertificatFile(null);
        setDateDebut("");
        setDateFin("");
    };

    const handleClose = () => {
        if (submitting) return;
        reset();
        onClose();
    };

    const handleTypeChange = (id: string, cat: string) => {
        setIdType(id);
        setCategorie(cat);
        setIdProfesseur("");
        setNomProfesseurManuel("");
        setCertificatFile(null);
        setDateDebut("");
        setDateFin("");
    };

    const isCertificatMedical = categorie === "CertificatMedical";
    const isNote = categorie === "Note";

    const canSubmit =
        idType &&
        objet.trim().length > 0 &&
        description.trim().length > 0 &&
        (!isCertificatMedical || (certificatFile && dateDebut && dateFin)) &&
        (!isNote || (idProfesseur || nomProfesseurManuel.trim().length > 0));

    const handleSubmit = async () => {
        if (!canSubmit) return;
        try {
            setSubmitting(true);

            const formData = new FormData();
            formData.append("idType", idType);
            formData.append("objet", objet.trim());
            formData.append("description", description.trim());
            formData.append("categorie", categorie);

            if (isCertificatMedical) {
                formData.append("certificat", certificatFile!);
                formData.append("dateDebut", dateDebut);
                formData.append("dateFin", dateFin);
            }

            if (isNote) {
                if (idProfesseur) formData.append("idProfesseur", idProfesseur);
                if (nomProfesseurManuel.trim())
                    formData.append("nomProfesseurManuel", nomProfesseurManuel.trim());
            }

            await createReclamation(formData);
            reset();
            onSuccess();
        } catch (err: any) {
            console.error(err);
            alert(err?.response?.data?.message ?? "Impossible de soumettre la réclamation.");
        } finally {
            setSubmitting(false);
        }
    };
    

const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
const [suggestedPriority, setSuggestedPriority] = useState<string | null>(null);
const [classifying, setClassifying] = useState(false);

// Classifie automatiquement quand l'utilisateur tape la description
useEffect(() => {
    const timer = setTimeout(async () => {
        if (description.trim().length >= 20) {
            setClassifying(true);
            try {
                const result = await classifyReclamationText(description);
                if (result) {
                    setSuggestedCategory(result.categorie);
                    setSuggestedPriority(result.priorite);
                    
                    // Pré-sélectionne automatiquement le type
                    const match = types.find((t) => t.categorie === result.categorie);
                    if (match && !idType) {
                        setIdType(match.id);
                        setCategorie(match.categorie);
                    }
                }
            } catch (err) {
                console.error("Classification failed:", err);
            } finally {
                setClassifying(false);
            }
        }
    }, 500);

    return () => clearTimeout(timer);
}, [description, types]);

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, y: 16, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                                    Nouvelle réclamation
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Elle sera transmise au service de la scolarité.
                                </p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-5 overflow-y-auto p-6">
                            <div>
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    Type de réclamation
                                </p>
                                {loadingTypes ? (
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {[1, 2, 3, 4].map((i) => (
                                            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {types.map((t) => {
                                            const cfg = RECLAMATION_CATEGORIES[t.categorie] ?? RECLAMATION_CATEGORIES.Autre;
                                            const Icon = cfg.icon;
                                            const active = idType === t.id;
                                            return (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => handleTypeChange(t.id, t.categorie)}
                                                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                                                        active
                                                            ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500 dark:bg-primary-900/20"
                                                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/60"
                                                    }`}
                                                >
                                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cfg.tile}`}>
                                                        <Icon size={16} strokeWidth={1.8} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-[12.5px] font-semibold text-slate-800 dark:text-slate-100">
                                                            {t.libelle}
                                                        </p>
                                                        <p className="text-[10.5px] tabular-nums text-slate-400 dark:text-slate-500">
                                                            Délai : {t.delaiLimite ?? "—"} jours
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {isNote && (
                                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/50 dark:bg-blue-900/10">
                                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                                        Professeur concerné
                                    </p>
                                    <select
                                        value={idProfesseur}
                                        onChange={(e) => setIdProfesseur(e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                    >
                                        <option value="">Sélectionner un professeur</option>
                                        {professors.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.nom} {p.specialite ? `(${p.specialite})` : ""}
                                            </option>
                                        ))}
                                        <option value="autre">Autre professeur (saisir le nom)</option>
                                    </select>

                                    {idProfesseur === "autre" && (
                                        <div className="mt-3">
                                            <p className="mb-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                                Nom du professeur :
                                            </p>
                                            <input
                                                value={nomProfesseurManuel}
                                                onChange={(e) => setNomProfesseurManuel(e.target.value)}
                                                placeholder="Ex : Pr. Rachid TAKI"
                                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {isCertificatMedical && (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                        Certificat médical (obligatoire)
                                    </p>

                                    <div className="mb-3 grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="mb-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                                Date de début
                                            </p>
                                            <input
                                                type="date"
                                                value={dateDebut}
                                                onChange={(e) => setDateDebut(e.target.value)}
                                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <p className="mb-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                                Date de fin
                                            </p>
                                            <input
                                                type="date"
                                                value={dateFin}
                                                min={dateDebut}
                                                onChange={(e) => setDateFin(e.target.value)}
                                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-emerald-300 bg-white px-4 py-4 transition hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/20">
                                        <Upload size={16} className="text-emerald-600 dark:text-emerald-400" />
                                        <span className="text-[12.5px] font-medium text-slate-600 dark:text-slate-300">
                                            {certificatFile ? certificatFile.name : "Cliquer pour choisir le fichier (PDF, JPG, PNG)"}
                                        </span>
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(e) => setCertificatFile(e.target.files?.[0] ?? null)}
                                            className="hidden"
                                        />
                                    </label>
                                    <p className="mt-2 text-[10.5px] text-slate-500 dark:text-slate-400">
                                        Taille max : 5 Mo · Le fichier sera vérifié par la scolarité.
                                    </p>
                                </div>
                            )}

                            <div>
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    Objet
                                </p>
                                <input
                                    value={objet}
                                    onChange={(e) => setObjet(e.target.value)}
                                    placeholder={
                                        isCertificatMedical
                                            ? "Ex : Absence du 15 au 18 mars"
                                            : isNote
                                                ? "Ex : Contestation de la note d'analyse"
                                                : "Ex : Problème avec mon dossier"
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />
                            </div>

                            <div>
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    Description
                                </p>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={5}
                                    placeholder="Expliquez votre réclamation en détail..."
                                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />
                                {classifying && (
    <div className="flex items-center gap-2 text-[11px] text-slate-400">
        <Loader2 size={12} className="animate-spin" />
        Analyse en cours...
    </div>
)}

{suggestedCategory && !classifying && (
    <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2 flex items-center gap-2 rounded-lg bg-primary-50 px-3 py-2 text-[11px] dark:bg-primary-900/20"
    >
        <Sparkles size={12} className="text-primary-600 dark:text-primary-400" />
        <span className="text-primary-700 dark:text-primary-300">
            IA : Catégorie détectée <strong>{suggestedCategory}</strong>
            {suggestedPriority === "Urgente" && " · Priorité urgente détectée"}
        </span>
    </motion.div>
)}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
                            <button
                                onClick={handleClose}
                                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!canSubmit || submitting}
                                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                                Soumettre
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}