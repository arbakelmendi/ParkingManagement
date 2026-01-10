import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Layout() {
  const { user, logout } = useAuth(); // ✅ KJO DUHET PATJETËR
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div>
      <div
        style={{
          padding: 14,
          borderBottom: "1px solid #ddd",
          display: "flex",
          gap: 14,
          alignItems: "center",
        }}
      >
        <strong>Parking Management</strong>

        <Link to="/dashboard">Dashboard</Link>
        <Link to="/parkings">Parkings</Link>
        <Link to="/reservations">Reservations</Link>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 13, color: "#444" }}>
            {user ? `${user.name} (${user.role})` : "—"}
          </span>
          <button onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        <Outlet />
      </div>
    </div>
  );
}
