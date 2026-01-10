import { apiFetch } from "./http.js";

export function getDashboardStats(token) {
  return apiFetch("/api/dashboard/stats", { token });
}
