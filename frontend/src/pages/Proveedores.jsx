import { useState } from "react";
import { useStore } from "../context/StoreContext.jsx";
import Modal from "../components/Modal.jsx";
import { Header, List } from "./Categorias.jsx";

export default function Proveedores() {
  const store = useStore();
  const empty = { nombre: "", nit: "", telefono: "", email: "", direccion: "" };
  const [form, setForm] = useState(null);

  return (
    <div className="space-y-4">
      <Header title="Proveedores" onNew={() => setForm(empty)} />
      <List
        rows={store.proveedores}
        columns={["Nombre", "NIT", "Teléfono", "Correo"]}
        render={(p) => [p.nombre, p.nit, p.telefono, p.email]}
        onEdit={setForm}
      />
      {form && (
        <Modal title={form.id ? "Editar proveedor" : "Nuevo proveedor"} onClose={() => setForm(null)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              store.upsert("proveedores", form);
              setForm(null);
            }}
          >
            {["nombre", "nit", "telefono", "email", "direccion"].map((k) => (
              <input
                key={k}
                className="input"
                placeholder={k}
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                required={k === "nombre"}
              />
            ))}
            <button className="btn-primary w-full" type="submit">Guardar</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
