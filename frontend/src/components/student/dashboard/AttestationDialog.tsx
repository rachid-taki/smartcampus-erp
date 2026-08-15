import { FileX, X } from "lucide-react";

interface Props { open: boolean; onClose: () => void; onNewRequest: () => void; }

export default function AttestationDialog({ open, onClose, onNewRequest }: Props) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-slate-900">
                <div className="flex justify-end p-3">
                    <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16}/></button>
                </div>
                <div className="px-6 pb-6 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                        <FileX size={32} className="text-red-600" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Aucune attestation disponible</h2>
                    <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
                        Vous ne possédez actuellement aucune attestation de scolarité valide, ou elle a déjà été téléchargée.<br/><br/>
                        Vous pouvez créer une nouvelle demande afin d'en obtenir une.
                    </p>
                    <div className="mt-5 flex justify-center gap-2">
                        <button onClick={onClose} className="rounded-full border border-slate-300 px-4 py-1.5 text-[12px] font-semibold dark:border-slate-700">Fermer</button>
                        <button onClick={onNewRequest} className="rounded-full bg-primary-600 px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-primary-700">Faire une demande</button>
                    </div>
                </div>
            </div>
        </div>
    );
}