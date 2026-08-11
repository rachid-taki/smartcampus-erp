import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";

// Layouts
import Layout from "./components/student/layout/Layout";

// Pages étudiant
import Dashboard from "./pages/StudentPortal/Dashboard/Dashboard";
import PageComingSoon from "./components/student/common/PageComingSoon";
import WorkflowPage from "./pages/StudentPortal/WorkFlow/WorkFlow";
import RequestsPage from "./pages/StudentPortal/Requests/RequestsPage";
import Profile from "./pages/StudentPortal/Profile/Profile";
import Documents from "./pages/StudentPortal/Documents/Documents";
import Notifications from "./pages/StudentPortal/Notifications/Notifications";
import AcademicCalendar from "./pages/StudentPortal/Calendar/AcademicCalendar";
import Settings from "./pages/StudentPortal/Settings/Settings";
import Reclamations from "./pages/StudentPortal/Reclamation/Reclamations";
import Assistant from "./pages/Assistant/Assistant";
import Messaging from "./pages/StudentPortal/Messaging";
import SuperAdminLayout from "./components/superadmin/layouts/SuperAdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminRoles from "./pages/admin/Roles";
import AdminPermissions from "./pages/admin/Permissions";

import ScolariteMessaging from "./pages/scolarite/Messaging";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminAudit from "./pages/admin/Audit";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

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
          <Route
            path="/historique"
            element={<PageComingSoon title="Historique" />}
          />
          <Route path="/student/parametres" element={<Settings />} />
          <Route path="/student/reclamations" element={<Reclamations />} />
          <Route path="/student/assistant" element={<Assistant />} />
          <Route path="/student/messages" element={<Messaging />} />
        </Route>

        <Route
          path="/scolarite/messages"
          element={
            <ProtectedRoute allowedRoles={["SCOLARITE"]}>
              <ScolariteMessaging />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<SmartRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />

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
      </Routes>
    </BrowserRouter>
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
      case "SCOLARITE":
        return <Navigate to="/scolarite/dashboard" replace />;
      case "SUPER_ADMIN":
        return <Navigate to="/admin/dashboard" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  } catch {
    return <Navigate to="/login" replace />;
  }
}
