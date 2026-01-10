import { apiFetch } from "./http.js";

export function getReservations(token) {
  return apiFetch("/api/reservations", { token });
}

export function getAllReservations(token) {
  return apiFetch("/api/reservations/all", { token });
}

export function createReservation(token, payload) {
  return apiFetch("/api/reservations", { method: "POST", token, body: payload });
}

export function getReservationAdminStats(token) {
  return apiFetch("/api/admin/stats", { token });
}

export function deleteReservation(token, id) {
  return apiFetch(`/api/reservations/${id}`, { method: "DELETE", token });
}
