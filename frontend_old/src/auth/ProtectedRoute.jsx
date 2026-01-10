//ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const auth = useAuth();
  const token = auth?.token;

  if (!token) return <Navigate to="/login" replace />;
  return children;
}
