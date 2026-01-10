import { apiFetch } from "./http.js";

const BASE = import.meta.env.VITE_RESERVATION_URL;

export function getReservations(token) {
  return apiFetch(`${BASE}/api/reservations`, { token });
}

export function getAllReservations(token) {
  return apiFetch(`${BASE}/api/reservations/all`, { token });
}

export function createReservation(token, payload) {
  return apiFetch(`${BASE}/api/reservations`, { method: "POST", token, body: payload });
}

export function deleteReservation(token, id) {
  return apiFetch(`${BASE}/api/reservations/${id}`, { method: "DELETE", token });
}
