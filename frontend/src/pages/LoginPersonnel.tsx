import { useState, Fragment, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  login, forgotPassword, verifyOTP, resetPassword,
} from "../services/auth.service";
import {
  Mail, Lock, Eye, EyeOff, GraduationCap, Users,
  CheckCircle2, ArrowRight, XCircle, Shield, BookOpen,
} from "lucide-react";
import { RiArrowGoBackFill } from "react-icons/ri";

interface Stat { value: string; label: string; }
type Tab = "login" | "forgot";

const STATS: Stat[] = [
  { value: "100%", label: "traçabilité des actions" },
  { value: "15+", label: "modules administratifs" },
  { value: "RGPD", label: "conforme" },
];

const WAVE_EDGE =
  "M1,0 C0.97,0.06 0.93,0.09 0.94,0.15 C0.95,0.21 1,0.24 1,0.3 C1,0.36 0.93,0.39 0.92,0.45 C0.91,0.51 0.99,0.54 1,0.6 C1,0.66 0.93,0.69 0.93,0.75 C0.93,0.81 1,0.84 1,0.9 C1,0.94 0.98,0.97 1,1";
const WAVE_CLIP = `M0,0 H1 ${WAVE_EDGE.replace("M1,0 ", "")} H0 Z`;

// Rôles autorisés sur cet espace — affichés à titre indicatif uniquement
const STAFF_ROLES = [
  { label: "Scolarité",          desc: "Workflows, attestations, EDT",           icon: GraduationCap },
  { label: "Enseignant",         desc: "Notes, consultations, absences",         icon: BookOpen },
  { label: "Ressources Humaines", desc: "Congés, employés, attestations",        icon: Users },
  { label: "Super Admin",        desc: "Utilisateurs, rôles, audit",             icon: Shield },
];

export default function LoginPersonnel() {
  const [tab, setTab] = useState<Tab>("login");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(() =>
    JSON.parse(localStorage.getItem("rememberMe") || "false")
  );
  const [cursorY, setCursorY] = useState(50);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = ((e.clientY - rect.top) / rect.height) * 100;
    setCursorY(Math.min(100, Math.max(0, pct)));
  };

  const [loginEmail, setLoginEmail] = useState(localStorage.getItem("rememberEmail") || "");
  const [loginPassword, setLoginPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetStep, setResetStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    const rem = localStorage.getItem("rememberMe") === "true";
    if (!rem) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("role");
    }
  }, []);

  const handleLogin = async () => {
    try {
      const res = await login(loginEmail, loginPassword);

      // 🔒 Vérifier que le compte n'est pas un compte étudiant
      if (res.user.role === "ETUDIANT") {
        setError("Ce compte est un compte étudiant. Utilisez l'espace Étudiant.");
        setTimeout(() => navigate("/login"), 2500);
        return;
      }

      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
      localStorage.setItem("role", res.user.role);
      setError("");

      // Redirection selon le rôle réel du compte
      switch (res.user.role) {
        case "SCOLARITE":   navigate("/scolarite/dashboard"); break;
        case "RH":          navigate("/rh/dashboard"); break;
        case "ENSEIGNANT":  navigate("/enseignant/dashboard"); break;
        case "SUPER_ADMIN": navigate("/admin/dashboard"); break;
        default:            navigate("/");
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
      setError(err.response?.data?.message || "Email ou mot de passe incorrect.");
    }
  };

  const handleForgotPassword = async () => {
    try {
      setLoading(true);
      const res = await forgotPassword(resetEmail);
      setSuccess(res.message); setError("");
      setResetStep(2); setCountdown(60); setCanResend(false);
    } catch (err: any) {
      setSuccess("");
      setEmailError(err.response?.data?.message || "Adresse email introuvable.");
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    try {
      setLoading(true);
      await verifyOTP(resetEmail, otp);
      setOtpVerified(true); setSuccess("Code vérifié."); setError("");
      setResetStep(3);
    } catch (err: any) {
      setSuccess(""); setOtpVerified(false);
      setOtpError(err.response?.data?.message || "Code OTP incorrect.");
    } finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmNewPassword) {
      setError("Les mots de passe ne correspondent pas."); return;
    }
    try {
      setLoading(true);
      const res = await resetPassword(resetEmail, otp, newPassword);
      setSuccess(res.message); setError("");
      setTimeout(() => { setTab("login"); setResetStep(1); }, 2000);
    } catch (err: any) {
      setSuccess("");
      setError(err.response?.data?.message || "Erreur.");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (resetStep !== 2) return;
    if (countdown === 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, resetStep]);

  return (
    <div className="sc-auth min-h-screen flex relative" style={{ background: "#F4F7FD" }} onMouseMove={handleMouseMove}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <clipPath id="scWaveClip" clipPathUnits="objectBoundingBox"><path d={WAVE_CLIP} /></clipPath>
          <linearGradient id="scWaveStroke2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity={0} />
            <stop offset="50%" stopColor="#6EE7B7" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .sc-auth { font-family: 'Plus Jakarta Sans', sans-serif; }
        .sc-display { font-family: 'Fraunces', serif; }
        .sc-mono { font-family: 'IBM Plex Mono', monospace; }
        .sc-panel-staff {
          background: radial-gradient(circle at 15% 8%, #065F46 0%, #022C22 55%), #022C22;
          position: relative; clip-path: url(#scWaveClip);
          filter: drop-shadow(18px 0 40px rgba(2,44,34,0.42));
        }
        .sc-dotgrid-staff {
          position: absolute; inset: 0;
          background-image: radial-gradient(rgba(110,231,183,0.18) 1px, transparent 1px);
          background-size: 26px 26px;
          mask-image: radial-gradient(ellipse 80% 60% at 30% 30%, black 40%, transparent 90%);
        }
        .sc-wave-overlay { position: absolute; top: 0; left: 0; height: 100%; pointer-events: none; z-index: 20; }
        .sc-cursor-glow-staff {
          position: absolute; width: 180px; height: 180px; border-radius: 9999px;
          background: radial-gradient(circle, rgba(110,231,183,0.5), transparent 70%);
          filter: blur(20px); pointer-events: none; transform: translate(-50%, -50%);
          transition: top 0.18s ease-out; z-index: 21; mix-blend-mode: screen;
        }
        .sc-seal { animation: sc-spin 26s linear infinite; }
        @keyframes sc-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .sc-seal, .sc-cursor-glow-staff { animation: none; transition: none; } }
        .sc-field { border: 1.5px solid #D1FAE5; background: #FFFFFF; transition: border-color .15s ease, box-shadow .15s ease; }
        .sc-field:focus-within { border-color: #059669; box-shadow: 0 0 0 4px rgba(5,150,105,0.14); }
        .sc-btn-primary-staff {
          background: linear-gradient(135deg, #059669, #065F46);
          transition: filter .15s ease, transform .15s ease, box-shadow .15s ease;
          box-shadow: 0 14px 28px -12px rgba(5,150,105,0.55);
        }
        .sc-btn-primary-staff:hover { filter: brightness(1.08); transform: translateY(-1px); }
        .sc-btn-primary-staff:active { transform: translateY(0); }
      `}</style>

      {/* LEFT — panneau staff (vert émeraude) — indicatif, non cliquable */}
      <div className="hidden lg:flex sc-panel-staff w-[46%] flex-col justify-between p-14 text-white">
        <div className="sc-dotgrid-staff" />
        <div className="relative z-10 flex items-center gap-5">
          <div className="sc-seal w-16 h-16 rounded-full flex items-center justify-center shrink-0" style={{ border: "1.5px dashed #6EE7B7" }}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "#064E3B" }}>
              <Shield size={20} color="#6EE7B7" />
            </div>
          </div>
          <div>
            <p className="sc-display text-2xl leading-tight">SmartCampus ERP</p>
            <p className="text-xs tracking-wide uppercase mt-1" style={{ color: "#A7F3D0" }}>Espace Personnel</p>
          </div>
        </div>

        <div className="relative z-10 space-y-3">
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "#A7F3D0" }}>
            Accès réservé au personnel
          </p>
          {/* Rôles autorisés — AFFICHAGE PUR (pas de bouton, pas d'onClick) */}
          {STAFF_ROLES.map((info, i) => {
            const Icon = info.icon;
            return (
              <div
                key={i}
                className="w-full rounded-2xl p-4 flex items-center gap-3"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(110,231,183,0.15)" }}>
                  <Icon size={18} color="#6EE7B7" />
                </div>
                <div className="text-left min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{info.label}</p>
                  <p className="text-xs text-emerald-200/70 truncate">{info.desc}</p>
                </div>
                <CheckCircle2 size={18} color="#6EE7B7" className="shrink-0" />
              </div>
            );
          })}
        </div>

        <div className="relative z-10 flex items-center gap-6 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          {STATS.map((stat, i) => (
            <Fragment key={stat.label}>
              {i !== 0 && <div className="w-px h-8" style={{ background: "rgba(255,255,255,0.12)" }} />}
              <div>
                <p className="sc-mono text-xl" style={{ color: "#6EE7B7" }}>{stat.value}</p>
                <p className="text-xs" style={{ color: "#A7F3D0" }}>{stat.label}</p>
              </div>
            </Fragment>
          ))}
        </div>
      </div>

      <div className="hidden lg:block sc-wave-overlay" style={{ width: "46%" }}>
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" width="100%" height="100%" style={{ overflow: "visible" }}>
          <path d={WAVE_EDGE} fill="none" stroke="url(#scWaveStroke2)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="sc-cursor-glow-staff" style={{ left: "100%", top: `${cursorY}%` }} />
      </div>

      {/* RIGHT — formulaire unique pour tout le personnel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <Link to="/" className="flex items-center gap-3">
              <RiArrowGoBackFill size={18} color="#059669" />
              <span className="text-sm font-medium" style={{ color: "#059669" }}>Autre espace</span>
            </Link>
          </div>

          <div className="rounded-3xl p-9" style={{ background: "#FFFFFF", boxShadow: "0 24px 60px -20px rgba(6,95,70,0.18)" }}>
            <div className="flex items-center gap-2 mb-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <Shield size={11} />
                Personnel autorisé
              </span>
            </div>

            <h2 className="sc-display text-3xl" style={{ color: "#064E3B" }}>
              {tab === "login" ? "Espace Personnel" : "Récupération"}
            </h2>
            <p className="text-sm mt-2 mb-7" style={{ color: "#4B5165" }}>
              {tab === "login"
                ? "Connectez-vous avec vos identifiants professionnels. Vous serez redirigé automatiquement vers votre espace."
                : "Récupérez l'accès à votre compte professionnel."}
            </p>

            {tab === "login" ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium" style={{ color: "#4B5165" }}>Email professionnel</label>
                  <div className="sc-field flex items-center rounded-xl mt-1.5 px-3.5">
                    <Mail size={16} color="#9AA6C4" />
                    <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="prenom.nom@uiz.ac.ma" className="w-full bg-transparent p-2.5 pl-2.5 text-sm outline-none" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium" style={{ color: "#4B5165" }}>Mot de passe</label>
                  <div className="sc-field flex items-center rounded-xl mt-1.5 px-3.5">
                    <Lock size={16} color="#9AA6C4" />
                    <input type={showPwd ? "text" : "password"} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••" className="w-full bg-transparent p-2.5 pl-2.5 text-sm outline-none" />
                    <button type="button" onClick={() => setShowPwd((v) => !v)} className="shrink-0">
                      {showPwd ? <EyeOff size={16} color="#9AA6C4" /> : <Eye size={16} color="#9AA6C4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <label className="flex items-center gap-2 text-sm" style={{ color: "#4B5165" }}>
                    <input type="checkbox" checked={remember}
                      onChange={() => { const v = !remember; setRemember(v); localStorage.setItem("rememberMe", JSON.stringify(v)); }}
                      className="accent-current" style={{ color: "#059669" }} />
                    Se souvenir de moi
                  </label>
                  <button type="button"
                    onClick={() => { setTab("forgot"); setResetStep(1); setError(""); setSuccess(""); setResetEmail(""); setOtp(""); }}
                    className="text-sm font-medium text-[#059669] cursor-pointer hover:text-[#065F46] hover:underline transition-all duration-200">
                    Mot de passe oublié ?
                  </button>
                </div>

                <button type="button" onClick={handleLogin}
                  className="sc-btn-primary-staff w-full text-white py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mt-2">
                  Se connecter <ArrowRight size={16} />
                </button>

                {error && <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-red-600 text-sm">{error}</div>}
                {success && <div className="mt-4 rounded-xl bg-green-50 border border-green-200 p-3 text-green-700 text-sm">{success}</div>}

                <div className="pt-2 text-center">
                  <Link to="/" className="text-xs font-medium text-[#059669] hover:text-[#065F46] hover:underline">
                    ← Je suis étudiant (retour)
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {resetStep === 1 && (
                  <>
                    <h2 className="text-2xl font-bold" style={{ color: "#064E3B" }}>Mot de passe oublié</h2>
                    <p className="text-sm text-gray-500">Entrez votre email professionnel.</p>
                    <div className="sc-field flex items-center rounded-xl px-3.5"
                      style={{ borderColor: emailError ? "#ef4444" : undefined }}>
                      <Mail size={16} />
                      <input value={resetEmail} onChange={(e) => { setResetEmail(e.target.value); setEmailError(""); }}
                        placeholder="Email" className="w-full bg-transparent p-3 outline-none" />
                    </div>
                    {emailError && <p className="text-red-500 text-sm">{emailError}</p>}
                    <button onClick={handleForgotPassword} className="sc-btn-primary-staff w-full text-white py-3 rounded-xl">
                      {loading ? "Envoi..." : "Envoyer le code"}
                    </button>
                  </>
                )}
                {resetStep === 2 && (
                  <>
                    <h2 className="text-2xl font-bold" style={{ color: "#064E3B" }}>Vérification OTP</h2>
                    <input value={otp} onChange={(e) => { setOtp(e.target.value); setOtpError(""); }}
                      placeholder="Code OTP reçu" className="sc-field w-full rounded-xl p-3"
                      style={{ borderColor: otpError ? "#ef4444" : undefined }} />
                    {otpError && <p className="text-red-500 text-sm">{otpError}</p>}
                    {otpVerified && <div className="flex items-center gap-2 text-green-600"><CheckCircle2 size={18} />Code vérifié</div>}
                    <button onClick={handleVerifyOTP} className="sc-btn-primary-staff w-full text-white py-3 rounded-xl">Vérifier</button>
                  </>
                )}
                {resetStep === 3 && (
                  <>
                    <h2 className="text-2xl font-bold" style={{ color: "#064E3B" }}>Nouveau mot de passe</h2>
                    <div className="sc-field flex items-center rounded-xl px-3.5">
                      <Lock size={16} color="#9AA6C4" />
                      <input type={showNewPassword ? "text" : "password"} value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-transparent p-2.5 pl-2.5 text-sm outline-none" />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}>
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div className="sc-field flex items-center rounded-xl px-3.5">
                      <Lock size={16} color="#9AA6C4" />
                      <input type={showConfirmPassword ? "text" : "password"} value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="Confirmer"
                        className="w-full bg-transparent p-2.5 pl-2.5 text-sm outline-none" />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <button onClick={handleResetPassword} className="sc-btn-primary-staff w-full text-white py-3 rounded-xl">
                      Réinitialiser
                    </button>
                  </>
                )}
                <button onClick={() => { setTab("login"); setError(""); setSuccess(""); }}
                  className="text-[#059669] hover:underline cursor-pointer transition-all duration-200">
                  Retour à la connexion
                </button>
              </div>
            )}
          </div>

          <p className="text-center text-xs mt-6" style={{ color: "#9AA6C4" }}>
            Accès réservé au personnel autorisé. Contactez votre administrateur en cas de problème.
          </p>
        </div>
      </div>
    </div>
  );
}