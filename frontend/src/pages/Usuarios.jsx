import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useStore } from "../context/StoreContext.jsx";
import { ROLES } from "../lib/format.js";
import Badge from "../components/Badge.jsx";
import Modal from "../components/Modal.jsx";

export default function Usuarios() {
  const store = useStore();
  const { user: yo, setProfile, cambiarUsuario } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  const empty = {
    nombre: "",
    email: "",
    password: "",
    rol: "bodeguero",
    telefono: "",
    activo: true,
  };

  const entrarComo = async (u) => {
    const res = await cambiarUsuario(u.id);
    if (res.ok) navigate("/");
    else setError(res.error);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await store.guardarUsuario(form);
      if (form.id && Number(form.id) === Number(yo.id)) {
        setProfile({ nombre: form.nombre, email: form.email, rol: form.rol });
      }
      setForm(null);
    } catch (err) {
      setError(err.message || "No se pudo guardar");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Usuarios y roles</h1>
          <p className="text-sm text-slate-500">
            Los cambios se guardan en MySQL y quedan ligados a cada cuenta
          </p>
        </div>
        <button className="btn-primary" onClick={() => setForm({ ...empty })}>
          Nuevo usuario
        </button>
      </div>

      {error && !form && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      <div className="card overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Nombre</th>
              <th className="th">Correo</th>
              <th className="th">Rol</th>
              <th className="th">Teléfono</th>
              <th className="th">Estado</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody>
            {(store.usuarios || []).map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="td font-medium">{u.nombre}</td>
                <td className="td">{u.email}</td>
                <td className="td">
                  <Badge value="ok">{ROLES[u.rol] || u.rol}</Badge>
                </td>
                <td className="td">{u.telefono || "—"}</td>
                <td className="td">{u.activo === false ? "Inactivo" : "Activo"}</td>
                <td className="td text-right">
                  <div className="flex justify-end gap-2">
                    {u.rol !== "administrador" && u.activo !== false && (
                      <button className="btn-primary" onClick={() => entrarComo(u)}>
                        Entrar como
                      </button>
                    )}
                    <button
                      className="btn-secondary"
                      onClick={() => setForm({ ...u, password: "" })}
                    >
                      Editar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal title={form.id ? "Editar usuario" : "Nuevo usuario"} onClose={() => setForm(null)}>
          <form className="space-y-3" onSubmit={guardar}>
            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            <input
              className="input"
              placeholder="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
            <input
              className="input"
              type="email"
              placeholder="Correo"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <input
              className="input"
              type="password"
              placeholder={form.id ? "Nueva contraseña (opcional)" : "Contraseña"}
              value={form.password || ""}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!form.id}
              minLength={form.id ? 0 : 4}
            />
            <select
              className="input"
              value={form.rol}
              onChange={(e) => setForm({ ...form, rol: e.target.value })}
            >
              <option value="administrador">Administrador</option>
              <option value="bodeguero">Bodeguero</option>
              <option value="conductor">Conductor</option>
            </select>
            <input
              className="input"
              placeholder="Teléfono"
              value={form.telefono || ""}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.activo !== false}
                onChange={(e) => setForm({ ...form, activo: e.target.checked })}
              />
              Usuario activo
            </label>
            <button className="btn-primary w-full" type="submit">
              Guardar
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}