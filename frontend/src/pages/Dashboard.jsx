import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { getParkings } from "../api/parking.js";
import { getAllReservations } from "../api/reservation.js";

export default function Dashboard() {
  const { token, user } = useAuth();
  const [parkingsCount, setParkingsCount] = useState(0);
  const [reservationsCount, setReservationsCount] = useState(0);
  const [err, setErr] = useState("");

  useEffect(() => {
    // If not admin, you shouldn't be here (although Sidebar hides it, direct link possible)
    if (user?.role !== "admin") {
      setErr("Access Denied: You must be an admin to view the dashboard.");
      return;
    }

    (async () => {
      setErr("");
      try {
        const [parkings, reservations] = await Promise.all([
          getParkings(token),
          getAllReservations(token).catch(() => []), // Fallback if API fails
        ]);

        const pCount = Array.isArray(parkings) ? parkings.length : 0;
        const rCount = Array.isArray(reservations) ? reservations.length : 0;

        setParkingsCount(pCount);
        setReservationsCount(rCount);
      } catch (e) {
        console.error(e);
        setErr("Failed to load dashboard data. Please try again.");
      }
    })();
  }, [token, user]);

  if (user?.role !== "admin") {
    return (
      <div style={{ textAlign: "center", marginTop: 40, color: "var(--status-error)" }}>
        <h3>Access Restricted</h3>
        <p>This page is only visible to administrators.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <header>
        <h2 style={{ fontSize: "2rem", marginBottom: "8px" }}>Dashboard</h2>
        <p style={{ color: "var(--text-secondary)" }}>System overview and statistics.</p>
      </header>

      {err && (
        <div style={{
          padding: "12px 16px",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.2)",
          color: "var(--status-error)",
          borderRadius: "8px"
        }}>
          {err}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
        {/* Stat Card: Parkings */}
        <div className="card">
          <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: 600, textTransform: "uppercase" }}>
            Total Parkings
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: 700, marginTop: "8px" }}>
            {parkingsCount}
          </div>
          <div style={{ marginTop: "12px", fontSize: "0.85rem", color: "var(--accent-primary)" }}>
            Available across all locations
          </div>
        </div>

        {/* Stat Card: Reservations */}
        <div className="card">
          <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: 600, textTransform: "uppercase" }}>
            Total Reservations
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: 700, marginTop: "8px" }}>
            {reservationsCount}
          </div>
          <div style={{ marginTop: "12px", fontSize: "0.85rem", color: "var(--accent-secondary)" }}>
            Active and past bookings
          </div>
        </div>
      </div>
    </div>
  );
}
