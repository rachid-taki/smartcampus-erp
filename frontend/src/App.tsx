import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { Briefcase, GraduationCap, Tent, Users, Settings, Shield, User, AlertCircle, Bot, MessageSquare, Building2 } from 'lucide-react';
import Login from "./pages/Login";
import PresidenceClub from "./pages/StudentPortal/PresidenceClub/PresidenceClub";

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

import SuperAdminLayout from "./components/superadmin/layouts/SuperAdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminRoles from "./pages/admin/Roles";
import AdminPermissions from "./pages/admin/Permissions";
import AdminAudit from "./pages/admin/Audit";

import ScolariteMessaging from "./pages/scolarite/Messaging";

import ScolariteLayout from './modules/scolarite/layout/ScolariteLayout';
import RhLayout from './modules/rh/layout/RhLayout';
import EnseignantLayout from './modules/enseignant/layout/EnseignantLayout';
import ClubLayout from './modules/clubs/layout/ClubLayout';
import ConfigLayout from './modules/configuration/layout/ConfigLayout';

import ProtectedRoute from "./components/ProtectedRoute";

/*
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
*/

function ModuleProtectedRoute({ children }: { children: React.ReactNode; redirectTo?: string }) {
  return <>{children}</>;
}

function PortalSelector() {
  const navigate = useNavigate();
  const userStr = localStorage.getItem("user");
  
  let isSuperAdmin = false;
  // let isPresidentDeClub = false;
  const isPresidentDeClub = localStorage.getItem("isPresidentClub") === "true";

  
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      isSuperAdmin = user.role === "SUPER_ADMIN";
      // isPresidentDeClub = user.role === "PRESIDENT_CLUB";
    } catch (e) {
      console.error("Invalid user data in localStorage");
    }
  }

  //const handleModuleClick = (path: string) => {
  //  navigate(`/login?redirect=${encodeURIComponent(path)}`, { replace: true });
  //};
  const handleModuleClick = (path: string) => {
    navigate(path);
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

        <div
          onClick={() => handleModuleClick('/student/dashboard')}
          className="group w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(25%-1.5rem)] card card-hover p-6 flex flex-col items-center text-center cursor-pointer"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-4 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
            <User className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Portail Étudiant</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Tableau de bord, demandes et historique.</p>
        </div>

        {isPresidentDeClub && (
          <div
            onClick={() => handleModuleClick('/student/presidence')}
            className="group w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(25%-1.5rem)] card card-hover p-6 flex flex-col items-center text-center cursor-pointer border-emerald-200 dark:border-emerald-900/50"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-4 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
              <Building2 className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Présidence Club</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Gestion du budget et demandes du club.</p>
          </div>
        )}

        <div
          onClick={() => handleModuleClick('/student/reclamations')}
          className="group w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(25%-1.5rem)] card card-hover p-6 flex flex-col items-center text-center cursor-pointer"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 mb-4 group-hover:scale-110 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Réclamations</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gestion des requêtes de notes et AMO.</p>
        </div>

        <div
          onClick={() => handleModuleClick('/student/assistant')}
          className="group w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(25%-1.5rem)] card card-hover p-6 flex flex-col items-center text-center cursor-pointer"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mb-4 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
            <Bot className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Assistant IA</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Chatbot, recherche intelligente et OCR.</p>
        </div>

        <div
          onClick={() => handleModuleClick('/student/messages')}
          className="group w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(25%-1.5rem)] card card-hover p-6 flex flex-col items-center text-center cursor-pointer"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 mb-4 group-hover:scale-110 group-hover:bg-sky-600 group-hover:text-white transition-all duration-300">
            <MessageSquare className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Messagerie</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Conversations internes et alertes.</p>
        </div>

        {isSuperAdmin && (
          <div
            onClick={() => handleModuleClick('/admin')}
            className="group w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(25%-1.5rem)] card card-hover p-6 flex flex-col items-center text-center cursor-pointer border-red-200 dark:border-red-900/50"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 mb-4 group-hover:scale-110 group-hover:bg-red-600 group-hover:text-white transition-all duration-300">
              <Shield className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Administration</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Gestion des utilisateurs, rôles et permissions.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SmartRedirect() {
  const userStr = localStorage.getItem("user");

  if (!userStr) return <Navigate to="/login" replace />;

  try {
    const user = JSON.parse(userStr);
    switch (user.role) {
      case "ETUDIANT":
        return <Navigate to="/student/dashboard" replace />;
      case "PRESIDENT_CLUB":
        return <Navigate to="/student/presidence" replace />;
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PortalSelector />} />

        <Route element={<Layout />}>
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={["ETUDIANT"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="student/profile" element={<Profile />} />
          <Route
            path="/student/requests"
            element={
              <ProtectedRoute allowedRoles={["ETUDIANT"]}>
                <RequestsPage />
              </ProtectedRoute>
            }
          />
          <Route path="student/workflow" element={<WorkflowPage />} />
          <Route path="student/documents" element={<Documents />} />
          <Route path="/student/notifications" element={<Notifications />} />
          <Route path="/student/calendrier" element={<AcademicCalendar />} />
          <Route path="/historique" element={<PageComingSoon title="Historique" />} />
          <Route path="/student/parametres" element={<SettingsPage />} />
          <Route path="/student/reclamations" element={<Reclamations />} />
          <Route path="/student/assistant" element={<Assistant />} />
          <Route path="/student/messages" element={<Messaging />} />
          <Route path="/student/presidence" element={<PresidenceClub />} />
        </Route>

        <Route
          path="/scolarite/messages"
          element={
            <ProtectedRoute allowedRoles={["SCOLARITE"]}>
              <ScolariteMessaging />
            </ProtectedRoute>
          }
        />

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

        <Route path="/redirect" element={<SmartRedirect />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}