import { apiFetch } from "./http.js";

const BASE = import.meta.env.VITE_AUTH_URL;

export function registerApi(payload) {
  return apiFetch(`${BASE}/api/auth/register`, { method: "POST", body: payload });
}

export function loginApi(payload) {
  return apiFetch(`${BASE}/api/auth/login`, { method: "POST", body: payload });
}
