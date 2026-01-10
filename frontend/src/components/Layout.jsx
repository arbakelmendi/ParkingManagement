import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { path: "/dashboard", label: "Dashboard", role: "admin" }, // Only admin
    { path: "/parkings", label: "Parkings", role: "" },
    { path: "/reservations", label: "Reservations", role: "" },
  ].filter(item => !item.role || item.role === user?.role);

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      {/* Sidebar / Topbar for Mobile */}
      <aside
        style={{
          width: "250px",
          backgroundColor: "var(--bg-glass)",
          backdropFilter: "blur(12px)",
          borderRight: "1px solid var(--border-color)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div style={{ marginBottom: "40px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "32px",
            height: "32px",
            background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
            borderRadius: "8px"
          }}></div>
          <strong style={{ fontSize: "1.2rem" }}>ParkingApp</strong>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  backgroundColor: isActive ? "rgba(99, 102, 241, 0.1)" : "transparent",
                  color: isActive ? "var(--accent-primary)" : "var(--text-secondary)",
                  fontWeight: isActive ? 600 : 500,
                  transition: "all 0.2s",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ paddingTop: "20px", borderTop: "1px solid var(--border-color)" }}>
          <div style={{ marginBottom: "12px" }}>
            <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600 }}>{user?.name}</p>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>{user?.role}</p>
          </div>
          <button
            onClick={onLogout}
            style={{
              width: "100%",
              backgroundColor: "rgba(255,255,255,0.05)",
              color: "var(--text-secondary)",
              fontSize: "0.9rem"
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
