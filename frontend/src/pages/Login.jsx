import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  Shield,
  UserRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const demos = import.meta.env.DEV
  ? [
      {
        email: "admin@logistock.com",
        password: "admin123",
        rol: "Administrador",
        icon: Shield,
        color: "bg-teal-50 text-teal-700 border-teal-100",
      },
    ]
  : [];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    navigate("/");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-slate-900 p-12 text-white lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div className="pointer-events-none absolute -right-16 top-16 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative mx-auto max-w-xl text-center">
          <div className="flex flex-col items-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-teal-400 text-xl font-bold text-slate-900 shadow-lg shadow-teal-500/30">
              LS
            </span>
            <p className="mt-4 text-base font-semibold tracking-[0.22em] text-teal-300">LOGISTOCK</p>
            <p className="mt-1 text-sm text-slate-400">Sistema de Inventario y despacho</p>
          </div>
          <h1 className="mt-12 text-5xl font-semibold leading-tight">
            Inventario de telefonía, picking y rutas de despacho.
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-slate-300">
            iPhone, Samsung, Xiaomi, Motorola y Honor.
          </p>
          <p className="mt-16 text-sm text-slate-500">UMG · Análisis de Sistemas II · 2026</p>
        </div>
      </aside>

      <div className="relative grid place-items-center bg-[radial-gradient(ellipse_at_top,_#f0fdfa,_#f8fafc_55%)] p-6">
        <div className="pointer-events-none absolute right-8 top-8 hidden h-24 w-24 rounded-full border border-teal-100 lg:block" />
        <form onSubmit={submit} className="card relative w-full max-w-md p-8 shadow-xl shadow-slate-200/70">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/30">
            <UserRound size={30} />
          </div>
          <h2 className="text-center text-2xl font-semibold">Iniciar sesión</h2>
          <p className="mt-1 text-center text-sm text-slate-500">
            Entra con tu rol para ver el panel de LogiStock
          </p>

          {error && (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <Lock size={16} /> {error}
            </p>
          )}

          <label className="label mt-6" htmlFor="email">
            Correo
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              id="email"
              className="input pl-10"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <label className="label mt-4" htmlFor="password">
            Contraseña
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              id="password"
              className="input px-10"
              type={showPass ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              onClick={() => setShowPass((v) => !v)}
              aria-label={showPass ? "Ocultar contraseña" : "Ver contraseña"}
            >
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button className="btn-primary mt-6 w-full py-2.5" type="submit" disabled={loading}>
            <LogIn size={16} />
            {loading ? "Entrando…" : "Entrar al sistema"}
          </button>

          {demos.length > 0 && (
            <>
              <p className="mb-3 mt-7 text-center text-xs font-medium uppercase tracking-wide text-slate-400">
                Acceso rápido (solo desarrollo)
              </p>
              <div className="grid grid-cols-1 gap-2">
                {demos.map((d) => {
                  const Icon = d.icon;
                  const active = email === d.email;
                  return (
                    <button
                      key={d.email}
                      type="button"
                      onClick={() => {
                        setEmail(d.email);
                        setPassword(d.password);
                        setError("");
                      }}
                      className={`rounded-xl border px-2 py-3 text-center text-[11px] font-medium transition ${d.color} ${
                        active ? "ring-2 ring-teal-600 ring-offset-2" : "hover:brightness-95"
                      }`}
                    >
                      <Icon className="mx-auto mb-1" size={18} />
                      {d.rol}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}