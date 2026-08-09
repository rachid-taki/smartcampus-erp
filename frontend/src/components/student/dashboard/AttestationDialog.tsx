import { FileX, X } from "lucide-react";

interface Props {
    open: boolean;
    onClose: () => void;
    onNewRequest: () => void;
}

export default function AttestationDialog({
    open,
    onClose,
    onNewRequest,
}: Props) {

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">

            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-900">

                <div className="flex justify-end p-4">

                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <X size={18}/>
                    </button>

                </div>

                <div className="px-8 pb-8 text-center">

                    <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">

                        <FileX
                            size={42}
                            className="text-red-600"
                        />

                    </div>

                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">

                        Aucune attestation disponible

                    </h2>

                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">

                        Vous ne possédez actuellement aucune attestation de scolarité valide,
                        ou elle a déjà été téléchargée.

                        <br/><br/>

                        Vous pouvez créer une nouvelle demande afin d'en obtenir une.

                    </p>

                    <div className="mt-8 flex justify-center gap-3">

                        <button
                            onClick={onClose}
                            className="rounded-full border border-slate-300 px-5 py-2 dark:border-slate-700"
                        >
                            Fermer
                        </button>

                        <button
                            onClick={onNewRequest}
                            className="rounded-full bg-primary-600 px-5 py-2 font-semibold text-white hover:bg-primary-700"
                        >
                            Faire une demande
                        </button>

                    </div>

                </div>

            </div>

        </div>
    );
}