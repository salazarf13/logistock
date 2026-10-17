import { useMemo, useState } from "react";
import { Printer, QrCode, Plus } from "lucide-react";
import { useStore } from "../context/StoreContext.jsx";
import { quetzales } from "../lib/format.js";
import Badge from "../components/Badge.jsx";
import Modal from "../components/Modal.jsx";
import BarcodeLabel from "../components/BarcodeLabel.jsx";
import ScannerModal from "../components/ScannerModal.jsx";

const empty = {
  sku: "",
  codigo_barras: "",
  nombre: "",
  descripcion: "",
  categoria_id: "",
  proveedor_id: "",
  precio_compra: 0,
  precio_venta: 0,
  stock: 0,
  stock_minimo: 5,
  unidad: "unidad",
  activo: true,
};

export default function Productos() {
  const store = useStore();
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null);
  const [printItem, setPrintItem] = useState(null);
  const [scan, setScan] = useState(false);

  const list = useMemo(() => {
    const term = q.toLowerCase();
    return store.productos.filter(
      (p) =>
        (p.nombre || "").toLowerCase().includes(term) ||
        (p.sku || "").toLowerCase().includes(term) ||
        String(p.codigo_barras || "").includes(term)
    );
  }, [store.productos, q]);

  const save = (e) => {
    e.preventDefault();
    store.upsert("productos", {
      ...form,
      categoria_id: Number(form.categoria_id) || null,
      proveedor_id: Number(form.proveedor_id) || null,
      precio_compra: Number(form.precio_compra),
      precio_venta: Number(form.precio_venta),
      stock: Number(form.stock),
      stock_minimo: Number(form.stock_minimo),
    });
    setForm(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Productos</h1>
          <p className="text-sm text-slate-500"></p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setScan(true)}>
            <QrCode size={16} /> Escanear
          </button>
          <button
            className="btn-primary"
            onClick={() =>
              setForm({
                ...empty,
                codigo_barras: String(7500000000000 + Math.floor(Math.random() * 99999)),
              })
            }
          >
            <Plus size={16} /> Nuevo
          </button>
        </div>
      </div>
      <input
        className="input max-w-md"
        placeholder="Buscar por nombre, SKU o código de barras"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="card overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Producto</th>
              <th className="th">Categoría</th>
              <th className="th">Stock</th>
              <th className="th">Precio</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="td">
                  <p className="font-medium">{p.nombre}</p>
                  <p className="text-xs text-slate-500">
                    {p.sku} · {p.codigo_barras}
                  </p>
                </td>
                <td className="td">{store.categoriaDe(p.categoria_id)?.nombre || "—"}</td>
                <td className="td">
                  <Badge value={p.stock <= p.stock_minimo ? "bajo" : "ok"}>
                    {p.stock} {p.unidad}
                  </Badge>
                </td>
                <td className="td">{quetzales(p.precio_venta)}</td>
                <td className="td text-right">
                  <button className="btn-secondary mr-2" onClick={() => setPrintItem(p)}>
                    <Printer size={14} />
                  </button>
                  <button className="btn-secondary" onClick={() => setForm(p)}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal title={form.id ? "Editar producto" : "Nuevo producto"} onClose={() => setForm(null)} wide>
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre" value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} />
            <Field label="SKU" value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} />
            <Field
              label="Código de barras"
              value={form.codigo_barras}
              onChange={(v) => setForm({ ...form, codigo_barras: v })}
            />
            <div>
              <label className="label">Categoría</label>
              <select
                className="input"
                value={form.categoria_id || ""}
                onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
              >
                <option value="">Seleccionar</option>
                {store.categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Proveedor</label>
              <select
                className="input"
                value={form.proveedor_id || ""}
                onChange={(e) => setForm({ ...form, proveedor_id: e.target.value })}
              >
                <option value="">Seleccionar</option>
                {store.proveedores.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Unidad" value={form.unidad} onChange={(v) => setForm({ ...form, unidad: v })} />
            <Field
              label="Precio compra"
              type="number"
              value={form.precio_compra}
              onChange={(v) => setForm({ ...form, precio_compra: v })}
            />
            <Field
              label="Precio venta"
              type="number"
              value={form.precio_venta}
              onChange={(v) => setForm({ ...form, precio_venta: v })}
            />
            <Field
              label="Stock"
              type="number"
              value={form.stock}
              onChange={(v) => setForm({ ...form, stock: v })}
            />
            <Field
              label="Stock mínimo"
              type="number"
              value={form.stock_minimo}
              onChange={(v) => setForm({ ...form, stock_minimo: v })}
            />
            <div className="sm:col-span-2">
              <Field
                label="Descripción"
                value={form.descripcion}
                onChange={(v) => setForm({ ...form, descripcion: v })}
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setForm(null)}>
                Cancelar
              </button>
              <button className="btn-primary" type="submit">
                Guardar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {printItem && (
        <Modal title="Etiqueta" onClose={() => setPrintItem(null)}>
          <div className="flex justify-center py-4">
            <BarcodeLabel value={printItem.codigo_barras} name={printItem.nombre} sku={printItem.sku} />
          </div>
          <button className="btn-primary w-full" onClick={() => window.print()}>
            Imprimir
          </button>
        </Modal>
      )}

      {scan && (
        <ScannerModal
          onClose={() => setScan(false)}
          onScan={(code) => {
            setQ(code);
            setScan(false);
          }}
        />
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} value={value} onChange={(e) => onChange(e.target.value)} required />
    </div>
  );
}
