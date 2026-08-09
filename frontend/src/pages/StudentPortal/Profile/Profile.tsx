import type { ReactNode } from "react";
import { useState, useEffect, useRef } from 'react';
import type { LucideIcon } from "lucide-react";
import { getProfile, getRecentRequests, updateProfilePhoto } from "../../../services/student.service";
import ChangePasswordModal from "./ChangePasswordModal";

import {
  BadgeCheck,
  Barcode,
  BookOpen,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  GraduationCap,
  Hash,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Shield,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";

interface FieldData {
  label: string;
  value: string;
  icon: LucideIcon;
}

interface HeroStatData {
  label: string;
  value: number;
  accent: string;
  border: string;
  icon: LucideIcon;
}

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="card overflow-hidden">
      <header className="flex items-center gap-3 border-b border-slate-200/70 px-6 py-4 dark:border-slate-800">
        <div className="rounded-xl bg-primary-100 p-2.5 dark:bg-primary-900/30">
          <Icon size={18} className="text-primary-700 dark:text-primary-300" />
        </div>
        <div>
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

function InfoField({ icon: Icon, label, value }: FieldData) {
  return (
    <div className="group rounded-xl bg-slate-50/70 px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800">
      <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        <Icon size={12} className="shrink-0 text-primary-500/80" />
        {label}
      </p>
      <p
        className="mt-1.5 truncate text-[13.5px] font-semibold text-slate-800 dark:text-slate-100"
        title={value}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function InfoChip({ icon: Icon, text, accent = "default" }: { icon: LucideIcon; text: string; accent?: "default" | "primary" | "emerald" | "amber" }) {
  const accents = {
    default: "border-slate-200/70 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300",
    primary: "border-primary-200/70 bg-primary-50 text-primary-700 dark:border-primary-900/50 dark:bg-primary-900/20 dark:text-primary-300",
    emerald: "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300",
    amber: "border-amber-200/70 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300",
  };
  return (
    <span className={`inline-flex max-w-[280px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${accents[accent]}`}>
      <Icon size={13} className="shrink-0" />
      <span className="truncate">{text}</span>
    </span>
  );
}

function StatBlock({ label, value, accent, border, icon: Icon }: HeroStatData) {
  return (
    <div className={`rounded-xl border-l-[3px] ${border} bg-slate-50/70 px-3 py-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 dark:bg-slate-800/40`}>
      <p className={`text-lg font-extrabold leading-tight ${accent}`}>{value}</p>
      <p className="mt-0.5 flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <Icon size={10} />
        {label}
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-56 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
      <div className="card h-52 animate-pulse" />
      <div className="card h-72 animate-pulse" />
      <div className="card h-64 animate-pulse" />
      <div className="card h-48 animate-pulse" />
    </div>
  );
}

export default function Profile() {
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setStudent(data.user);
      const demandes = await getRecentRequests();
      setRequests(demandes);
    } finally {
      setLoading(false);
    }
  };

  const initials = `${student?.prenom?.[0] ?? ""}${student?.nom?.[0] ?? ""}`.toUpperCase();

  const HERO_STATS: HeroStatData[] = [
    {
      label: "Demandes",
      value: requests.length,
      accent: "text-primary-700 dark:text-primary-300",
      border: "border-l-primary-500",
      icon: FileText,
    },
    {
      label: "Validées",
      value: requests.filter(r => r.status === "Validee").length,
      accent: "text-emerald-700 dark:text-emerald-300",
      border: "border-l-emerald-500",
      icon: CheckCircle2,
    },
    {
      label: "En attente",
      value: requests.filter(r => r.status === "Soumise").length,
      accent: "text-amber-700 dark:text-amber-300",
      border: "border-l-amber-500",
      icon: Clock,
    },
    {
      label: "Refusées",
      value: requests.filter(r => r.status === "Rejetee").length,
      accent: "text-rose-700 dark:text-rose-300",
      border: "border-l-rose-500",
      icon: XCircle,
    },
  ];

  const PERSONAL_FIELDS = student ? [
    { label: "Nom", value: student.nom, icon: User },
    { label: "Prénom", value: student.prenom, icon: User },
    { label: "Email", value: student.email, icon: Mail },
    { label: "Téléphone", value: student.telephone, icon: Phone },
    { label: "CIN", value: student.cin, icon: CreditCard },
    { label: "CNE", value: student.cne, icon: Hash },
    { label: "Code Apogée", value: student.code_apogee, icon: Barcode },
  ] : [];

  const ACADEMIC_FIELDS = student ? [
    { label: "Filière", value: student.filiere, icon: BookOpen },
    { label: "Niveau", value: student.niveau, icon: GraduationCap },
    { label: "Statut", value: student.statut, icon: BadgeCheck },
  ] : [];

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Veuillez sélectionner une image.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      alert("L'image ne doit pas dépasser 3 Mo.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setSelectedImage(file);

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("photo", file);

      const response = await updateProfilePhoto(formData) as any;
      const newPhotoUrl = response.photo || response.data?.photo;

      if (newPhotoUrl) {
        setStudent((prev: any) => ({ ...prev, photo: newPhotoUrl }));
      }

      URL.revokeObjectURL(objectUrl);
      setPreview(null);
    } catch (err: any) {
      console.error(err);
      setPreview(null);
      alert(err?.response?.data?.message ?? err.message ?? "Échec de l'envoi de la photo.");
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Mon profil
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Consultez et gérez vos informations personnelles, académiques et de sécurité.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 active:scale-[0.98] sm:self-auto dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-primary-700 dark:hover:bg-primary-900/20 dark:hover:text-primary-300"
        >
          <Pencil size={15} />
          Modifier mes informations
        </button>
      </div>

      <section className="card relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-600 via-primary-400 to-emerald-400" />
        <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-gradient-to-br from-primary-400/15 to-transparent blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-gradient-to-tr from-emerald-400/10 to-transparent blur-3xl" aria-hidden />

        <div className="relative flex flex-col items-center gap-6 p-6 sm:p-8 md:flex-row md:items-center md:gap-8">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleImageChange}
          />

          <div className="relative">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-32 w-32 cursor-pointer overflow-hidden rounded-full ring-4 ring-white shadow-lg dark:ring-slate-900 disabled:cursor-wait"
            >
              {preview ? (
                <img src={preview} className="h-full w-full object-cover" />
              ) : student.photo ? (
                <img src={student.photo} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 text-3xl font-bold text-white shadow-inner">
                  {initials}
                </span>
              )}

              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-slate-900/60 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100">
                <Camera size={22} className="text-white" />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-white">
                  Changer
                </span>
              </span>

              {uploading && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/70">
                  <Loader2 size={24} className="animate-spin text-white" />
                </span>
              )}
            </button>

            <span className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-primary-600 text-white shadow-md dark:border-slate-900">
              <Camera size={13} />
            </span>
          </div>

          <div className="min-w-0 flex-1 text-center md:text-left">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-[28px]">
              {student.prenom} {student.nom}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 sm:text-[15px]">
              Étudiant en{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {student.niveau} {student.filiere}
              </span>{" "}
              à{" "}
              <span className="font-semibold text-primary-600 dark:text-primary-400">
                ENSIASD Taroudant
              </span>
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <InfoChip icon={Mail} text={student.email} accent="primary" />
              {student.telephone && <InfoChip icon={Phone} text={student.telephone} />}
              <InfoChip icon={MapPin} text="Taroudant" accent="emerald" />
            </div>
          </div>

          <div className="flex w-full flex-col items-center gap-4 md:w-auto md:items-end">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-bold tracking-wide text-white shadow-sm shadow-emerald-500/30">
              <BadgeCheck size={13} />
              {student.filiere}
            </span>
            <div className="grid w-full grid-cols-2 gap-2 md:w-64">
              {HERO_STATS.map((stat) => (
                <StatBlock key={stat.label} {...stat} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <SectionCard
        icon={User}
        title="Informations personnelles"
        subtitle="Vos données d'identité officielles"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PERSONAL_FIELDS.map((field) => (
            <InfoField key={field.label} {...field} />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        icon={GraduationCap}
        title="Informations académiques"
        subtitle="Votre parcours universitaire"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACADEMIC_FIELDS.map((field) => (
            <InfoField key={field.label} {...field} />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        icon={Shield}
        title="Sécurité"
        subtitle="Protégez l'accès à votre espace étudiant"
      >
        <div className="flex flex-col gap-4 rounded-xl bg-slate-50/70 p-5 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-800/40">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-sm">
              <Lock size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">
                Mot de passe actuel
              </p>
              <p className="mt-0.5 text-base font-semibold tracking-[0.3em] text-slate-400 dark:text-slate-500">
                ••••••••••••
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 active:scale-[0.98] sm:self-auto"
          >
            <KeyRound size={16} />
            Changer le mot de passe
          </button>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50/70 px-4 py-3 dark:bg-emerald-900/10">
          <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
            Pour votre sécurité, utilisez un mot de passe fort d'au moins <strong>12 caractères</strong> incluant majuscules, minuscules, chiffres et caractères spéciaux.
          </p>
        </div>
      </SectionCard>

      <ChangePasswordModal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}