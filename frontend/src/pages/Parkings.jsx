import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/http";
import { useAuth } from "../auth/AuthContext";

export default function Parkings() {
  /* New state for creation form */
  /* New state for creation form */
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newCapacity, setNewCapacity] = useState("");

  const [parkings, setParkings] = useState([]);
  const [error, setError] = useState("");

  const { token, user } = useAuth(); // Need 'user' to check role

  const loadParkings = () => {
    apiFetch("http://localhost:3002/api/parkings", { token })
      .then(setParkings)
      .catch(() => setError("Server Error"));
  };

  useEffect(() => {
    loadParkings();
  }, [token]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName || !newLocation || !newCapacity) return;

    try {
      // Import dynamically or assume it's available via apiFetch, but createParking helper is cleaner
      // Let's import createParking at top, but for now using raw fetch if simpler or just import it.
      // Wait, 'createParking' is in ../api/parking.js. I should import it.

      const payload = {
        name: newName,
        location: newLocation,
        capacity: Number(newCapacity),
        occupied: 0
      };

      await import("../api/parking").then(mod => mod.createParking(token, payload));

      setShowCreate(false);
      setNewName("");
      setNewLocation("");
      setNewCapacity("");
      loadParkings();
    } catch (err) {
      setError(err.message);
    }
  };

  if (error) return <p style={{ color: "red" }}>{error}</p>;

  const isAdmin = user?.role === "admin";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1>Parkings</h1>
        {isAdmin && (
          <button onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? "Cancel" : "Create Parking"}
          </button>
        )}
      </div>

      {isAdmin && showCreate && (
        <form onSubmit={handleCreate} style={{ marginBottom: 20, padding: 20, border: "1px solid #ccc", borderRadius: 8 }}>
          <h3>Create New Parking</h3>
          <div style={{ display: "grid", gap: 10, maxWidth: 400 }}>
            <input placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} />
            <input placeholder="Location" value={newLocation} onChange={e => setNewLocation(e.target.value)} />
            <input placeholder="Capacity" type="number" value={newCapacity} onChange={e => setNewCapacity(e.target.value)} />
            <button type="submit">Save</button>
          </div>
        </form>
      )}

      <table border="1" cellPadding="8" style={{ width: "100%", textAlign: "left" }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Location</th>
            <th>Capacity</th>
            <th>Occupied</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {parkings.map((p) => (
            <tr key={p.Id}>
              <td>{p.Name}</td>
              <td>{p.Location}</td>
              <td>{p.Capacity}</td>
              <td>{p.Occupied}</td>
              <td>
                {/* 🔥 KJO ËSHTË FIX-I */}
                <Link to={`/parkings/${p.Id}`}>Details</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
