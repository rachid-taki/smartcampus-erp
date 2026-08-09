import type { ReactNode } from "react";import { Navigate } from "react-router-dom";

interface Props {
  children: ReactNode;
  allowedRoles: string[];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: Props) {
const token =
  localStorage.getItem("token") ||
  sessionStorage.getItem("token");

const role =
  localStorage.getItem("role") ||
  sessionStorage.getItem("role");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(role || "")) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}