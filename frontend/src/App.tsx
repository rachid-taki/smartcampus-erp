import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// ═══════════════ PAGES D'AUTHENTIFICATION (3 pages séparées) ═══════════════
import Login from "./pages/Login";
import LoginPersonnel from "./pages/LoginPersonnel";
import RoleSelector from "./pages/RoleSelector";

// ═══════════════ PORTAIL ÉTUDIANT ═══════════════
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
import PresidenceClub from "./pages/StudentPortal/PresidenceClub/PresidenceClub";

// ═══════════════ SUPER ADMIN ═══════════════
import SuperAdminLayout from "./components/superadmin/layouts/SuperAdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminRoles from "./pages/admin/Roles";
import AdminPermissions from "./pages/admin/Permissions";
import AdminAudit from "./pages/admin/Audit";

// ═══════════════ SCOLARITÉ MESSAGING ═══════════════
import ScolariteMessaging from "./pages/scolarite/Messaging";

// ═══════════════ LAYOUTS MODULAIRES (STAFF) ═══════════════
import ScolariteLayout from './modules/scolarite/layout/ScolariteLayout';
import RhLayout from './modules/rh/layout/RhLayout';
import EnseignantLayout from './modules/enseignant/layout/EnseignantLayout';
import ClubLayout from './modules/clubs/layout/ClubLayout';
import ConfigLayout from './modules/configuration/layout/ConfigLayout';

// ═══════════════ COMPOSANTS DE PROTECTION ═══════════════
import ProtectedRoute from "./components/ProtectedRoute";

/**
 * Protège les modules staff (scolarité, RH, enseignant, clubs, config).
 * Redirige vers /login-personnel si l'utilisateur n'est pas authentifié
 * (car ces modules sont réservés au personnel).
 */
function StaffProtectedRoute({ children, redirectTo }: { children: React.ReactNode; redirectTo: string }) {
  const userStr = localStorage.getItem("user");

  if (!userStr) {
    return <Navigate to={`/login-personnel?redirect=${encodeURIComponent(redirectTo)}`} replace />;
  }
  try {
    const user = JSON.parse(userStr);
    // Si c'est un étudiant qui essaie d'accéder à un module staff → redirection
    if (user.role === "ETUDIANT") {
      return <Navigate to="/student/dashboard" replace />;
    }
    return <>{children}</>;
  } catch {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    return <Navigate to={`/login-personnel?redirect=${encodeURIComponent(redirectTo)}`} replace />;
  }
}

/**
 * Redirection intelligente après login basée sur le rôle.
 * Utilisée si nécessaire ailleurs dans l'app.
 */
function SmartRedirect() {
  const userStr = localStorage.getItem("user");

  if (!userStr) return <Navigate to="/" replace />;

  try {
    const user = JSON.parse(userStr);
    switch (user.role) {
      case "ETUDIANT":
        return <Navigate to="/student/dashboard" replace />;
      case "SCOLARITE":
        return <Navigate to="/scolarite/dashboard" replace />;
      case "RH":
        return <Navigate to="/rh/dashboard" replace />;
      case "ENSEIGNANT":
        return <Navigate to="/enseignant/dashboard" replace />;
      case "SUPER_ADMIN":
        return <Navigate to="/admin/dashboard" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  } catch {
    return <Navigate to="/" replace />;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ═══════════════════════════════════════════════════════
            PAGES D'AUTHENTIFICATION (3 pages séparées)
            ═══════════════════════════════════════════════════════ */}
        <Route path="/" element={<RoleSelector />} />
        <Route path="/login" element={<Login />} />
        <Route path="/login-personnel" element={<LoginPersonnel />} />

        {/* ═══════════════════════════════════════════════════════
            PORTAIL ÉTUDIANT (accessible uniquement aux ETUDIANT)
            ═══════════════════════════════════════════════════════ */}
        <Route element={<Layout />}>
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={["ETUDIANT"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRoles={["ETUDIANT"]}>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/requests"
            element={
              <ProtectedRoute allowedRoles={["ETUDIANT"]}>
                <RequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/workflow"
            element={
              <ProtectedRoute allowedRoles={["ETUDIANT"]}>
                <WorkflowPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/documents"
            element={
              <ProtectedRoute allowedRoles={["ETUDIANT"]}>
                <Documents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/notifications"
            element={
              <ProtectedRoute allowedRoles={["ETUDIANT"]}>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/calendrier"
            element={
              <ProtectedRoute allowedRoles={["ETUDIANT"]}>
                <AcademicCalendar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/parametres"
            element={
              <ProtectedRoute allowedRoles={["ETUDIANT"]}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/reclamations"
            element={
              <ProtectedRoute allowedRoles={["ETUDIANT"]}>
                <Reclamations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/assistant"
            element={
              <ProtectedRoute allowedRoles={["ETUDIANT"]}>
                <Assistant />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/messages"
            element={
              <ProtectedRoute allowedRoles={["ETUDIANT"]}>
                <Messaging />
              </ProtectedRoute>
            }
          />
          {/* Présidence de club — accessible aux étudiants qui ont un mandat actif */}
          <Route
            path="/student/presidence"
            element={
              <ProtectedRoute allowedRoles={["ETUDIANT"]}>
                <PresidenceClub />
              </ProtectedRoute>
            }
          />
          <Route path="/historique" element={<PageComingSoon title="Historique" />} />
        </Route>

        {/* ═══════════════════════════════════════════════════════
            SCOLARITÉ MESSAGING (accessible uniquement aux SCOLARITE)
            ═══════════════════════════════════════════════════════ */}
        <Route
          path="/scolarite/messages"
          element={
            <ProtectedRoute allowedRoles={["SCOLARITE"]}>
              <ScolariteMessaging />
            </ProtectedRoute>
          }
        />

        {/* ═══════════════════════════════════════════════════════
            SUPER ADMIN (accessible uniquement aux SUPER_ADMIN)
            ═══════════════════════════════════════════════════════ */}
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

        {/* ═══════════════════════════════════════════════════════
            MODULES STAFF (redirigent vers /login-personnel si pas connecté)
            ═══════════════════════════════════════════════════════ */}
        <Route
          path="/scolarite/*"
          element={
            <StaffProtectedRoute redirectTo="/scolarite">
              <ScolariteLayout />
            </StaffProtectedRoute>
          }
        />
        <Route
          path="/rh/*"
          element={
            <StaffProtectedRoute redirectTo="/rh">
              <RhLayout />
            </StaffProtectedRoute>
          }
        />
        <Route
          path="/enseignant/*"
          element={
            <StaffProtectedRoute redirectTo="/enseignant">
              <EnseignantLayout />
            </StaffProtectedRoute>
          }
        />
        <Route
          path="/clubs/*"
          element={
            <StaffProtectedRoute redirectTo="/clubs">
              <ClubLayout />
            </StaffProtectedRoute>
          }
        />
        <Route
          path="/config/*"
          element={
            <StaffProtectedRoute redirectTo="/config">
              <ConfigLayout />
            </StaffProtectedRoute>
          }
        />

        {/* ═══════════════════════════════════════════════════════
            REDIRECTION INTELLIGENTE
            ═══════════════════════════════════════════════════════ */}
        <Route path="/redirect" element={<SmartRedirect />} />

        {/* ═══════════════════════════════════════════════════════
            404 — Redirection vers la page d'accueil
            ═══════════════════════════════════════════════════════ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}