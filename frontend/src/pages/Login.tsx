import { useState, Fragment, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
// import { login, register,  } from "../services/auth.service";
import {
  login,
  register,
  forgotPassword,
  verifyOTP,
  resetPassword,
} from "../services/auth.service";
import type { MouseEvent } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  GraduationCap,
  Users,
  Send,
  UserCheck,
  BookOpen,
  CheckCircle2,
  Clock3,
  Award,
  ArrowRight,
} from "lucide-react";
import { XCircle } from "lucide-react";
import { RiArrowGoBackFill } from "react-icons/ri";

interface JourneyStage {
  icon: LucideIcon;
  title: string;
  desc: string;
}

interface Stat {
  value: string;
  label: string;
}

type Tab = "login" | "signup" | "forgot";
type Role = "etudiant" | "personnel";

const STATS: Stat[] = [
  { value: "24/7", label: "plateforme accessible" },
  { value: "20+", label: "démarches dématérialisées" },
  { value: "< 48h", label: "délai de traitement moyen" },
];


const WAVE_EDGE =
  "M1,0 C0.97,0.06 0.93,0.09 0.94,0.15 C0.95,0.21 1,0.24 1,0.3 C1,0.36 0.93,0.39 0.92,0.45 C0.91,0.51 0.99,0.54 1,0.6 C1,0.66 0.93,0.69 0.93,0.75 C0.93,0.81 1,0.84 1,0.9 C1,0.94 0.98,0.97 1,1";
const WAVE_CLIP = `M0,0 H1 ${WAVE_EDGE.replace("M1,0 ", "")} H0 Z`;

export default function Login() {
  const [tab, setTab] = useState<Tab>("login");
  const [role, setRole] = useState<Role>("etudiant");
  const [showPwd, setShowPwd] = useState<boolean>(false);
  const [showPwd2, setShowPwd2] = useState<boolean>(false);
  const [remember, setRemember] = useState<boolean>(() => {
  return JSON.parse(localStorage.getItem("rememberMe") || "false");
});
  const [agree, setAgree] = useState<boolean>(false);
  const [cursorY, setCursorY] = useState<number>(50);

  const TICKER_ITEMS = [
    {
      title: "service de scolarité",
      desc: "Notes, absences et attestations en un clic.",
    },
    {
      title: "Réclamation de note",
      desc: "les Réclamations concernant vos notes des exams.",
    },
    {
      title: "Convention de stage",
      desc: "demander votre convention de stage.",
    },
    { title: "Demande de bourse", desc: "bourse et plus ." },
    {
      title: "contacter votre RH",
      desc: "le contact avec votre RH et plus fluid.",
    },
    {
      title: "workflow demandes administrative",
      desc: "suive vos demandes et son etat .",
    },
  ];

  const isLogin = tab === "login";
  const idLabel = role === "etudiant" ? "CNE" : "Matricule";

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = ((e.clientY - rect.top) / rect.height) * 100;
    setCursorY(Math.min(100, Math.max(0, pct)));
  };

  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const [loginEmail, setLoginEmail] = useState(
    localStorage.getItem("rememberEmail") || ""
);
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetStep, setResetStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const passwordChecks = {
    length: registerPassword.length >= 12,
    upper: /[A-Z]/.test(registerPassword),
    lower: /[a-z]/.test(registerPassword),
    number: /[0-9]/.test(registerPassword),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(registerPassword),
  };

  const passwordStrong = Object.values(passwordChecks).every(Boolean);
  const resetPasswordChecks = {
    length: newPassword.length >= 12,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /\d/.test(newPassword),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
  };

  const resetPasswordStrong = Object.values(resetPasswordChecks).every(Boolean);

 useEffect(() => {
    const remember = localStorage.getItem("rememberMe") === "true";

    if (!remember) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        sessionStorage.removeItem("role");

        window.history.pushState(null, "", window.location.href);

        window.onpopstate = () => {
            window.history.go(1);
        };
    } else {
        window.onpopstate = null;
    }

    return () => {
        window.onpopstate = null;
    };
}, []);
  
  const handleLogin = async () => {
    try {
      const storage = remember ? localStorage : sessionStorage;
      const res = await login(loginEmail, loginPassword);

localStorage.setItem("token", res.token);
localStorage.setItem("user", JSON.stringify(res.user));
localStorage.setItem("role", res.user.role);

setError("");

switch (res.user.role) {
  case "ETUDIANT":
    navigate("/student/dashboard");
    break;

  case "SCOLARITE":
    navigate("/scolarite/dashboard");
    break;

  case "RH":
    navigate("/rh/dashboard");
    break;

  case "ENSEIGNANT":
    navigate("/teacher/dashboard");
    break;

  case "ADMIN":
    navigate("/admin/dashboard");
    break;

  default:
    navigate("/");
}
if (remember) {
    localStorage.setItem("rememberMe", "true");
    localStorage.setItem("rememberEmail", loginEmail);
} else {
    localStorage.removeItem("rememberMe");
    localStorage.removeItem("rememberEmail");
}
    } catch (err: any) {
      setSuccess("");

      setError(
        err.response?.data?.message || "Email ou mot de passe incorrect.",
      );
    }
  };

  
  const handleRegister = async () => {
    const user = {
      nom,
      prenom,
      email: registerEmail,
      password: registerPassword,
      telephone,
    };

    try {
      if (registerPassword !== confirmPassword) {
        setError("Les mots de passe ne correspondent pas.");
        return;
      }
      await register(user);

      setSuccess("Compte créé avec succès.");
      setError("");

      setTimeout(() => {
        setTab("login");
      }, 1500);
    } catch (err: any) {
      setSuccess("");

      setError(err.response?.data?.message || "Une erreur est survenue.");
    }
  };
  const handleForgotPassword = async () => {
    try {
      setLoading(true);

      const res = await forgotPassword(resetEmail);

      setSuccess(res.message);
      setError("");

      setResetStep(2);

      setCountdown(60);
      setCanResend(false);
    } catch (err: any) {
      setSuccess("");

      setEmailError(
        err.response?.data?.message || "Adresse email introuvable.",
      );
      setError("");
    } finally {
      setLoading(false);
    }
  };
  const handleVerifyOTP = async () => {
    try {
      setLoading(true);
      const res = await verifyOTP(resetEmail, otp);

      setOtpVerified(true);
      setSuccess("Code vérifié avec succès.");

      setError("");

      setResetStep(3);
    } catch (err: any) {
      setSuccess("");

      setOtpVerified(false);

      setOtpError(err.response?.data?.message || "Code OTP incorrect.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmNewPassword) {
      setError("Les mots de passe ne correspondent pas.");

      return;
    }

    try {
      setLoading(true);

      const res = await resetPassword(resetEmail, otp, newPassword);

      if (!resetPasswordStrong) {
        setPasswordError("Le mot de passe ne respecte pas les exigences.");

        return;
      }

      setSuccess(res.message);

      setError("");

      setTimeout(() => {
        setShowForgotPassword(false);

        setTab("login");
      }, 2000);
    } catch (err: any) {
      setSuccess("");

      setError(err.response?.data?.message || "Erreur.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      await forgotPassword(resetEmail);

      setCountdown(60);

      setCanResend(false);

      setOtp("");

      setOtpVerified(false);

      setOtpError("");

      setSuccess("Nouveau code envoyé.");
    } catch (err: any) {
      setOtpError(
        err.response?.data?.message || "Impossible de renvoyer le code.",
      );
    }
  };

  //use effect

  useEffect(() => {
    if (resetStep !== 2) return;

    if (countdown === 0) {
      setCanResend(true);

      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, resetStep]);

  return (
    <div
      className="sc-auth min-h-screen flex relative"
      style={{ background: "#F4F7FD" }}
      onMouseMove={handleMouseMove}
    >
      {/* Hidden defs: wave clip-path + stroke gradient, shared by panel & overlay */}
      <svg
        width="0"
        height="0"
        style={{ position: "absolute" }}
        aria-hidden="true"
      >
        <defs>
          <clipPath id="scWaveClip" clipPathUnits="objectBoundingBox">
            <path d={WAVE_CLIP} />
          </clipPath>
          <linearGradient id="scWaveStroke" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5AA9F5" stopOpacity={0} />
            <stop offset="50%" stopColor="#8FC4FB" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#5AA9F5" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

        .sc-auth { font-family: 'Plus Jakarta Sans', sans-serif; }
        .sc-display { font-family: 'Fraunces', serif; }
        .sc-mono { font-family: 'IBM Plex Mono', monospace; }

        .sc-panel {
          background: radial-gradient(circle at 15% 8%, #16337A 0%, #071433 55%), #071433;
          position: relative;
          clip-path: url(#scWaveClip);
          filter: drop-shadow(18px 0 40px rgba(7,20,51,0.42));
        }
        .sc-dotgrid {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(96,165,250,0.18) 1px, transparent 1px);
          background-size: 26px 26px;
          mask-image: radial-gradient(ellipse 80% 60% at 30% 30%, black 40%, transparent 90%);
        }

        .sc-wave-overlay {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          pointer-events: none;
          z-index: 20;
        }

        .sc-cursor-glow {
          position: absolute;
          width: 180px;
          height: 180px;
          border-radius: 9999px;
          background: radial-gradient(circle, rgba(90,169,245,0.5), transparent 70%);
          filter: blur(20px);
          pointer-events: none;
          transform: translate(-50%, -50%);
          transition: top 0.18s ease-out;
          z-index: 21;
          mix-blend-mode: screen;
        }

        .sc-seal {
          animation: sc-spin 26s linear infinite;
        }
        @keyframes sc-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .sc-stage-line {
          background: rgba(255,255,255,0.14);
        }

        @media (prefers-reduced-motion: reduce) {
          .sc-seal { animation: none; }
          .sc-cursor-glow { transition: none; }
        }

        .sc-field {
          border: 1.5px solid #DCE5F5;
          background: #FFFFFF;
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .sc-field:focus-within {
          border-color: #2451E0;
          box-shadow: 0 0 0 4px rgba(36,81,224,0.14);
        }

        .sc-chip {
          transition: all .15s ease;
          cursor: pointer;
        }
          .sc-ticker-mask {
          -webkit-mask-image: linear-gradient(to bottom, transparent, black 14%, black 86%, transparent);
          mask-image: linear-gradient(to bottom, transparent, black 14%, black 86%, transparent);
        }
        .sc-ticker-track {
          animation: sc-scroll 16s linear infinite;
        }
        .sc-ticker-track:hover { animation-play-state: paused; }
        @keyframes sc-scroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sc-ticker-track, .sc-seal { animation: none; }
        }
        .sc-btn-primary {
          background: linear-gradient(135deg, #2451E0, #16337A);
          transition: filter .15s ease, transform .15s ease, box-shadow .15s ease;
          box-shadow: 0 14px 28px -12px rgba(36,81,224,0.55);
        }
        .sc-btn-primary:hover { filter: brightness(1.08); transform: translateY(-1px); }
        .sc-btn-primary:active { transform: translateY(0); }

        /* --- Tabs Connexion / Inscription --- */
        .sc-tab {
          position: relative;
          z-index: 1;
          cursor: pointer;
          transition: color .2s ease, background-color .2s ease, box-shadow .2s ease;
        }
        .sc-tab[data-active="true"] {
          background: #2451E0;
          color: #FFFFFF;
          box-shadow: 0 8px 18px -8px rgba(36,81,224,0.6);
        }
        .sc-tab[data-active="false"] {
          background: transparent;
          color: #4B5165;
        }
        .sc-tab[data-active="false"]:hover {
          background: rgba(36,81,224,0.08);
          color: #14204A;
        }
        .sc-tab:focus-visible {
          outline: 2px solid #2451E0;
          outline-offset: 2px;
        }
      `}</style>

      {/* LEFT — panneau institutionnel, bord droit en vague */}
      <div className="hidden lg:flex sc-panel w-[46%] flex-col justify-between p-14 text-white">
        <div className="sc-dotgrid" />

        {/* Header / sceau */}
        <div className="relative z-10 flex items-center gap-5">
          <div
            className="sc-seal w-16 h-16 rounded-full flex items-center justify-center shrink-0"
            style={{ border: "1.5px dashed #5AA9F5" }}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: "#12244F" }}
            >
              <GraduationCap size={20} color="#8FC4FB" />
            </div>
          </div>
          <div>
            <p className="sc-display text-2xl leading-tight">SmartCampus ERP</p>
            <p
              className="text-xs tracking-wide uppercase mt-1"
              style={{ color: "#8CA3D6" }}
            >
              L'administration de votre scolarité, simplifiée
            </p>
          </div>
        </div>

        {/* Signature — le parcours administratif, étape par étape */}
        <div className="relative z-10">
          <p
            className="text-xs uppercase tracking-widest mb-6"
            style={{ color: "#8CA3D6" }}
          ></p>
          {isLogin ? (
            <div className="sc-ticker-mask h-120 overflow-hidden">
              <div className="sc-ticker-track flex flex-col gap-3">
                {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                  <div
                    key={i}
                    className="rounded-2xl p-4 flex items-center gap-3"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      // style={{
                      //   background: item.desc === "done" ? "rgba(63,143,108,0.18)" : "rgba(90,169,245,0.18)",
                      // }}
                    >
                      <CheckCircle2 size={24} color="#6FCF9E" />
                      {/* {item.desc === "done" ? (
                      <CheckCircle2 size={16} color="#6FCF9E" />
                    ) : (
                      <Clock3 size={16} color="#7FB8F7" />
                    )} */}
                    </div>
                    <div className="min-w-0 flex-2">
                      <p className="text-sm font-medium truncate">
                        {item.title}
                      </p>
                      <p className="text-xs" style={{ color: "#8CA3D6" }}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="sc-ticker-mask h-200 overflow-hidden">
              <div className="sc-ticker-track flex flex-col gap-3">
                {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                  <div
                    key={i}
                    className="rounded-2xl p-4 flex items-center gap-3"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      // style={{
                      //   background: item.desc === "done" ? "rgba(63,143,108,0.18)" : "rgba(90,169,245,0.18)",
                      // }}
                    >
                      <CheckCircle2 size={24} color="#6FCF9E" />
                      {/* {item.desc === "done" ? (
                      <CheckCircle2 size={16} color="#6FCF9E" />
                    ) : (
                      <Clock3 size={16} color="#7FB8F7" />
                    )} */}
                    </div>
                    <div className="min-w-0 flex-2">
                      <p className="text-sm font-medium truncate">
                        {item.title}
                      </p>
                      <p className="text-xs" style={{ color: "#8CA3D6" }}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* Stats */}
        <div
          className="relative z-10 flex items-center gap-6 pt-6"
          style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
        >
          {STATS.map((stat, i) => (
            <Fragment key={stat.label}>
              {i !== 0 && (
                <div
                  className="w-px h-8"
                  style={{ background: "rgba(255,255,255,0.12)" }}
                />
              )}
              <div>
                <p className="sc-mono text-xl" style={{ color: "#8FC4FB" }}>
                  {stat.value}
                </p>
                <p className="text-xs" style={{ color: "#8CA3D6" }}>
                  {stat.label}
                </p>
              </div>
            </Fragment>
          ))}
        </div>
      </div>

      {/* Overlay: vague lumineuse + halo interactif suivant le curseur */}
      <div className="hidden lg:block sc-wave-overlay" style={{ width: "46%" }}>
        <svg
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          width="100%"
          height="100%"
          style={{ overflow: "visible" }}
        >
          <path
            d={WAVE_EDGE}
            fill="none"
            stroke="url(#scWaveStroke)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div
          className="sc-cursor-glow"
          style={{ left: "100%", top: `${cursorY}%` }}
        />
      </div>

      {/* RIGHT — formulaire */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Brand mobile-only */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "#071433" }}
            >
              <GraduationCap size={18} color="#8FC4FB" />
            </div>
            <p className="sc-display text-xl" style={{ color: "#071433" }}>
              SmartCampus ERP
            </p>
          </div>

          <div
            className="rounded-3xl p-9"
            style={{
              background: "#FFFFFF",
              boxShadow: "0 24px 60px -20px rgba(15,35,90,0.18)",
            }}
          >
            {/* Tabs */}
            <div
              className="grid grid-cols-2 gap-1 p-1 rounded-2xl mb-8"
              style={{ background: "#EEF3FC" }}
            >
              <button
                type="button"
                data-active={isLogin}
                onClick={() => setTab("login")}
                className="sc-tab py-2.5 text-sm font-semibold rounded-xl"
              >
                Connexion
              </button>
              <button
                type="button"
                data-active={!isLogin}
                onClick={() => setTab("signup")}
                className="sc-tab py-2.5 text-sm font-semibold rounded-xl"
              >
                Inscription
              </button>
            </div>

            <h2 className="sc-display text-3xl" style={{ color: "#0F1B3D" }}>
              {isLogin ? "Bon retour" : "Créer un compte"}
            </h2>
            <p className="text-sm mt-2 mb-7" style={{ color: "#4B5165" }}>
              {isLogin
                ? "Connectez-vous pour suivre vos démarches."
                : "Rejoignez la plateforme en quelques secondes."}
            </p>

            {/* Role selector */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => setRole("etudiant")}
                className="sc-chip flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium"
                style={{
                  border:
                    role === "etudiant"
                      ? "1.5px solid #2451E0"
                      : "1.5px solid #DCE5F5",
                  background:
                    role === "etudiant"
                      ? "rgba(36,81,224,0.08)"
                      : "transparent",
                  color: role === "etudiant" ? "#2451E0" : "#4B5165",
                }}
              >
                <GraduationCap size={16} />
                Étudiant
              </button>
              <button
                type="button"
                onClick={() => setRole("personnel")}
                className="sc-chip flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium"
                style={{
                  border:
                    role === "personnel"
                      ? "1.5px solid #2451E0"
                      : "1.5px solid #DCE5F5",
                  background:
                    role === "personnel"
                      ? "rgba(36,81,224,0.08)"
                      : "transparent",
                  color: role === "personnel" ? "#2451E0" : "#4B5165",
                }}
              >
                <Users size={16} />
                Personnel
              </button>
            </div>
            {!showForgotPassword ? (
              <div className="space-y-4">
                {!isLogin && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        className="text-xs font-medium"
                        style={{ color: "#4B5165" }}
                      >
                        Prénom
                      </label>
                      <div className="sc-field flex items-center rounded-xl mt-1.5 px-3.5">
                        <User size={16} color="#9AA6C4" />
                        <input
                          type="text"
                          value={prenom}
                          onChange={(e) => setPrenom(e.target.value)}
                          placeholder="Prénom"
                          className="w-full bg-transparent p-2.5 pl-2.5 text-sm outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        className="text-xs font-medium"
                        style={{ color: "#4B5165" }}
                      >
                        Nom
                      </label>
                      <div className="sc-field flex items-center rounded-xl mt-1.5 px-3.5">
                        <input
                          type="text"
                          value={nom}
                          onChange={(e) => setNom(e.target.value)}
                          placeholder="Nom"
                          className="w-full bg-transparent p-2.5 text-sm outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label
                      className="text-xs font-medium"
                      style={{ color: "#4B5165" }}
                    >
                    Email
                  </label>
                  <div className="sc-field flex items-center rounded-xl mt-1.5 px-3.5">
                    <Mail size={16} color="#9AA6C4" />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="prenom.nom@edu.uiz.ac.ma"
                      className="w-full bg-transparent p-2.5 pl-2.5 text-sm outline-none"
                    />
                  </div>
                </div>
                {!isLogin && (
                  <div>
                    <label className="text-xs font-medium">Téléphone</label>

                    <div className="sc-field flex items-center rounded-xl mt-1.5 px-3.5">
                      <input
                        type="text"
                        value={telephone}
                        onChange={(e) => setTelephone(e.target.value)}
                        placeholder="06XXXXXXXX"
                        className="w-full bg-transparent p-2.5 text-sm outline-none"
                      />
                    </div>
                  </div>
                )}

                {!isLogin && (
                  <div>
                    <label
                      className="text-xs font-medium"
                      style={{ color: "#4B5165" }}
                    >
                      {idLabel}
                    </label>
                    <div className="sc-field flex items-center rounded-xl mt-1.5 px-3.5">
                      <span
                        className="sc-mono text-xs"
                        style={{ color: "#9AA6C4" }}
                      >
                        #
                      </span>
                      <input
                        type="text"
                        placeholder={
                          role === "etudiant"
                            ? "Ex. J123456789"
                            : "Ex. PR-00214"
                        }
                        className="w-full bg-transparent p-2.5 pl-2.5 text-sm outline-none sc-mono"
                      />
                    </div>
                  </div>
                )}

                {!isLogin && (
                  <div>
                    <label
                      className="text-xs font-medium"
                      style={{ color: "#4B5165" }}
                    >
                      Mot de passe
                    </label>
                    <div className="sc-field flex items-center rounded-xl mt-1.5 px-3.5">
                      <Lock size={16} color="#9AA6C4" />
                      <input
                        type={showPwd ? "text" : "password"}
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-transparent p-2.5 pl-2.5 text-sm outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="shrink-0"
                      >
                        {showPwd ? (
                          <EyeOff size={16} color="#9AA6C4" />
                        ) : (
                          <Eye size={16} color="#9AA6C4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
                {isLogin && (
                  <div>
                    <label
                      className="text-xs font-medium"
                      style={{ color: "#4B5165" }}
                    >
                      Mot de passe
                    </label>
                    <div className="sc-field flex items-center rounded-xl mt-1.5 px-3.5">
                      <Lock size={16} color="#9AA6C4" />
                      <input
                        type={showPwd ? "text" : "password"}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-transparent p-2.5 pl-2.5 text-sm outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="shrink-0"
                      >
                        {showPwd ? (
                          <EyeOff size={16} color="#9AA6C4" />
                        ) : (
                          <Eye size={16} color="#9AA6C4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
                {!isLogin && (
                  <div className="mt-3 space-y-2">
                    <div
                      className={`flex items-center gap-2 text-sm ${
                        passwordChecks.length
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      {passwordChecks.length ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <XCircle size={16} />
                      )}
                      Au moins 12 caractères
                    </div>

                    <div
                      className={`flex items-center gap-2 text-sm ${
                        passwordChecks.upper
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      {passwordChecks.upper ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <XCircle size={16} />
                      )}
                      Une majuscule
                    </div>

                    <div
                      className={`flex items-center gap-2 text-sm ${
                        passwordChecks.lower
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      {passwordChecks.lower ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <XCircle size={16} />
                      )}
                      Une minuscule
                    </div>

                    <div
                      className={`flex items-center gap-2 text-sm ${
                        passwordChecks.number
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      {passwordChecks.number ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <XCircle size={16} />
                      )}
                      Un chiffre
                    </div>

                    <div
                      className={`flex items-center gap-2 text-sm ${
                        passwordChecks.special
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      {passwordChecks.special ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <XCircle size={16} />
                      )}
                      Un caractère spécial
                    </div>

                    <div className="mt-4">
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            passwordStrong
                              ? "bg-green-500 w-full"
                              : Object.values(passwordChecks).filter(Boolean)
                                    .length >= 4
                                ? "bg-yellow-500 w-4/5"
                                : Object.values(passwordChecks).filter(Boolean)
                                      .length >= 3
                                  ? "bg-orange-500 w-3/5"
                                  : Object.values(passwordChecks).filter(
                                        Boolean,
                                      ).length >= 2
                                    ? "bg-red-400 w-2/5"
                                    : "bg-red-600 w-1/5"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {!isLogin && (
                  <div>
                    <label
                      className="text-xs font-medium"
                      style={{ color: "#4B5165" }}
                    >
                      Confirmer le mot de passe
                    </label>
                    <div className="sc-field flex items-center rounded-xl mt-1.5 px-3.5">
                      <Lock size={16} color="#9AA6C4" />
                      <input
                        type={showPwd2 ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-transparent p-2.5 pl-2.5 "
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd2((v) => !v)}
                        className="shrink-0"
                      >
                        {showPwd2 ? (
                          <EyeOff size={16} color="#9AA6C4" />
                        ) : (
                          <Eye size={16} color="#9AA6C4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {isLogin ? (
                  <div className="flex justify-between items-center pt-1">
                    <label
                      className="flex items-center gap-2 text-sm"
                      style={{ color: "#4B5165" }}
                    >
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={() => {
                        const value = !remember;
                        setRemember(value);
                        localStorage.setItem(
                          "rememberMe",
                          JSON.stringify(value)
                        );
                      }}
                        className="accent-current"
                        style={{ color: "#2451E0" }}
                      />
                      Se souvenir de moi
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setResetStep(1);

                        setError("");
                        setSuccess("");

                        setResetEmail("");
                        setOtp("");
                        setNewPassword("");
                        setConfirmNewPassword("");
                      }}
                      className="text-sm font-medium text-[#2451E0] cursor-pointer hover:text-[#16337A] hover:underline transition-all duration-200"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                ) : (
                  <label
                    className="flex items-start gap-2 text-sm pt-1"
                    style={{ color: "#4B5165" }}
                  >
                    <input
                      type="checkbox"
                      checked={agree}
                      onChange={() => setAgree((v) => !v)}
                      className="mt-0.5"
                      style={{ color: "#2451E0" }}
                    />
                    J'accepte les conditions d'utilisation et la charte de la
                    plateforme.
                  </label>
                )}

                <button
                  type="button"
                  onClick={isLogin ? handleLogin : handleRegister}
                  className="sc-btn-primary w-full text-white py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mt-2"
                >
                  {isLogin ? "Se connecter" : "Créer mon compte"}
                  <ArrowRight size={16} />
                </button>
                {error && (
                  <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-red-600">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="mt-4 rounded-xl bg-green-50 border border-green-200 p-3 text-green-700">
                    {success}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                {/* Step 1 */}

                {resetStep === 1 && (
                  <>
                    <h2 className="text-2xl font-bold">Mot de passe oublié</h2>

                    <p className="text-sm text-gray-500">
                      Entrez votre adresse email.
                    </p>
                    <div>
                      <div
                        className="sc-field flex items-center rounded-xl px-3.5"
                        style={{
                          borderColor: emailError ? "#ef4444" : undefined,
                          boxShadow: emailError
                            ? "0 0 0 4px rgba(239,68,68,.15)"
                            : undefined,
                        }}
                      >
                        <Mail size={16} />
                        <input
                          value={resetEmail}
                          onChange={(e) => {
                            setResetEmail(e.target.value);
                            setEmailError("");
                          }}
                          placeholder="Email"
                          className="w-full bg-transparent p-3 outline-none"
                        />
                      </div>
                      {emailError && (
                        <p className="text-red-500 text-sm mt-2">
                          {emailError}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={handleForgotPassword}
                      className="sc-btn-primary w-full text-white py-3 rounded-xl"
                    >
                      {loading ? "Envoi..." : "Envoyer le code"}
                    </button>
                  </>
                )}

                {/* Step 2 */}

                {resetStep === 2 && (
                  <>
                    <h2 className="text-2xl font-bold">Vérification</h2>

                    <p className="text-sm text-gray-500">
                      Entrez le code reçu.
                    </p>

                    <input
                      value={otp}
                      onChange={(e) => {
                        setOtp(e.target.value);
                        setOtpError("");
                      }}
                      placeholder="Votre code OTP reçu "
                      className="sc-field w-full rounded-xl p-3"
                      style={{
                        borderColor: otpError ? "#ef4444" : undefined,
                      }}
                    />
                    {otpError && (
                      <p className="text-red-500 text-sm mt-2">{otpError}</p>
                    )}

                    {otpVerified && (
                      <div className="flex items-center gap-2 text-green-600 mt-2">
                        <CheckCircle2 size={18} />
                        Code vérifié
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-4">
                      <span className="text-sm text-gray-500">
                        {canResend
                          ? "Nouveau code OTP est disponible."
                          : `Renvoyer dans ${countdown}s`}
                      </span>

                      <button
                        disabled={!canResend}
                        onClick={handleResendOtp}
                        className={`text-sm font-medium ${
                          canResend
                            ? "text-blue-600 hover:underline"
                            : "text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        Renvoyer le code
                      </button>
                    </div>
                    <button
                      onClick={handleVerifyOTP}
                      className="sc-btn-primary w-full text-white py-3 rounded-xl"
                    >
                      Vérifier
                    </button>
                    <p className="text-xs text-gray-500 mt-3">
                      Vous n'avez pas reçu le code ? Vérifiez votre dossier Spam
                      ou cliquez sur
                      <strong> Renvoyer le code</strong>
                    </p>
                  </>
                )}

                {/* Step 3 */}

                {resetStep === 3 && (
                  <>
                    <h2 className="text-2xl font-bold">Nouveau mot de passe</h2>

                    <div className="sc-field flex items-center rounded-xl px-3.5">
                      <Lock size={16} color="#9AA6C4" />

                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setPasswordError("");
                        }}
                        className="w-full bg-transparent p-2.5 pl-2.5 text-sm outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div
                        className={`flex items-center gap-2 text-sm ${
                          resetPasswordChecks.length
                            ? "text-green-600"
                            : "text-gray-500"
                        }`}
                      >
                        {resetPasswordChecks.length ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <XCircle size={16} />
                        )}
                        Au moins 12 caractères
                      </div>

                      <div
                        className={`flex items-center gap-2 text-sm ${
                          resetPasswordChecks.upper
                            ? "text-green-600"
                            : "text-gray-500"
                        }`}
                      >
                        {resetPasswordChecks.upper ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <XCircle size={16} />
                        )}
                        Une majuscule
                      </div>

                      <div
                        className={`flex items-center gap-2 text-sm ${
                          resetPasswordChecks.lower
                            ? "text-green-600"
                            : "text-gray-500"
                        }`}
                      >
                        {resetPasswordChecks.lower ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <XCircle size={16} />
                        )}
                        Une minuscule
                      </div>

                      <div
                        className={`flex items-center gap-2 text-sm ${
                          resetPasswordChecks.number
                            ? "text-green-600"
                            : "text-gray-500"
                        }`}
                      >
                        {resetPasswordChecks.number ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <XCircle size={16} />
                        )}
                        Un chiffre
                      </div>

                      <div
                        className={`flex items-center gap-2 text-sm ${
                          resetPasswordChecks.special
                            ? "text-green-600"
                            : "text-gray-500"
                        }`}
                      >
                        {resetPasswordChecks.special ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <XCircle size={16} />
                        )}
                        Un caractère spécial
                      </div>

                      <div className="mt-4">
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              resetPasswordStrong
                                ? "bg-green-500 w-full"
                                : Object.values(resetPasswordChecks).filter(
                                      Boolean,
                                    ).length >= 4
                                  ? "bg-yellow-500 w-4/5"
                                  : Object.values(resetPasswordChecks).filter(
                                        Boolean,
                                      ).length >= 3
                                    ? "bg-orange-500 w-3/5"
                                    : Object.values(resetPasswordChecks).filter(
                                          Boolean,
                                        ).length >= 2
                                      ? "bg-red-400 w-2/5"
                                      : "bg-red-600 w-1/5"
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="sc-field flex items-center rounded-xl px-3.5">
                      <Lock size={16} color="#9AA6C4" />

                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="w-full bg-transparent p-2.5 pl-2.5 text-sm outline-none"
                        placeholder="Confirmer"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>

                    <button
                      onClick={handleResetPassword}
                      className="sc-btn-primary w-full text-white py-3 rounded-xl"
                    >
                      Réinitialiser
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    setShowForgotPassword(false);

                    setError("");

                    setSuccess("");
                  }}
                  className="text-[#2451E0] hover:underline cursor-pointer transition-all duration-200"
                >
                  Retour à la connexion
                </button>
              </div>
            )}

            <p
              className="text-center text-sm mt-6"
              style={{ color: "#4B5165" }}
            >
              {isLogin ? "Pas encore de compte ? " : "Déjà inscrit ? "}
              <button
                type="button"
                onClick={() => {
                  setTab(isLogin ? "signup" : "login");
                  setError("");
                  setSuccess("");
                }}
                className="font-semibold text-[#2451E0] cursor-pointer hover:text-[#16337A] hover:underline transition-all duration-200"
              >
                {isLogin ? "Créer un compte" : "Se connecter"}
              </button>
            </p>
          </div>

          <p className="text-center text-xs mt-6" style={{ color: "#9AA6C4" }}>
            Besoin d'aide ? Contactez le service de la scolarité.
          </p>
        </div>
      </div>
    </div>
  );
}
