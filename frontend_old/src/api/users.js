import { apiFetch } from "./http.js";

export function getUsers(token) {
  return apiFetch("/api/users", { token });
}

export function createUser(token, payload) {
  return apiFetch("/api/users", { method: "POST", token, body: payload });
}

export function updateUser(token, id, payload) {
  return apiFetch(`/api/users/${id}`, { method: "PUT", token, body: payload });
}

export function deleteUser(token, id) {
  return apiFetch(`/api/users/${id}`, { method: "DELETE", token });
}
