import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useStore } from "../context/StoreContext.jsx";
import { ESTADOS_PEDIDO, fechaCorta, quetzales } from "../lib/format.js";
import Badge from "../components/Badge.jsx";
import Modal from "../components/Modal.jsx";

export default function Pedidos() {
  const { user } = useAuth();
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [cliente_id, setCliente] = useState(store.clientes[0]?.id || "");
  const [notas, setNotas] = useState("");
  const [lineas, setLineas] = useState([
    { producto_id: store.productos[0]?.id, cantidad: 1 },
  ]);

  const guardar = async (e) => {
    e.preventDefault();
    const detalle = lineas.map((l) => {
      const p = store.productoDe(Number(l.producto_id));
      return {
        producto_id: Number(l.producto_id),
        cantidad: Number(l.cantidad),
        precio_unitario: p?.precio_venta || 0,
      };
    });
    const res = await store.crearPedido({
      cliente_id: Number(cliente_id),
      usuario_id: user.id,
      notas,
      detalle,
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const nombres = detalle
      .map((d) => `${d.cantidad} × ${store.productoDe(d.producto_id)?.nombre || "producto"}`)
      .join(", ");
    setOkMsg(`Pedido creado. Se descontó stock: ${nombres}`);
    setOpen(false);
    setError("");
    setNotas("");
    setLineas([{ producto_id: store.productos[0]?.id, cantidad: 1 }]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pedidos</h1>
          <p className="text-sm text-slate-500">
            Al crear el pedido se reserva y descuenta el stock de cada teléfono en inventario
          </p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          Nuevo pedido
        </button>
      </div>
      {okMsg && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{okMsg}</p>}
      <div className="card overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">#</th>
              <th className="th">Cliente</th>
              <th className="th">Teléfonos / accesorios</th>
              <th className="th">Fecha</th>
              <th className="th">Total</th>
              <th className="th">Estado</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody>
            {[...store.pedidos].reverse().map((p) => (
              <tr key={p.id} className="border-t border-slate-100 align-top">
                <td className="td">{p.id}</td>
                <td className="td">{store.clienteDe(p.cliente_id)?.nombre}</td>
                <td className="td">
                  <ul className="space-y-1 text-xs text-slate-600">
                    {(p.detalle || []).map((d, i) => {
                      const prod = store.productoDe(d.producto_id);
                      return (
                        <li key={i}>
                          {d.cantidad} × {prod?.nombre || `SKU ${d.producto_id}`}
                          {prod ? ` · queda ${prod.stock}` : ""}
                        </li>
                      );
                    })}
                  </ul>
                </td>
                <td className="td">{fechaCorta(p.fecha)}</td>
                <td className="td">{quetzales(p.total)}</td>
                <td className="td">
                  <Badge value={p.estado}>{ESTADOS_PEDIDO[p.estado]}</Badge>
                </td>
                <td className="td text-right">
                  {p.estado === "pendiente" && (
                    <button
                      className="btn-primary"
                      onClick={() => store.cambiarEstadoPedido(p.id, "en_picking")}
                    >
                      Iniciar picking
                    </button>
                  )}
                  {p.estado === "en_picking" && (
                    <button
                      className="btn-primary"
                      onClick={() => store.cambiarEstadoPedido(p.id, "listo")}
                    >
                      Marcar listo
                    </button>
                  )}
                  {["pendiente", "en_picking"].includes(p.estado) && (
                    <button
                      className="btn-secondary ml-2"
                      onClick={() => store.cambiarEstadoPedido(p.id, "cancelado")}
                    >
                      Cancelar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title="Nuevo pedido" onClose={() => setOpen(false)} wide>
          <form onSubmit={guardar} className="space-y-3">
            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            <label className="label">Cliente / tienda</label>
            <select className="input" value={cliente_id} onChange={(e) => setCliente(e.target.value)}>
              {store.clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            {lineas.map((l, i) => {
              const prod = store.productoDe(l.producto_id);
              return (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_120px]">
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
                      <option key={p.id} value={p.id}>
                        {p.nombre} — stock {p.stock} — {quetzales(p.precio_venta)}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    max={prod?.stock || 1}
                    value={l.cantidad}
                    onChange={(e) => {
                      const copy = [...lineas];
                      copy[i].cantidad = e.target.value;
                      setLineas(copy);
                    }}
                  />
                </div>
              );
            })}
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                setLineas([...lineas, { producto_id: store.productos[0]?.id, cantidad: 1 }])
              }
            >
              Agregar producto
            </button>
            <input
              className="input"
              placeholder="Notas de entrega"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
            <button className="btn-primary w-full" type="submit">
              Crear pedido y descontar stock
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
