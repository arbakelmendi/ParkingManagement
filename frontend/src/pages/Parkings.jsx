import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/http";
import { useAuth } from "../auth/AuthContext";

export default function Parkings() {
  const [parkings, setParkings] = useState([]);
  const [error, setError] = useState("");
  const { token } = useAuth();

  useEffect(() => {
    apiFetch("http://localhost:3002/api/parkings", { token })
      .then(setParkings)
      .catch(() => setError("Server Error"));
  }, [token]);

  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div>
      <h1>Parkings</h1>

      <table border="1" cellPadding="8">
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
