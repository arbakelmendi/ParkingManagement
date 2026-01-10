import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../api/http";
import { useAuth } from "../auth/AuthContext";

export default function ParkingDetails() {
  const { id } = useParams(); // 🔥 ID vjen prej URL
  const { token } = useAuth();

  const [parking, setParking] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || id === "undefined") return;

    apiFetch(`http://localhost:3002/api/parkings/${id}`, { token })
      .then(setParking)
      .catch(() => setError("Server Error"));
  }, [id, token]);

  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!parking) return <p>Loading...</p>;

  return (
    <div>
      <h1>{parking.Name}</h1>
      <p><b>Location:</b> {parking.Location}</p>
      <p><b>Capacity:</b> {parking.Capacity}</p>
      <p><b>Occupied:</b> {parking.Occupied}</p>
    </div>
  );
}
