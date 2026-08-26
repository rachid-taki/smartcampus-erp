import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { Briefcase, GraduationCap, Tent, Users, Settings } from 'lucide-react';

import Login from "./pages/Login";

// ═══════════════════════════════════════════════════════
// ÉTUDIANT (depuis HEAD)
// ═══════════════════════════════════════════════════════
import Layout from "./components/student/layout/Layout";
import Dashboard from "./pages/StudentPortal/Dashboard/Dashboard";
import PageComingSoon from "./components/student/common/PageComingSoon";
import WorkflowPage from "./pages/StudentPortal/WorkFlow/WorkFlow";
import RequestsPage from "./pages/StudentPortal/Requests/RequestsPage";
import Profile from "./pages/StudentPortal/Profile/Profile";
import Documents from "./pages/StudentPortal/Documents/Documents";
import Notifications from "./pages/StudentPortal/Notifications/Notifications";
import AcademicCalendar from "./pages/StudentPortal/Calendar/AcademicCalendar";
import SettingsPage from "./pages/StudentPortal/Settings/Settings";
import Reclamations from "./pages/StudentPortal/Reclamation/Reclamations";
import Assistant from "./pages/Assistant/Assistant";
import Messaging from "./pages/StudentPortal/Messaging";

// ═══════════════════════════════════════════════════════
// SUPER ADMIN (depuis HEAD)
// ═══════════════════════════════════════════════════════
import SuperAdminLayout from "./components/superadmin/layouts/SuperAdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminRoles from "./pages/admin/Roles";
import AdminPermissions from "./pages/admin/Permissions";
import AdminAudit from "./pages/admin/Audit";

// ═══════════════════════════════════════════════════════
// SCOLARITÉ MESSAGING (depuis HEAD)
// ═══════════════════════════════════════════════════════
import ScolariteMessaging from "./pages/scolarite/Messaging";

// ═══════════════════════════════════════════════════════
// LAYOUTS MODULAIRES (depuis feature/scolarite)
// ═══════════════════════════════════════════════════════
import ScolariteLayout from './modules/scolarite/layout/ScolariteLayout';
import RhLayout from './modules/rh/layout/RhLayout';
import EnseignantLayout from './modules/enseignant/layout/EnseignantLayout';
import ClubLayout from './modules/clubs/layout/ClubLayout';
import ConfigLayout from './modules/configuration/layout/ConfigLayout';

import ProtectedRoute from "./components/ProtectedRoute";

// ─────────────────────────────────────────────────────────────
// Protège les routes : redirige vers login si pas connecté
// ─────────────────────────────────────────────────────────────
function ModuleProtectedRoute({ children, redirectTo }: { children: React.ReactNode; redirectTo: string }) {
  const userStr = localStorage.getItem("user");
  if (!userStr) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectTo)}`} replace />;
  }
  try {
    JSON.parse(userStr);
    return <>{children}</>;
  } catch {
    localStorage.removeItem("user");
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectTo)}`} replace />;
  }
}

// ─────────────────────────────────────────────────────────────
// Page d'accueil : Sélecteur de Portail
// ─────────────────────────────────────────────────────────────
function PortalSelector() {
  const navigate = useNavigate();

  const handleModuleClick = (path: string) => {
    navigate(`/login?redirect=${encodeURIComponent(path)}`);
  };

  return (
    <div className="sc-portal min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight">
          SmartCampus ERP
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-3 text-sm md:text-base">
          Veuillez sélectionner le portail auquel vous souhaitez accéder.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-6 max-w-6xl w-full">
        <div
          onClick={() => handleModuleClick('/scolarite')}
          className="group w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(25%-1.5rem)] card card-hover p-6 flex flex-col items-center text-center cursor-pointer"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mb-4 group-hover:scale-110 group-hover:bg-primary-600 group-hover:text-white transition-all duration-300">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Scolarité</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gestion des étudiants, workflows et attestations.</p>
        </div>

        <div
          onClick={() => handleModuleClick('/rh')}
          className="group w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(25%-1.5rem)] card card-hover p-6 flex flex-col items-center text-center cursor-pointer"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mb-4 group-hover:scale-110 group-hover:bg-primary-600 group-hover:text-white transition-all duration-300">
            <Users className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Ressources Humaines</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gestion des employés, congés et feuilles de temps.</p>
        </div>

        <div
          onClick={() => handleModuleClick('/enseignant')}
          className="group w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(25%-1.5rem)] card card-hover p-6 flex flex-col items-center text-center cursor-pointer"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mb-4 group-hover:scale-110 group-hover:bg-primary-600 group-hover:text-white transition-all duration-300">
            <Briefcase className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Espace Enseignant</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Consultations, absences et réclamations de notes.</p>
        </div>

        <div
          onClick={() => handleModuleClick('/clubs')}
          className="group w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(25%-1.5rem)] card card-hover p-6 flex flex-col items-center text-center cursor-pointer"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mb-4 group-hover:scale-110 group-hover:bg-primary-600 group-hover:text-white transition-all duration-300">
            <Tent className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Vie Étudiante & Clubs</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Smart Campus, réservations et gestion des clubs.</p>
        </div>

        <div
          onClick={() => handleModuleClick('/config')}
          className="group w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(25%-1.5rem)] card card-hover p-6 flex flex-col items-center text-center cursor-pointer"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mb-4 group-hover:scale-110 group-hover:bg-primary-600 group-hover:text-white transition-all duration-300">
            <Settings className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Configuration</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Paramètres globaux et calendrier académique.</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Redirection intelligente (depuis HEAD)
// ─────────────────────────────────────────────────────────────
function SmartRedirect() {
  const userStr = localStorage.getItem("user");

  if (!userStr) return <Navigate to="/login" replace />;

  try {
    const user = JSON.parse(userStr);
    switch (user.role) {
      case "ETUDIANT":
        return <Navigate to="/student/dashboard" replace />;
      case "SCOLARITE":
        return <Navigate to="/scolarite/dashboard" replace />;
      case "SUPER_ADMIN":
        return <Navigate to="/admin/dashboard" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  } catch {
    return <Navigate to="/login" replace />;
  }
}

// ─────────────────────────────────────────────────────────────
// App Component : Configuration du Routage
// ─────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PortalSelector />} />

        {/* ═══════════════ ÉTUDIANT (depuis HEAD) ═══════════════ */}
        <Route element={<Layout />}>
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={["ETUDIANT"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/student/profile" element={<Profile />} />
          <Route
            path="/student/requests"
            element={
              <ProtectedRoute allowedRoles={["ETUDIANT"]}>
                <RequestsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/student/workflow" element={<WorkflowPage />} />
          <Route path="/student/documents" element={<Documents />} />
          <Route path="/student/notifications" element={<Notifications />} />
          <Route path="/student/calendrier" element={<AcademicCalendar />} />
          <Route path="/historique" element={<PageComingSoon title="Historique" />} />
          <Route path="/student/parametres" element={<SettingsPage />} />
          <Route path="/student/reclamations" element={<Reclamations />} />
          <Route path="/student/assistant" element={<Assistant />} />
          <Route path="/student/messages" element={<Messaging />} />
        </Route>

        {/* ═══════════════ MESSAGING SCOLARITÉ (depuis HEAD) ═══════════════ */}
        <Route
          path="/scolarite/messages"
          element={
            <ProtectedRoute allowedRoles={["SCOLARITE"]}>
              <ScolariteMessaging />
            </ProtectedRoute>
          }
        />

        {/* ═══════════════ SUPER ADMIN (depuis HEAD) ═══════════════ */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
              <SuperAdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="roles" element={<AdminRoles />} />
          <Route path="permissions" element={<AdminPermissions />} />
          <Route path="audit" element={<AdminAudit />} />
        </Route>

        {/* ═══════════════ MODULES MODULAIRES (depuis feature/scolarite) ═══════════════ */}
        <Route
          path="/scolarite/*"
          element={
            <ModuleProtectedRoute redirectTo="/scolarite">
              <ScolariteLayout />
            </ModuleProtectedRoute>
          }
        />
        <Route
          path="/rh/*"
          element={
            <ModuleProtectedRoute redirectTo="/rh">
              <RhLayout />
            </ModuleProtectedRoute>
          }
        />
        <Route
          path="/enseignant/*"
          element={
            <ModuleProtectedRoute redirectTo="/enseignant">
              <EnseignantLayout />
            </ModuleProtectedRoute>
          }
        />
        <Route
          path="/clubs/*"
          element={
            <ModuleProtectedRoute redirectTo="/clubs">
              <ClubLayout />
            </ModuleProtectedRoute>
          }
        />
        <Route
          path="/config/*"
          element={
            <ModuleProtectedRoute redirectTo="/config">
              <ConfigLayout />
            </ModuleProtectedRoute>
          }
        />

        {/* ═══════════════ REDIRECTION INTELLIGENTE ═══════════════ */}
        <Route path="/redirect" element={<SmartRedirect />} />

        {/* ═══════════════ 404 ═══════════════ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}