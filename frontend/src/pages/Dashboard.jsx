import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import {
  createParking,
  deleteParking,
  getParkingAdminStats,
  getParkingSpots,
  getParkings,
  updateParking
} from "../api/parking.js";
import { getReservationAdminStats } from "../api/reservation.js";
import { createSpot, deleteSpot, updateSpot } from "../api/spot.js";

export default function Dashboard() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [parkingStats, setParkingStats] = useState({
    totalParkings: 0,
    totalSpots: 0,
    freeSpots: 0,
    occupiedSpots: 0,
  });
  const [reservationStats, setReservationStats] = useState({
    totalReservations: 0,
    activeReservations: 0,
    reservationsToday: 0,
  });

  const [parkings, setParkings] = useState([]);
  const [selectedParkingId, setSelectedParkingId] = useState("");
  const [selectedParkingName, setSelectedParkingName] = useState("");
  const [spots, setSpots] = useState([]);

  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newCapacity, setNewCapacity] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editCapacity, setEditCapacity] = useState("");

  const [newSpotNumber, setNewSpotNumber] = useState("");

  const [err, setErr] = useState("");

  const selectedParking = useMemo(
    () => parkings.find((p) => String(p.Id) === String(selectedParkingId)),
    [parkings, selectedParkingId]
  );

  const loadStats = async () => {
    try {
      const [parkingData, reservationData] = await Promise.all([
        getParkingAdminStats(token),
        getReservationAdminStats(token),
      ]);

      setParkingStats({
        totalParkings: Number(parkingData?.totalParkings ?? 0),
        totalSpots: Number(parkingData?.totalSpots ?? 0),
        freeSpots: Number(parkingData?.freeSpots ?? 0),
        occupiedSpots: Number(parkingData?.occupiedSpots ?? 0),
      });

      setReservationStats({
        totalReservations: Number(reservationData?.totalReservations ?? 0),
        activeReservations: Number(reservationData?.activeReservations ?? 0),
        reservationsToday: Number(reservationData?.reservationsToday ?? 0),
      });
    } catch (e) {
      console.error(e);
      setErr("Failed to load dashboard data. Please try again.");
    }
  };

  const loadParkings = async () => {
    try {
      const data = await getParkings(token);
      setParkings(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr("Failed to load parkings.");
    }
  };

  const loadSpots = async (parkingId) => {
    if (!parkingId) return;
    try {
      const data = await getParkingSpots(token, parkingId);
      setSpots(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr("Failed to load spots.");
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setErr("Access Denied: You must be an admin to view the dashboard.");
      return;
    }
    setErr("");
    loadStats();
    loadParkings();
  }, [token, isAdmin]);

  useEffect(() => {
    if (!selectedParkingId) {
      setSpots([]);
      return;
    }
    loadSpots(selectedParkingId);
  }, [selectedParkingId, token]);

  const handleCreateParking = async (e) => {
    e.preventDefault();
    if (!newName || !newLocation || !newCapacity) return;
    try {
      await createParking(token, {
        name: newName,
        location: newLocation,
        capacity: Number(newCapacity),
        occupied: 0
      });
      setNewName("");
      setNewLocation("");
      setNewCapacity("");
      await loadParkings();
      await loadStats();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to create parking.");
    }
  };

  const startEdit = (p) => {
    setEditingId(p.Id);
    setEditName(p.Name ?? "");
    setEditLocation(p.Location ?? "");
    setEditCapacity(String(p.Capacity ?? ""));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditLocation("");
    setEditCapacity("");
  };

  const handleUpdateParking = async (p) => {
    if (!editName || !editLocation || !editCapacity) return;
    try {
      await updateParking(token, p.Id, {
        name: editName,
        location: editLocation,
        capacity: Number(editCapacity),
        occupied: p.Occupied ?? 0
      });
      cancelEdit();
      await loadParkings();
      await loadStats();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to update parking.");
    }
  };

  const handleDeleteParking = async (p) => {
    try {
      await deleteParking(token, p.Id);
      if (String(p.Id) === String(selectedParkingId)) {
        setSelectedParkingId("");
        setSelectedParkingName("");
        setSpots([]);
      }
      await loadParkings();
      await loadStats();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to delete parking.");
    }
  };

  const handleSelectParking = (p) => {
    setSelectedParkingId(p.Id);
    setSelectedParkingName(p.Name ?? `Parking ${p.Id}`);
  };

  const handleCreateSpot = async (e) => {
    e.preventDefault();
    if (!newSpotNumber || !selectedParkingId) return;
    try {
      await createSpot(token, {
        spot_number: Number(newSpotNumber),
        status: "free",
        ParkingId: Number(selectedParkingId)
      });
      setNewSpotNumber("");
      await loadSpots(selectedParkingId);
      await loadStats();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to create spot.");
    }
  };

  const handleDeleteSpot = async (spotId) => {
    try {
      await deleteSpot(token, spotId);
      await loadSpots(selectedParkingId);
      await loadStats();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to delete spot.");
    }
  };

  const handleToggleSpotStatus = async (spot) => {
    try {
      const nextStatus = spot.status === "free" ? "occupied" : "free";
      await updateSpot(token, spot.id, {
        spot_number: spot.spot_number,
        status: nextStatus,
        ParkingId: spot.ParkingId
      });
      await loadSpots(selectedParkingId);
      await loadStats();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to update spot.");
    }
  };

  if (!isAdmin) {
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

      <section>
        <h3 style={{ marginBottom: 12 }}>Stats</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          <div className="card">
            <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: 600, textTransform: "uppercase" }}>
              Total Parkings
            </div>
            <div style={{ fontSize: "2.2rem", fontWeight: 700, marginTop: "8px" }}>
              {parkingStats.totalParkings}
            </div>
          </div>

          <div className="card">
            <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: 600, textTransform: "uppercase" }}>
              Total Spots
            </div>
            <div style={{ fontSize: "2.2rem", fontWeight: 700, marginTop: "8px" }}>
              {parkingStats.totalSpots}
            </div>
          </div>

          <div className="card">
            <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: 600, textTransform: "uppercase" }}>
              Free Spots
            </div>
            <div style={{ fontSize: "2.2rem", fontWeight: 700, marginTop: "8px" }}>
              {parkingStats.freeSpots}
            </div>
          </div>

          <div className="card">
            <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: 600, textTransform: "uppercase" }}>
              Occupied Spots
            </div>
            <div style={{ fontSize: "2.2rem", fontWeight: 700, marginTop: "8px" }}>
              {parkingStats.occupiedSpots}
            </div>
          </div>

          <div className="card">
            <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: 600, textTransform: "uppercase" }}>
              Total Reservations
            </div>
            <div style={{ fontSize: "2.2rem", fontWeight: 700, marginTop: "8px" }}>
              {reservationStats.totalReservations}
            </div>
          </div>

          <div className="card">
            <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: 600, textTransform: "uppercase" }}>
              Active Reservations
            </div>
            <div style={{ fontSize: "2.2rem", fontWeight: 700, marginTop: "8px" }}>
              {reservationStats.activeReservations}
            </div>
          </div>

          <div className="card">
            <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: 600, textTransform: "uppercase" }}>
              Reservations Today
            </div>
            <div style={{ fontSize: "2.2rem", fontWeight: 700, marginTop: "8px" }}>
              {reservationStats.reservationsToday}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 style={{ marginBottom: 12 }}>Parkings</h3>

        <form onSubmit={handleCreateParking} style={{ marginBottom: 20, padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <input placeholder="Location" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} />
            <input placeholder="Capacity" type="number" value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} />
            <button type="submit">Add Parking</button>
          </div>
        </form>

        <table border="1" cellPadding="8" style={{ width: "100%", textAlign: "left" }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Location</th>
              <th>Capacity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {parkings.map((p) => {
              const isEditing = editingId === p.Id;
              return (
                <tr key={p.Id}>
                  <td>
                    {isEditing ? (
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    ) : (
                      p.Name
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
                    ) : (
                      p.Location
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input type="number" value={editCapacity} onChange={(e) => setEditCapacity(e.target.value)} />
                    ) : (
                      p.Capacity
                    )}
                  </td>
                  <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {isEditing ? (
                      <>
                        <button type="button" onClick={() => handleUpdateParking(p)}>Update</button>
                        <button type="button" onClick={cancelEdit}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => startEdit(p)}>Edit</button>
                        <button type="button" onClick={() => handleDeleteParking(p)}>Delete</button>
                        <button type="button" onClick={() => handleSelectParking(p)}>
                          {String(selectedParkingId) === String(p.Id) ? "Selected" : "Manage Spots"}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section>
        <h3 style={{ marginBottom: 12 }}>Spots</h3>
        {!selectedParkingId ? (
          <p>Select a parking above to manage its spots.</p>
        ) : (
          <>
            <div style={{ marginBottom: 12, color: "var(--text-secondary)" }}>
              Managing spots for: <b>{selectedParkingName || selectedParking?.Name}</b>
            </div>

            <form onSubmit={handleCreateSpot} style={{ marginBottom: 16, padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <input
                  placeholder="Spot Number"
                  type="number"
                  value={newSpotNumber}
                  onChange={(e) => setNewSpotNumber(e.target.value)}
                />
                <button type="submit">Add Spot</button>
              </div>
            </form>

            {spots.length === 0 ? (
              <p>No spots found for this parking.</p>
            ) : (
              <table border="1" cellPadding="8" style={{ width: "100%", textAlign: "left" }}>
                <thead>
                  <tr>
                    <th>Spot</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {spots.map((s) => (
                    <tr key={s.id}>
                      <td>{s.spot_number}</td>
                      <td>{s.status}</td>
                      <td style={{ display: "flex", gap: 8 }}>
                        <button type="button" onClick={() => handleToggleSpotStatus(s)}>
                          Toggle Status
                        </button>
                        <button type="button" onClick={() => handleDeleteSpot(s.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </section>
    </div>
  );
}
