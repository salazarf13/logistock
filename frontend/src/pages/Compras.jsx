import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useStore } from "../context/StoreContext.jsx";
import { fechaCorta, quetzales } from "../lib/format.js";
import Modal from "../components/Modal.jsx";

export default function Compras() {
  const { user } = useAuth();
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [proveedor_id, setProveedor] = useState(store.proveedores[0]?.id || "");
  const [lineas, setLineas] = useState([{ producto_id: store.productos[0]?.id, cantidad: 1, costo_unitario: 0 }]);

  const guardar = (e) => {
    e.preventDefault();
    store.registrarCompra({
      proveedor_id: Number(proveedor_id),
      usuario_id: user.id,
      detalle: lineas.map((l) => ({
        producto_id: Number(l.producto_id),
        cantidad: Number(l.cantidad),
        costo_unitario: Number(l.costo_unitario),
      })),
    });
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Compras y recepción</h1>
          <p className="text-sm text-slate-500">Al registrar una compra se incrementa el stock</p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>Nueva recepción</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">#</th>
              <th className="th">Proveedor</th>
              <th className="th">Fecha</th>
              <th className="th">Total</th>
            </tr>
          </thead>
          <tbody>
            {store.compras.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="td">{c.id}</td>
                <td className="td">{store.proveedorDe(c.proveedor_id)?.nombre}</td>
                <td className="td">{fechaCorta(c.fecha)}</td>
                <td className="td">{quetzales(c.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <Modal title="Recepción de mercancía" onClose={() => setOpen(false)} wide>
          <form onSubmit={guardar} className="space-y-3">
            <select className="input" value={proveedor_id} onChange={(e) => setProveedor(e.target.value)}>
              {store.proveedores.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
            {lineas.map((l, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-3">
                <select
                  className="input"
                  value={l.producto_id}
                  onChange={(e) => {
                    const copy = [...lineas];
                    copy[i].producto_id = e.target.value;
                    setLineas(copy);
                  }}
                >
                  {store.productos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
                <input className="input" type="number" min="1" value={l.cantidad} onChange={(e) => {
                  const copy = [...lineas];
                  copy[i].cantidad = e.target.value;
                  setLineas(copy);
                }} />
                <input className="input" type="number" min="0" step="0.01" placeholder="Costo" value={l.costo_unitario} onChange={(e) => {
                  const copy = [...lineas];
                  copy[i].costo_unitario = e.target.value;
                  setLineas(copy);
                }} />
              </div>
            ))}
            <button type="button" className="btn-secondary" onClick={() => setLineas([...lineas, { producto_id: store.productos[0]?.id, cantidad: 1, costo_unitario: 0 }])}>
              Agregar línea
            </button>
            <button className="btn-primary w-full" type="submit">Registrar y sumar stock</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
