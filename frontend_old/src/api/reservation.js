import { apiFetch } from "./http.js";

export function getMyReservations(token) {
  return apiFetch("/api/reservations/my", { token });
}

export function getAllReservations(token) {
  return apiFetch("/api/reservations", { token });
}

export function createReservation(token, payload) {
  return apiFetch("/api/reservations", { method: "POST", token, body: payload });
}

export function deleteReservation(token, id) {
  return apiFetch(`/api/reservations/${id}`, { method: "DELETE", token });
}
