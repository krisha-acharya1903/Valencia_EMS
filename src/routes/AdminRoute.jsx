import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
  const { profile } = useAuth();

  if (profile?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
