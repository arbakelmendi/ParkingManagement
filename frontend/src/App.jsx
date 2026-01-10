//App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Parkings from "./pages/Parkings.jsx";
import ParkingDetails from "./pages/ParkingDetails.jsx";
import Reservations from "./pages/Reservations.jsx";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import AdminRoute from "./auth/AdminRoute.jsx";
import Layout from "./components/Layout.jsx";

import { useAuth } from "./auth/AuthContext.jsx";

function RoleBasedRedirect() {
  const { user, isAuthed } = useAuth();

  if (!isAuthed) return <Navigate to="/login" replace />;

  if (user?.role === "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/parkings" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RoleBasedRedirect />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={
            <AdminRoute>
              <Dashboard />
            </AdminRoute>
          }
        />
        <Route path="/parkings" element={<Parkings />} />
        <Route path="/parkings/:id" element={<ParkingDetails />} />
        <Route path="/reservations" element={<Reservations />} />
      </Route>

      <Route path="*" element={<div style={{ padding: 20 }}>404</div>} />
    </Routes>
  );
}
