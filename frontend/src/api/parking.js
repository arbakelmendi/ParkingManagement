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
export function getParkingSpots(token, id) {
  return apiFetch(`${BASE}/api/parkings/${id}/spots`, { token });
}
