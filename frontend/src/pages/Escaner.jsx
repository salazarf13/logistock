import { useState } from "react";
import { useStore } from "../context/StoreContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import ScannerModal from "../components/ScannerModal.jsx";
import BarcodeLabel from "../components/BarcodeLabel.jsx";
import Badge from "../components/Badge.jsx";
import { quetzales } from "../lib/format.js";

export default function Escaner() {
  const store = useStore();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [mensaje, setMensaje] = useState(null);
  const puedeAgregar = ["administrador", "bodeguero"].includes(user?.rol);
  const producto = store.productos.find(
    (p) =>
      p.codigo_barras === code || (p.sku || "").toLowerCase() === code.toLowerCase()
  );

  async function agregar() {
    const res = await store.agregarStock(producto.id, cantidad);
    if (res.ok) {
      setMensaje({
        ok: true,
        texto: `Se agregaron ${Number(cantidad)} ${producto.unidad || "unidades"} al stock.`,
      });
      setCantidad(1);
    } else {
      setMensaje({ ok: false, texto: res.error });
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Escáner de inventario</h1>
        <p className="text-sm text-slate-500">Usa la cámara (html5-qrcode) o escribe el código</p>
      </div>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        Abrir cámara
      </button>
      {open && (
        <ScannerModal
          onClose={() => setOpen(false)}
          onScan={(decoded) => {
            setCode(decoded);
            setMensaje(null);
            setOpen(false);
          }}
        />
      )}
      {code && !producto && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No hay producto con el código <strong>{code}</strong>
        </p>
      )}
      {producto && (
        <div className="card grid gap-6 p-6 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold">{producto.nombre}</h2>
            <p className="text-sm text-slate-500">{producto.descripcion}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <Row k="SKU" v={producto.sku} />
              <Row k="Código" v={producto.codigo_barras} />
              <Row
                k="Stock"
                v={
                  <Badge value={producto.stock <= producto.stock_minimo ? "bajo" : "ok"}>
                    {producto.stock} {producto.unidad} (mín. {producto.stock_minimo})
                  </Badge>
                }
              />
              <Row k="Precio venta" v={quetzales(producto.precio_venta)} />
            </dl>

            {puedeAgregar && (
              <div className="mt-5 border-t pt-4">
                <p className="mb-2 text-sm font-medium">Agregar al stock</p>
                <div className="flex gap-2">
                  <input
                    className="input w-24"
                    type="number"
                    min="1"
                    step="1"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                  />
                  <button className="btn-primary" onClick={agregar}>
                    Agregar al stock
                  </button>
                </div>
                {mensaje && (
                  <p className={`mt-2 text-sm ${mensaje.ok ? "text-emerald-700" : "text-red-700"}`}>
                    {mensaje.texto}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center justify-center">
            <BarcodeLabel value={producto.codigo_barras} name={producto.nombre} sku={producto.sku} />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}