import { useState } from "react";
import {
    X,
    KeyRound,
    Eye,
    EyeOff,
    CheckCircle2,
    XCircle,
    ShieldCheck,
} from "lucide-react";
import { updatePassword } from "../../../services/student.service";

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function ChangePasswordModal({ open, onClose, onSuccess }: Props) {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [fieldErrors, setFieldErrors] = useState({ current: "", new: "", confirm: "" });

    // ---------- Exact same checks as Login.tsx ----------
    const passwordChecks = {
        length: newPassword.length >= 12,
        upper: /[A-Z]/.test(newPassword),
        lower: /[a-z]/.test(newPassword),
        number: /[0-9]/.test(newPassword),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    };
    const passwordStrong = Object.values(passwordChecks).every(Boolean);

    const reset = () => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowCurrent(false);
        setShowNew(false);
        setShowConfirm(false);
        setError("");
        setSuccess("");
        setFieldErrors({ current: "", new: "", confirm: "" });
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        const errs = { current: "", new: "", confirm: "" };
        let hasError = false;

        if (!currentPassword) {
            errs.current = "Mot de passe actuel requis.";
            hasError = true;
        }
        if (!passwordStrong) {
            errs.new = "Le mot de passe ne respecte pas les exigences.";
            hasError = true;
        }
        if (newPassword !== confirmPassword) {
            errs.confirm = "Les mots de passe ne correspondent pas.";
            hasError = true;
        }

        setFieldErrors(errs);
        if (hasError) return;

        try {
            setLoading(true);
            const res = (await updatePassword(currentPassword, newPassword)) as any;
            setSuccess(res.data?.message || res.message || "Mot de passe mis à jour avec succès !");
            setTimeout(() => {
                reset();
                onSuccess?.();
                onClose();
            }, 2000);
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || "Une erreur est survenue.";
            if (msg.toLowerCase().includes("actuel")) errs.current = msg;
            else setError(msg);
            setFieldErrors(errs);
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-primary-100 p-2 dark:bg-primary-900/30">
                            <KeyRound size={18} className="text-primary-700 dark:text-primary-300" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                            Changer le mot de passe
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        <X />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-5 overflow-y-auto p-6">
                    {/* ---------- Mot de passe actuel ---------- */}
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Mot de passe actuel <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showCurrent ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="••••••••••••"
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-11 text-slate-700 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrent(!showCurrent)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {fieldErrors.current && (
                            <p className="mt-2 text-sm font-medium text-red-500">{fieldErrors.current}</p>
                        )}
                    </div>

                    {/* ---------- Nouveau mot de passe ---------- */}
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Nouveau mot de passe <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showNew ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••••••"
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-11 text-slate-700 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {fieldErrors.new && (
                            <p className="mt-2 text-sm font-medium text-red-500">{fieldErrors.new}</p>
                        )}
                    </div>

                    {/* ---------- Checklist + progress bar (same as Login.tsx) ---------- */}
                    <div className="space-y-2 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                        <div className={`flex items-center gap-2 text-sm ${passwordChecks.length ? "text-green-600" : "text-gray-500"}`}>
                            {passwordChecks.length ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                            Au moins 12 caractères
                        </div>
                        <div className={`flex items-center gap-2 text-sm ${passwordChecks.upper ? "text-green-600" : "text-gray-500"}`}>
                            {passwordChecks.upper ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                            Une majuscule
                        </div>
                        <div className={`flex items-center gap-2 text-sm ${passwordChecks.lower ? "text-green-600" : "text-gray-500"}`}>
                            {passwordChecks.lower ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                            Une minuscule
                        </div>
                        <div className={`flex items-center gap-2 text-sm ${passwordChecks.number ? "text-green-600" : "text-gray-500"}`}>
                            {passwordChecks.number ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                            Un chiffre
                        </div>
                        <div className={`flex items-center gap-2 text-sm ${passwordChecks.special ? "text-green-600" : "text-gray-500"}`}>
                            {passwordChecks.special ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                            Un caractère spécial
                        </div>

                        <div className="mt-4">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                                <div
                                    className={`h-full transition-all duration-300 ${
                                        passwordStrong
                                            ? "bg-green-500 w-full"
                                            : Object.values(passwordChecks).filter(Boolean).length >= 4
                                                ? "bg-yellow-500 w-4/5"
                                                : Object.values(passwordChecks).filter(Boolean).length >= 3
                                                    ? "bg-orange-500 w-3/5"
                                                    : Object.values(passwordChecks).filter(Boolean).length >= 2
                                                        ? "bg-red-400 w-2/5"
                                                        : "bg-red-600 w-1/5"
                                    }`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ---------- Confirmer ---------- */}
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Confirmer le nouveau mot de passe <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirm ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••••••"
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-11 text-slate-700 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {fieldErrors.confirm && (
                            <p className="mt-2 text-sm font-medium text-red-500">{fieldErrors.confirm}</p>
                        )}
                    </div>

                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900/40 dark:bg-green-900/20">
                            <ShieldCheck size={16} />
                            {success}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-1">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="rounded-full border border-slate-300 bg-white px-5 py-2 font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-full bg-primary-600 px-5 py-2 font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? "Enregistrement..." : "Enregistrer"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}