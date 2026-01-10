import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function AdminRoute({ children }) {
  const { token, user } = useAuth();

  if (!token) return <Navigate to="/login" replace />;

  if (user?.role !== "admin") {
    return <Navigate to="/parkings" replace />;
  }

  return children;
}
