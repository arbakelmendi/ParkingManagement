//App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Parkings from "./pages/Parkings.jsx";
import ParkingDetails from "./pages/ParkingDetails.jsx";
import Reservations from "./pages/Reservations.jsx";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import Layout from "./components/Layout.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/parkings" element={<Parkings />} />
        <Route path="/parkings/:id" element={<ParkingDetails />} />
        <Route path="/reservations" element={<Reservations />} />
      </Route>

      <Route path="*" element={<div style={{ padding: 20 }}>404</div>} />
    </Routes>
  );
}
