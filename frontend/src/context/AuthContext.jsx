import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { seedUsuarios } from "../data/seed.js";
import { api, loginRequest } from "../api.js";

const AuthContext = createContext(null);
const SESSION_KEY = "logistock-session";
const ADMIN_KEY = "logistock-admin-session";

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : { user: null, token: null, mode: "local" };
  } catch {
    return { user: null, token: null, mode: "local" };
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);

  const persist = (next) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setSession(next);
  };

  const login = async (email, password) => {
    try {
      const data = await loginRequest(email, password);
      persist({ user: data.user, token: data.token, mode: "api" });
      return { ok: true };
    } catch (err) {
      if (err.status === 401) return { ok: false, error: err.message };
      return {
        ok: false,
        error: "No hay conexión con MySQL/API. Enciende MySQL en XAMPP y la API PHP (puerto 4000).",
      };
    }
  };

   const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ADMIN_KEY);
    setSession({ user: null, token: null, mode: "local" });
  };

  const cambiarUsuario = async (usuarioId) => {
    try {
      const data = await api("/auth/cambiar-usuario", {
        method: "POST",
        token: session.token,
        body: { usuario_id: usuarioId },
      });
      if (!localStorage.getItem(ADMIN_KEY)) {
        localStorage.setItem(ADMIN_KEY, JSON.stringify(session));
      }
      persist({ user: data.user, token: data.token, mode: "api" });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || "No se pudo cambiar de usuario" };
    }
  };

  const volverAdmin = () => {
    try {
      const raw = localStorage.getItem(ADMIN_KEY);
      localStorage.removeItem(ADMIN_KEY);
      if (raw) persist(JSON.parse(raw));
    } catch {
      logout();
    }
  };

  useEffect(() => {
    const current = readSession();
    if (current.mode === "api" && current.token) return;
    const demo = seedUsuarios.find((u) => u.email === current.user?.email);
    if (!demo) return;
    loginRequest(demo.email, demo.password)
      .then((data) => persist({ user: data.user, token: data.token, mode: "api" }))
      .catch(() => {});
  }, []);

  const setProfile = (patch) => {
    if (!session.user) return;
    persist({ ...session, user: { ...session.user, ...patch } });
  };

  const suplantando = Boolean(localStorage.getItem(ADMIN_KEY));

  const value = useMemo(
    () => ({
      user: session.user,
      token: session.token,
      mode: session.mode,
      suplantando,
      login,
      logout,
      setProfile,
      cambiarUsuario,
      volverAdmin,
    }),
    [session, suplantando]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {suplantando && (
        <div className="fixed bottom-4 right-4 z-[2000] flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
          <span>
            Viendo como <strong>{session.user?.nombre}</strong>
          </span>
          <button
            type="button"
            className="rounded-lg bg-teal-500 px-3 py-1 font-medium text-slate-900"
            onClick={volverAdmin}
          >
            Volver a administrador
          </button>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fuera de AuthProvider");
  return ctx;
}
