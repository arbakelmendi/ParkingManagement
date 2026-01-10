import { apiFetch } from "./http.js";

const BASE = import.meta.env.VITE_PARKING_URL;

export function getParkings(token) {
  return apiFetch(`${BASE}/api/parkings`, { token });
}

export function createParking(token, payload) {
  return apiFetch(`${BASE}/api/parkings`, { method: "POST", token, body: payload });
}

export function getParkingById(token, id) {
  return apiFetch(`${BASE}/api/parkings/${id}`, { token });
}

// Opsionale: nëse e keni endpoint-in
// Fallback: if /api/parkings/:id/spots fails (404), fetch ALL spots and filter.
// This ensures the frontend works even if the user hasn't restarted the backend to apply routing fixes.
export async function getParkingSpots(token, id) {
  try {
    return await apiFetch(`${BASE}/api/parkings/${id}/spots`, { token });
  } catch (err) {
    console.warn("Direct spot fetch failed, using fallback...", err);
    const allSpots = await apiFetch(`${BASE}/api/spots`, { token });
    // Filter by ParkingId (ensure type match)
    return allSpots.filter(s => s.ParkingId == id);
  }
}
