import { useEffect, useState } from "react";
import {
    X,
    Upload,
    FileText,
    File,
    Trash2,
} from "lucide-react";
import {
  createRequest,
  getRequestTypes,
} from "../../../services/student.service";
import SuccessToast from "./SuccessToast";


interface RequestType {
  id_type: string;
  libelle: string;
  pieces_requises?: string[];
}

interface NewRequestProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function NewRequest({
  open,
  onClose,
  onSuccess,
}: NewRequestProps) {

  const [types, setTypes] = useState<RequestType[]>([]);

  const [selectedType, setSelectedType] = useState("");
  const [customType, setCustomType] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
};
const [errors, setErrors] = useState({
  type: "",
  subject: "",
  description: "",
  customType: "",
  documents: "",
});
const [showSuccess,setShowSuccess]=useState(false);
 



useEffect(() => {

    if (!open) return;

    const loadTypes = async () => {

        try {

            const data = await getRequestTypes();

            setTypes(
                data.map((type: any) => ({
                    id_type: type.id_type,
                    libelle: type.libelle,
                    pieces_requises: type.pieces_requises || [],
                }))
            );

        } catch (err) {

            console.error(err);

        }

    };

    loadTypes();

}, [open]);
const resetForm = () => {
  setSelectedType("");
  setCustomType("");
  setSubject("");
  setDescription("");
  setFiles([]);
   setErrors({
    type: "",
    subject: "",
    description: "",
    customType: "",
    documents: "",
  });
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const newErrors = {
  type: "",
  subject: "",
  description: "",
  customType: "",
  documents: "",
};

let hasError = false;

if (!selectedType) {
  newErrors.type = "Veuillez sélectionner un type de demande.";
  hasError = true;
}

if (selectedType === "AUTRE" && !customType.trim()) {
  newErrors.customType = "Veuillez préciser le type de demande.";
  hasError = true;
}

if (!subject.trim()) {
  newErrors.subject = "L'objet est obligatoire.";
  hasError = true;
}

if (!description.trim()) {
  newErrors.description = "La description est obligatoire.";
  hasError = true;
}
if (requiresStudentCard && files.length === 0) {
    newErrors.documents =
        "La carte étudiant est obligatoire pour cette demande.";
    hasError = true;
}

setErrors(newErrors);

if (hasError) return;
  try {
    setLoading(true);

    const formData = new FormData();

    if (selectedType !== "AUTRE") {
      formData.append("id_type", selectedType);
      formData.append("objet", subject);
      formData.append("description", description);
    }
    else{
    formData.append("id_type", selectedType);
    formData.append("objet", subject);
    formData.append("description", description);
    }
    
    files.forEach((file) => {
      formData.append("documents", file);
    });

        await createRequest(formData);

        setShowSuccess(true);

        resetForm();

        setTimeout(() => {

            setShowSuccess(false);

            onSuccess?.();

            onClose();

        },7000);
  } 
  catch (err: any) {
  console.error(err);

  if (err.response) {
    console.log(err.response.data);
    alert(err.response.data.message || JSON.stringify(err.response.data));
  } else {
    alert(err.message);
  }
}finally {
    setLoading(false);
  }
};
  if (!open) return null;

  const currentType = types.find(
    t => t.id_type === selectedType
);
const requiresStudentCard =
    currentType?.libelle === "Attestation de scolarité";
const isAutre =
    currentType?.libelle.toLowerCase() === "autre";
  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">

<div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">

          <div className="flex items-center gap-3">

            <div className="rounded-xl bg-primary-100 p-2 dark:bg-primary-900/30">

            <FileText
            size={18}
            className="text-primary-700 dark:text-primary-300"
            />

            </div>

           <h2 className="text-lg font-bold text-slate-800 dark:text-white">
              Nouvelle demande
            </h2>

          </div>

          <button
  onClick={() => {
    resetForm();
    onClose();
  }}
  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
>
            <X />
          </button>

        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-6 max-h-[75vh] overflow-y-auto"
        >

          <div className="grid gap-4 md:grid-cols-2">

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Type de demande <span className="text-red-500">*</span>
              </label>

              <select
                value={selectedType}
                onChange={(e)=>setSelectedType(e.target.value)}
className="
w-full
rounded-xl
border border-slate-300 dark:border-slate-700
bg-white dark:bg-slate-800
px-4 py-3
text-slate-700 dark:text-white
focus:border-primary-500
focus:outline-none
"              >

                <option value="">
                  Sélectionner...
                </option>

                {types.map((type) => (

            <option
                key={type.id_type}
                value={type.id_type}
            >
                {type.libelle}
            </option>

        ))}

              </select>
              {errors.type && (
  <p className="mt-2 flex items-center gap-1 text-sm font-medium text-red-500">
    {errors.type}
  </p>
)}

            </div>

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Objet <span className="text-red-500">*</span>
              </label>

              <input
                value={subject}
                onChange={(e)=>setSubject(e.target.value)}
className="
w-full
rounded-xl
border border-slate-300 dark:border-slate-700
bg-white dark:bg-slate-800
px-4 py-3
text-slate-700 dark:text-white
focus:border-primary-500
focus:outline-none
"                placeholder="Objet de votre demande"
              />

            </div>
            {errors.subject && (
  <p className="mt-2 text-sm font-medium text-red-500">
    {errors.subject}
  </p>
)}

          </div>

          {isAutre && (

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Nom de la demande
                <span className="text-red-500">*</span>
              </label>

              <input
                value={customType}
                onChange={(e)=>setCustomType(e.target.value)}
className="
w-full
rounded-xl
border border-slate-300 dark:border-slate-700
bg-white dark:bg-slate-800
px-4 py-3
text-slate-700 dark:text-white
focus:border-primary-500
focus:outline-none
"              />

            </div>

          )}
          {errors.customType && (
  <p className="mt-2 text-sm font-medium text-red-500">
    {errors.customType}
  </p>
)}

          <div>

            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Description
              <span className="text-red-500">*</span>
            </label>

            <textarea
              rows={4}
              value={description}
              onChange={(e)=>setDescription(e.target.value)}
className="
w-full
rounded-xl
border border-slate-300 dark:border-slate-700
bg-white dark:bg-slate-800
px-4 py-3
text-slate-700 dark:text-white
placeholder:text-slate-400 dark:placeholder:text-slate-500
resize-none
focus:border-primary-500
focus:outline-none
"            placeholder="Décrivez votre demande..."
            />

          </div>
          {errors.description && (
  <p className="mt-2 text-sm font-medium text-red-500">
    {errors.description}
  </p>
)}

          {currentType && !requiresStudentCard && (

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-900/20">

              <h4 className="mb-2 font-semibold text-primary-700 dark:text-primary-300">
                Documents requis
              </h4>

              {currentType.pieces_requises ?.length 
                ? (
                  <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-slate-300">
                    {currentType.pieces_requises.map(piece=>(
                      <li key={piece}>
                        {piece}
                      </li>
                    ))}
                  </ul>
                )
                : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Aucun document requis.
                  </p>
                )}

            </div>

          )}

          {requiresStudentCard && (

<div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-900/20">

    <div className="flex items-start gap-2">

        <FileText
            size={16}
            className="mt-0.5 text-amber-600"
        />

        <div>

            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                Document obligatoire
            </p>

            <p className="text-xs text-slate-600 dark:text-slate-400">
                        Pour une <strong>Attestation de scolarité</strong>,
        vous devez joindre une copie de votre
        <strong> carte étudiant</strong> avant l'envoi. </p>

        </div>

    </div>

</div>

)}

          <div>
            {errors.documents && (

    <p className="mt-2 text-sm font-medium text-red-500">

        {errors.documents}

    </p>

)}

           

           {files.length === 0 ? (

<label
className="
flex
cursor-pointer
flex-col
items-center
justify-center
rounded-2xl
border-2
border-dashed
border-slate-300
dark:border-slate-700
bg-slate-50
dark:bg-slate-800
py-8
transition
hover:border-primary-500
hover:bg-primary-50
dark:hover:bg-primary-900/20
"
>

    <input
        hidden
        multiple
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={(e)=>
            setFiles(Array.from(e.target.files || []))
        }
    />

    <Upload
        size={32}
        className="mb-3 text-primary-600"
    />

    <p className="font-semibold">
        Déposez vos documents
    </p>

    <p className="text-sm text-slate-500">
        PDF • DOC • DOCX
    </p>

    <p className="text-xs text-slate-400">
        Taille maximale : 10 MB
    </p>

</label>

) : (

<div className="space-y-3">

    {files.map((file,index)=>(

        <div
            key={index}
            className="
            flex
            items-center
            justify-between
            rounded-xl
            border
            border-slate-200
            dark:border-slate-700
            bg-slate-50
            dark:bg-slate-800
            px-4
            py-3
            "
        >

            <div className="flex items-center gap-3">

                <div className="rounded-lg bg-red-100 dark:bg-red-900/30 p-2">

                    <FileText
                        size={22}
                        className="text-red-600"
                    />

                </div>

                <div>

                    <p className="font-medium text-sm text-slate-800 dark:text-white">

                        {file.name}

                    </p>

                    <p className="text-xs text-slate-500">

                        {(file.size/1024).toFixed(1)} KB

                    </p>

                </div>

            </div>

            <button
                type="button"
                onClick={()=>removeFile(index)}
                className="
                rounded-lg
                p-2
                text-red-500
                transition
                hover:bg-red-100
                dark:hover:bg-red-900/20
                "
            >

                <Trash2 size={16}/>

            </button>

        </div>

    ))}

    <label
        className="
        inline-flex
        cursor-pointer
        items-center
        gap-2
        text-sm
        font-medium
        text-primary-600
        hover:underline
        "
    >

        <input
            hidden
            multiple
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e)=>
                setFiles([
                    ...files,
                    ...Array.from(e.target.files || [])
                ])
            }
        />

        <Upload size={15}/>

        Ajouter un autre document

    </label>

</div>

)}

          </div>

<div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-300">
            Votre demande sera envoyée automatiquement au service concerné.

          </div>

          <div className="flex justify-end gap-3">

            <button
              type="button"
              onClick={onClose}
className="
rounded-full
border border-slate-300 dark:border-slate-700
bg-white dark:bg-slate-800
px-5 py-2
font-medium
text-slate-700 dark:text-slate-300
transition
hover:bg-slate-100
dark:hover:bg-slate-700
"            >
              Annuler
            </button>

            <button
              disabled={loading}
className="
rounded-full
bg-primary-600
px-5 py-2
font-semibold
text-white
transition
hover:bg-primary-700
disabled:cursor-not-allowed
disabled:opacity-50
"            >
              {loading ? "Envoi..." : "Envoyer"}
            </button>
   
          </div>
          <SuccessToast open={showSuccess}/>
        </form>

      </div>

    </div>

  );

}