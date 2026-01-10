import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { getParkings } from "../api/parking.js";
import { getReservations } from "../api/reservation.js";

export default function Dashboard() {
  const { token } = useAuth();
  const [parkingsCount, setParkingsCount] = useState(0);
  const [reservationsCount, setReservationsCount] = useState(0);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setErr("");
      try {
        const parkings = await getParkings(token);
        const reservations = await getReservations(token);
        setParkingsCount(Array.isArray(parkings) ? parkings.length : (parkings?.data?.length || 0));
        setReservationsCount(Array.isArray(reservations) ? reservations.length : (reservations?.data?.length || 0));
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, [token]);

  return (
    <div>
      <h2>Dashboard</h2>
      {err && <p style={{ color: "red" }}>{err}</p>}

      <div style={{ display: "flex", gap: 20, marginTop: 14 }}>
        <div style={{ border: "1px solid #ddd", padding: 14, borderRadius: 8, minWidth: 180 }}>
          <div style={{ fontSize: 12, color: "#666" }}>Total Parkings</div>
          <div style={{ fontSize: 28 }}>{parkingsCount}</div>
        </div>

        <div style={{ border: "1px solid #ddd", padding: 14, borderRadius: 8, minWidth: 180 }}>
          <div style={{ fontSize: 12, color: "#666" }}>Total Reservations</div>
          <div style={{ fontSize: 28 }}>{reservationsCount}</div>
        </div>
      </div>
    </div>
  );
}
