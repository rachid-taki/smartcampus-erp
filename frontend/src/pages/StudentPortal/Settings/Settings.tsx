import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  Database,
  FileText,
  FolderOpen,
  KeyRound,
  LifeBuoy,
  LogOut,
  Mail,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ChangePasswordModal from "../Profile/ChangePasswordModal";

interface Prefs {
  darkMode: boolean;
  notifEmail: boolean;
  notifDemandes: boolean;
  notifDocuments: boolean;
  notifCalendrier: boolean;
}

const DEFAULT_PREFS: Prefs = {
  darkMode: false,
  notifEmail: true,
  notifDemandes: true,
  notifDocuments: true,
  notifCalendrier: false,
};

const loadPrefs = (): Prefs => {
  try {
    const raw = localStorage.getItem("sc_prefs");
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
        checked ? "bg-primary-600" : "bg-slate-200 dark:bg-slate-700"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card overflow-hidden">
      <header className="flex items-center gap-3 border-b border-slate-200/70 px-6 py-4 dark:border-slate-800">
        <div className="rounded-xl bg-primary-100 p-2.5 dark:bg-primary-900/30">
          <Icon size={18} className="text-primary-700 dark:text-primary-300" />
        </div>
        <div>
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">{title}</h2>
          <p className="text-[12px] text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
      </header>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">{children}</div>
    </section>
  );
}

function Row({
  icon: Icon,
  label,
  desc,
  children,
}: {
  icon?: LucideIcon;
  label: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      {Icon && (
        <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 sm:flex dark:bg-slate-800 dark:text-slate-400">
          <Icon size={16} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold text-slate-800 dark:text-slate-100">{label}</p>
        <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">{desc}</p>
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<Prefs>(() => ({
    ...loadPrefs(),
    darkMode: document.documentElement.classList.contains("dark"),
  }));
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rememberEmail, setRememberEmail] = useState<string | null>(
    () => localStorage.getItem("rememberEmail")
  );

  const flashSaved = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  const update = (patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem("sc_prefs", JSON.stringify(next));
      return next;
    });
    flashSaved();
  };

  const toggleDark = (v: boolean) => {
    document.documentElement.classList.toggle("dark", v);
    localStorage.setItem("theme", v ? "dark" : "light");
    window.dispatchEvent(new CustomEvent("sc-theme", { detail: v }));
    update({ darkMode: v });
  };

  const forgetMe = () => {
    localStorage.removeItem("rememberMe");
    localStorage.removeItem("rememberEmail");
    setRememberEmail(null);
    flashSaved();
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.clear();
    sessionStorage.clear();
    navigate("/", { replace: true });
  };

  const clearCache = () => {
    const keep = ["token", "user", "role", "rememberMe", "rememberEmail", "theme", "sc_prefs"];
    Object.keys(localStorage).forEach((k) => {
      if (!keep.includes(k)) localStorage.removeItem(k);
    });
    flashSaved();
  };

  return (
    <div className="animate-fade-in mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Paramètres
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Gérez vos préférences, vos notifications et la sécurité de votre compte.
        </p>
      </div>

      <Section icon={Palette} title="Apparence" subtitle="Personnalisez l'interface">
        <Row
          icon={prefs.darkMode ? Moon : Sun}
          label="Mode sombre"
          desc="Adapter l'interface à la luminosité ambiante"
        >
          <Toggle checked={prefs.darkMode} onChange={toggleDark} />
        </Row>
      </Section>

      <Section icon={Bell} title="Notifications" subtitle="Choisissez ce que vous voulez recevoir">
        <Row icon={Mail} label="Notifications par email" desc="Un email pour chaque événement important">
          <Toggle checked={prefs.notifEmail} onChange={(v) => update({ notifEmail: v })} />
        </Row>
        <Row icon={FileText} label="Suivi des demandes" desc="Alerte à chaque changement de statut">
          <Toggle checked={prefs.notifDemandes} onChange={(v) => update({ notifDemandes: v })} />
        </Row>
        <Row icon={FolderOpen} label="Nouveaux documents" desc="Prévenez-moi quand un document est disponible">
          <Toggle checked={prefs.notifDocuments} onChange={(v) => update({ notifDocuments: v })} />
        </Row>
        <Row icon={CalendarDays} label="Rappels du calendrier" desc="Rappels avant les examens et échéances">
          <Toggle checked={prefs.notifCalendrier} onChange={(v) => update({ notifCalendrier: v })} />
        </Row>
      </Section>

      <Section icon={ShieldCheck} title="Sécurité" subtitle="Protégez votre compte">
        <Row icon={KeyRound} label="Mot de passe" desc="Changez régulièrement votre mot de passe">
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="rounded-full bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-700 active:scale-[0.98]"
          >
            Changer
          </button>
        </Row>
        <Row
          icon={User}
          label="Se souvenir de moi"
          desc={rememberEmail ? `Email mémorisé : ${rememberEmail}` : "Aucun email mémorisé sur cet appareil"}
        >
          {rememberEmail ? (
            <button
              type="button"
              onClick={forgetMe}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Oublier
            </button>
          ) : (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              Désactivé
            </span>
          )}
        </Row>
        <Row icon={LogOut} label="Déconnexion" desc="Se déconnecter de cet appareil">
          <button
            type="button"
            onClick={logout}
            className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
          >
            Se déconnecter
          </button>
        </Row>
      </Section>

      <Section icon={Trash2} title="Données locales" subtitle="Stockage de ce navigateur">
        <Row
          icon={Database}
          label="Cache local"
          desc="Supprimer les données temporaires sans toucher à votre session"
        >
          <button
            type="button"
            onClick={clearCache}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Vider le cache
          </button>
        </Row>
      </Section>

      <Section icon={LifeBuoy} title="À propos & aide" subtitle="Informations sur la plateforme">
        <Row label="Version" desc="SmartCampus ERP — Portail étudiant">
          <span className="rounded-full bg-primary-50 px-3 py-1 text-[11px] font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
            v1.0.0
          </span>
        </Row>
        <Row label="Support" desc="Contacter le service de la scolarité">
          <a
            href="mailto:scolarite@ensiasd.ac.ma"
            className="text-xs font-semibold text-primary-600 transition hover:text-primary-700 hover:underline dark:text-primary-400"
          >
            Envoyer un email
          </a>
        </Row>
      </Section>

      {saved && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg dark:bg-white dark:text-slate-900">
          Préférences enregistrées
        </div>
      )}

      <ChangePasswordModal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}