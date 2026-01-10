import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getParkingById, getParkingSpots } from "../api/parking";
import { createReservation } from "../api/reservation";
import { createSpot, deleteSpot, updateSpot } from "../api/spot";
import { useAuth } from "../auth/AuthContext";

export default function ParkingDetails() {
  const { id } = useParams();
  const { token, user } = useAuth();

  const [parking, setParking] = useState(null);
  const [spots, setSpots] = useState([]);
  const [error, setError] = useState("");

  const [newSpotNumber, setNewSpotNumber] = useState("");
  const [selectedSpotId, setSelectedSpotId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const isAdmin = user?.role === "admin";

  const loadData = async () => {
    setError("");
    try {
      const [parkingData, spotsData] = await Promise.all([
        getParkingById(token, id),
        getParkingSpots(token, id)
      ]);
      setParking(parkingData);
      setSpots(spotsData);
    } catch (err) {
      setError("Server Error");
    }
  };

  useEffect(() => {
    if (!id || id === "undefined") return;
    loadData();
  }, [id, token]);

  const freeSpots = spots.filter((s) => s.status === "free");

  const handleCreateSpot = async (e) => {
    e.preventDefault();
    if (!newSpotNumber) return;
    try {
      await createSpot(token, {
        spot_number: Number(newSpotNumber),
        status: "free",
        ParkingId: Number(id)
      });
      setNewSpotNumber("");
      await loadData();
    } catch (err) {
      setError(err.message || "Server Error");
    }
  };

  const handleDeleteSpot = async (spotId) => {
    try {
      await deleteSpot(token, spotId);
      await loadData();
    } catch (err) {
      setError(err.message || "Server Error");
    }
  };

  const handleToggleStatus = async (spot) => {
    try {
      const nextStatus = spot.status === "free" ? "occupied" : "free";
      await updateSpot(token, spot.id, {
        spot_number: spot.spot_number,
        status: nextStatus,
        ParkingId: spot.ParkingId
      });
      await loadData();
    } catch (err) {
      setError(err.message || "Server Error");
    }
  };

  const handleReserve = async (e) => {
    e.preventDefault();
    if (!selectedSpotId || !startTime || !endTime) return;
    try {
      await createReservation(token, {
        spot_id: Number(selectedSpotId),
        start_time: startTime,
        end_time: endTime
      });
      setSelectedSpotId("");
      setStartTime("");
      setEndTime("");
      await loadData();
    } catch (err) {
      setError(err.message || "Server Error");
    }
  };

  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!parking) return <p>Loading...</p>;

  return (
    <div>
      <h1>{parking.Name}</h1>
      <p><b>Location:</b> {parking.Location}</p>
      <p><b>Capacity:</b> {parking.Capacity}</p>
      <p><b>Occupied:</b> {parking.Occupied}</p>

      <div style={{ marginTop: 20 }}>
        <h3>Spots</h3>
        {spots.length === 0 ? (
          <p>No spots yet.</p>
        ) : (
          <table border="1" cellPadding="8" style={{ width: "100%", textAlign: "left" }}>
            <thead>
              <tr>
                <th>Spot</th>
                <th>Status</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {spots.map((s) => (
                <tr key={s.id}>
                  <td>{s.spot_number}</td>
                  <td>{s.status}</td>
                  {isAdmin && (
                    <td style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={() => handleToggleStatus(s)}>
                        Toggle Status
                      </button>
                      <button type="button" onClick={() => handleDeleteSpot(s.id)}>
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isAdmin ? (
        <form onSubmit={handleCreateSpot} style={{ marginTop: 20, padding: 20, border: "1px solid #ccc", borderRadius: 8 }}>
          <h3>Add Spot</h3>
          <div style={{ display: "grid", gap: 10, maxWidth: 300 }}>
            <input
              placeholder="Spot Number"
              type="number"
              value={newSpotNumber}
              onChange={(e) => setNewSpotNumber(e.target.value)}
            />
            <button type="submit">Add Spot</button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleReserve} style={{ marginTop: 20, padding: 20, border: "1px solid #ccc", borderRadius: 8 }}>
          <h3>Reserve a Spot</h3>
          <div style={{ display: "grid", gap: 10, maxWidth: 400 }}>
            <select value={selectedSpotId} onChange={(e) => setSelectedSpotId(e.target.value)}>
              <option value="">Select free spot</option>
              {freeSpots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.spot_number}
                </option>
              ))}
            </select>
            <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            <button type="submit">Reserve</button>
          </div>
        </form>
      )}
    </div>
  );
}
