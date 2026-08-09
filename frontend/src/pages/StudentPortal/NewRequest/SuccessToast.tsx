import { CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
    open: boolean;
}

export default function SuccessToast({ open }: Props) {

    return (

        <AnimatePresence>

            {open && (

                <motion.div
                    initial={{ opacity: 0, scale: .9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: .9 }}
                    className="
                    fixed
                    inset-0
                    z-[200]
                    flex
                    items-center
                    justify-center
                    bg-black/20
                    backdrop-blur-sm
                    "
                >

                    <div className="
                    w-[360px]
                    rounded-3xl
                    bg-white
                    p-8
                    text-center
                    shadow-2xl
                    dark:bg-slate-900
                    ">

                        <div
                            className="
                            mx-auto
                            mb-6
                            flex
                            h-20
                            w-20
                            items-center
                            justify-center
                            rounded-full
                            bg-green-100
                            dark:bg-green-900/30
                            "
                        >

                            <CheckCircle2
                                size={46}
                                className="text-green-600"
                            />

                        </div>

                        <h2 className="text-2xl font-bold">

                            Demande envoyée

                        </h2>

                        <p className="mt-2 text-slate-500">

                            Votre demande a été enregistrée avec succès.

                        </p>

                    </div>

                </motion.div>

            )}

        </AnimatePresence>

    );

}