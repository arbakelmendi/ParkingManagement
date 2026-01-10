import { apiFetch } from "./http.js";

export function createSpot(token, payload) {
  return apiFetch("/api/spots", { method: "POST", token, body: payload });
}

export function updateSpot(token, id, payload) {
  return apiFetch(`/api/spots/${id}`, { method: "PUT", token, body: payload });
}

export function deleteSpot(token, id) {
  return apiFetch(`/api/spots/${id}`, { method: "DELETE", token });
}
