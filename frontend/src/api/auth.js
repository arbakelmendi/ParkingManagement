import { apiFetch } from "./http.js";

export function registerApi(payload) {
  return apiFetch("/api/auth/register", { method: "POST", body: payload });
}

export function loginApi(payload) {
  return apiFetch("/api/auth/login", { method: "POST", body: payload });
}
