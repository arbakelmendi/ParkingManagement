import { apiFetch } from "./http.js";

export function getParkings(token) {
  return apiFetch("/api/parkings", { token });
}

export function createParking(token, payload) {
  return apiFetch("/api/parkings", { method: "POST", token, body: payload });
}

export function updateParking(token, id, payload) {
  return apiFetch(`/api/parkings/${id}`, { method: "PUT", token, body: payload });
}

export function deleteParking(token, id) {
  return apiFetch(`/api/parkings/${id}`, { method: "DELETE", token });
}

export function getParkingById(token, id) {
  return apiFetch(`/api/parkings/${id}`, { token });
}

// Opsionale: nëse e keni endpoint-in
// Fallback: if /api/parkings/:id/spots fails (404), fetch ALL spots and filter.
// This ensures the frontend works even if the user hasn't restarted the backend to apply routing fixes.
export function getParkingAdminStats(token) {
  return apiFetch("/api/admin/stats", { token });
}

export async function getParkingSpots(token, id) {
  try {
    return await apiFetch(`/api/parkings/${id}/spots`, { token });
  } catch (err) {
    console.warn("Direct spot fetch failed, using fallback...", err);
    const allSpots = await apiFetch("/api/spots", { token });
    // Filter by ParkingId (ensure type match)
    return allSpots.filter(s => s.ParkingId == id);
  }
}
