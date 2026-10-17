import { useState } from "react";
import { useStore } from "../context/StoreContext.jsx";
import Modal from "../components/Modal.jsx";

export default function Categorias() {
  const store = useStore();
  const [form, setForm] = useState(null);

  return (
    <div className="space-y-4">
      <Header title="Categorías" onNew={() => setForm({ nombre: "", descripcion: "" })} />
      <List
        rows={store.categorias}
        columns={["Nombre", "Descripción"]}
        render={(c) => [c.nombre, c.descripcion]}
        onEdit={setForm}
      />
      {form && (
        <Modal title={form.id ? "Editar categoría" : "Nueva categoría"} onClose={() => setForm(null)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              store.upsert("categorias", form);
              setForm(null);
            }}
          >
            <input className="input" placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            <input className="input" placeholder="Descripción" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            <button className="btn-primary w-full" type="submit">Guardar</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function Header({ title, onNew }) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <button className="btn-primary" onClick={onNew}>Nuevo</button>
    </div>
  );
}

export function List({ rows, columns, render, onEdit }) {
  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((c) => (
              <th key={c} className="th">{c}</th>
            ))}
            <th className="th" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              {render(row).map((cell, i) => (
                <td key={i} className="td">{cell}</td>
              ))}
              <td className="td text-right">
                <button className="btn-secondary" onClick={() => onEdit(row)}>Editar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
