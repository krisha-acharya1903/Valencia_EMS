import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ManagerRoute({ children }) {
  const { profile } = useAuth();

  if (!["admin", "manager"].includes(profile?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
