import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { createReservation, deleteReservation, getReservations } from "../api/reservation.js";
import { getParkings, getParkingSpots } from "../api/parking.js";

export default function Reservations() {
  const { token, user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [parkings, setParkings] = useState([]);
  const [err, setErr] = useState("");

  // form
  const [parkingId, setParkingId] = useState("");
  const [spots, setSpots] = useState([]);
  const [spotId, setSpotId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const load = async () => {
    setErr("");
    try {
      const [r, p] = await Promise.all([
        getReservations(token).catch(() => []),
        getParkings(token).catch(() => [])
      ]);
      setReservations(Array.isArray(r) ? r : (r?.data || []));
      setParkings(Array.isArray(p) ? p : (p?.data || []));
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!parkingId) {
      setSpots([]);
      return;
    }
    // Fetch spots for this parking
    getParkingSpots(token, parkingId)
      .then((data) => {
        setSpots(Array.isArray(data) ? data : []);
      })
      .catch((e) => console.error(e));
  }, [parkingId, token]);

  const onCreate = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      // userId normalisht merret prej token në backend, por nëse backend kërkon userId, po e qesim
      const payload = {
        ParkingId: Number(parkingId), // Likely needs Capitalized or snake? Error said spot_id. Let's try standardizing.
        // Wait, error explicitly listed: (spot_id, start_time, end_time).
        // It didn't mention parkingId. But let's assume snake_case generally.
        spot_id: Number(spotId),
        start_time: startTime,
        end_time: endTime,
        user_id: user?.id,
      };

      await createReservation(token, payload);
      setParkingId("");
      setSpotId("");
      setStartTime("");
      setEndTime("");
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const onDelete = async (id) => {
    setErr("");
    try {
      await deleteReservation(token, id);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <header>
        <h2 style={{ fontSize: "2rem", marginBottom: "8px" }}>Reservations</h2>
        <p style={{ color: "var(--text-secondary)" }}>Manage your parking reservations.</p>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px", alignItems: "start" }}>

        {/* Create Form Card */}
        <div className="card">
          <h3 style={{ marginBottom: "20px" }}>New Reservation</h3>
          <form onSubmit={onCreate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", color: "var(--text-muted)" }}>Parking Lot</label>
              <select
                value={parkingId}
                onChange={(e) => setParkingId(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="">Select parking...</option>
                {parkings.map((p) => (
                  <option key={p.Id} value={p.Id}>
                    #{p.Id} — {p.Name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", color: "var(--text-muted)" }}>Spot</label>
              <select
                value={spotId}
                onChange={(e) => setSpotId(e.target.value)}
                disabled={!parkingId}
                style={{ width: "100%" }}
              >
                <option value="">Select spot...</option>
                {spots.map((s) => (
                  <option key={s.id || s.Id} value={s.id || s.Id} disabled={(s.status || s.Status) !== "free"}>
                    Spot #{s.spot_number || s.SpotNumber} ({s.status || s.Status})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", color: "var(--text-muted)" }}>Start Time</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", color: "var(--text-muted)" }}>End Time</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!parkingId || !spotId || !startTime || !endTime}
              style={{ marginTop: "8px", padding: "12px" }}
            >
              Confirm Reservation
            </button>
          </form>
        </div>

        {/* Reservations List */}
        <div className="card" style={{ padding: "0" }}>
          <div style={{ padding: "24px 24px 0 24px" }}>
            <h3 style={{ margin: 0 }}>Your History</h3>
          </div>

          <div style={{ padding: "24px" }}>
            {reservations.length === 0 ? (
              <p style={{ color: "var(--text-muted)", textAlign: "center", fontStyle: "italic" }}>No reservations found.</p>
            ) : (
              <div style={{ display: "grid", gap: "16px" }}>
                {reservations.map((r) => {
                  const isFuture = new Date(r.endTime || r.end_time) > new Date();
                  return (
                    <div
                      key={r.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "16px",
                        backgroundColor: "var(--bg-primary)",
                        borderRadius: "12px",
                        border: "1px solid var(--border-color)"
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: 600, fontSize: "1rem" }}>
                            Spot #{r.spot_number ?? r.spotId}
                          </span>
                          <span className={`badge ${isFuture ? 'badge-success' : 'badge-neutral'}`}>
                            {isFuture ? 'Active' : 'Completed'}
                          </span>
                        </div>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                          Parking ID: {r.ParkingId ?? r.parkingIds} • {new Date(r.startTime ?? r.start_time).toLocaleString()}
                        </span>
                      </div>

                      {Number(r.user_id ?? r.userId) === Number(user?.id) && (
                        <button
                          onClick={() => onDelete(r.id)}
                          style={{
                            backgroundColor: "transparent",
                            color: "var(--status-error)",
                            border: "1px solid rgba(239, 68, 68, 0.2)",
                            padding: "8px 16px",
                            fontSize: "0.85rem",
                            boxShadow: "none"
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div >
  );
}
