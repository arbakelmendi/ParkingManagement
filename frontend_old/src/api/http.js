//http.js
export async function apiFetch(url, { method = "GET", token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("[apiFetch] Network error for:", url, err);
    }
    throw err;
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    if (import.meta.env.DEV) {
      console.warn("[apiFetch] Request failed:", url, res.status, msg);
    }
    throw new Error(msg);
  }

  return data;
}
