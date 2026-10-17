import { useState } from "react";
import { useStore } from "../context/StoreContext.jsx";
import { seedUsuarios } from "../data/seed.js";
import Badge from "../components/Badge.jsx";
import Modal from "../components/Modal.jsx";

export default function Vehiculos() {
  const store = useStore();
  const conductores = (store.usuarios?.length ? store.usuarios : seedUsuarios).filter(
    (u) => u.rol === "conductor"
  );
  const [form, setForm] = useState(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Flota vehicular</h1>
        <button
          className="btn-primary"
          onClick={() =>
            setForm({
              placa: "",
              marca: "",
              modelo: "",
              capacidad_kg: 1000,
              conductor_id: "",
              estado: "disponible",
            })
          }
        >
          Nuevo vehículo
        </button>
      </div>
      <div className="card overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Placa</th>
              <th className="th">Unidad</th>
              <th className="th">Capacidad</th>
              <th className="th">Conductor</th>
              <th className="th">Estado</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody>
            {store.vehiculos.map((v) => (
              <tr key={v.id} className="border-t border-slate-100">
                <td className="td font-medium">{v.placa}</td>
                <td className="td">
                  {v.marca} {v.modelo}
                </td>
                <td className="td">{v.capacidad_kg} kg</td>
                <td className="td">{conductores.find((c) => Number(c.id) === Number(v.conductor_id))?.nombre || "Sin asignar"}</td>
                <td className="td">
                  <Badge value={v.estado}>{v.estado}</Badge>
                </td>
                <td className="td text-right">
                  <button className="btn-secondary" onClick={() => setForm(v)}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {form && (
        <Modal title={form.id ? "Editar vehículo" : "Nuevo vehículo"} onClose={() => setForm(null)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              store.upsert("vehiculos", {
                ...form,
                capacidad_kg: Number(form.capacidad_kg),
                conductor_id: form.conductor_id ? Number(form.conductor_id) : null,
              });
              setForm(null);
            }}
          >
            <input className="input" placeholder="Placa" value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value })} required />
            <input className="input" placeholder="Marca" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
            <input className="input" placeholder="Modelo" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
            <input className="input" type="number" placeholder="Capacidad kg" value={form.capacidad_kg} onChange={(e) => setForm({ ...form, capacidad_kg: e.target.value })} />
            <select className="input" value={form.conductor_id || ""} onChange={(e) => setForm({ ...form, conductor_id: e.target.value })}>
              <option value="">Sin conductor</option>
              {conductores.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <select className="input" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              <option value="disponible">disponible</option>
              <option value="en_ruta">en_ruta</option>
              <option value="mantenimiento">mantenimiento</option>
            </select>
            <button className="btn-primary w-full" type="submit">Guardar</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
