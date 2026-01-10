// AuthContext.jsx
import { createContext, useEffect, useMemo, useState, useContext } from "react";

export const AuthContext = createContext(null);

function safeJSONParse(value, fallback = null) {
  if (value === null || value === undefined) return fallback;

  const v = typeof value === "string" ? value.trim() : String(value).trim();
  if (!v || v === "undefined" || v === "null") return fallback;

  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    safeJSONParse(localStorage.getItem("user"), null)
  );

  const [token, setToken] = useState(() =>
    localStorage.getItem("token") || ""
  );

  useEffect(() => {
    user
      ? localStorage.setItem("user", JSON.stringify(user))
      : localStorage.removeItem("user");

    token
      ? localStorage.setItem("token", token)
      : localStorage.removeItem("token");
  }, [user, token]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthed: Boolean(token),
      login: ({ user, token }) => {
        setUser(user ?? null);
        setToken(token ?? "");
      },
      logout: () => {
        setUser(null);
        setToken("");
      },
    }),
    [user, token]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ✅ KJO MUNGONTE
export function useAuth() {
  return useContext(AuthContext);
}
