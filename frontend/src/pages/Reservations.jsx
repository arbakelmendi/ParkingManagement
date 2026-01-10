import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { getParkings } from "../api/parking.js";
import { createReservation, deleteReservation, getReservations } from "../api/reservation.js";

export default function Reservations() {
  const { token, user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [parkings, setParkings] = useState([]);
  const [err, setErr] = useState("");

  // form
  const [parkingId, setParkingId] = useState("");
  const [spotId, setSpotId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const load = async () => {
    setErr("");
    try {
      const [r, p] = await Promise.all([getReservations(token), getParkings(token)]);
      setReservations(Array.isArray(r) ? r : (r?.data || []));
      setParkings(Array.isArray(p) ? p : (p?.data || []));
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      // userId normalisht merret prej token në backend, por nëse backend kërkon userId, po e qesim
      const payload = {
        parkingId: Number(parkingId),
        spotId: Number(spotId),
        startTime,
        endTime,
        userId: user?.id, // nëse backend e injoron, s’ka problem
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
    <div>
      <h2>Reservations</h2>
      {err && <p style={{ color: "red" }}>{err}</p>}

      <h3>Create Reservation</h3>
      <form onSubmit={onCreate} style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        <select value={parkingId} onChange={(e) => setParkingId(e.target.value)}>
          <option value="">Select parking</option>
          {parkings.map((p) => (
            <option key={p.id} value={p.id}>
              #{p.id} — {p.name}
            </option>
          ))}
        </select>

        <input
          placeholder="Spot ID (p.sh. 1)"
          value={spotId}
          onChange={(e) => setSpotId(e.target.value)}
        />

        <input
          placeholder="Start Time (p.sh. 2026-01-09T10:00)"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />

        <input
          placeholder="End Time (p.sh. 2026-01-09T12:00)"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />

        <button type="submit" disabled={!parkingId || !spotId || !startTime || !endTime}>
          Create
        </button>
      </form>

      <h3 style={{ marginTop: 20 }}>All Reservations</h3>
      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Parking</th>
            <th>Spot</th>
            <th>User</th>
            <th>Start</th>
            <th>End</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.parkingId ?? r.parking_id ?? r.parkingId}</td>
              <td>{r.spotId ?? r.spot_id ?? r.spotId}</td>
              <td>{r.userId ?? r.user_id ?? r.userId}</td>
              <td>{r.startTime ?? r.start_time ?? r.startTime}</td>
              <td>{r.endTime ?? r.end_time ?? r.endTime}</td>
              <td>
                <button onClick={() => onDelete(r.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {reservations.length === 0 && (
            <tr>
              <td colSpan="7">No reservations yet</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
