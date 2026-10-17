import { AlertTriangle, Package, ShoppingCart, Truck } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useStore } from "../context/StoreContext.jsx";
import { ESTADOS_PEDIDO, quetzales } from "../lib/format.js";
import Badge from "../components/Badge.jsx";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();
  const store = useStore();
  const bajos = store.productos.filter((p) => p.stock <= p.stock_minimo);
  const pendientes = store.pedidos.filter((p) => ["pendiente", "en_picking", "listo"].includes(p.estado));
  const enRuta = store.pedidos.filter((p) => p.estado === "en_ruta");
  const valorInventario = store.productos.reduce((s, p) => s + p.stock * p.precio_compra, 0);

  if (user.rol === "conductor") {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Hola, {user.nombre.split(" ")[0]}</h1>
        <p className="mt-1 text-slate-500">Revisa las paradas asignadas para hoy.</p>
        <Link to="/mi-ruta" className="btn-primary mt-6 inline-flex">
          Ver mi ruta
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Panel de control</h1>
        <p className="text-sm text-slate-500">Bodega de celulares · Quetzaltenango · precios en Q</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Package} label="SKUs activos" value={store.productos.length} />
        <Kpi icon={AlertTriangle} label="Stock bajo" value={bajos.length} warn={bajos.length > 0} />
        <Kpi icon={ShoppingCart} label="Pedidos por despachar" value={pendientes.length} />
        <Kpi icon={Truck} label="En ruta" value={enRuta.length} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Alertas de stock mínimo</h2>
            <span className="text-xs text-slate-500">Valor inventario {quetzales(valorInventario)}</span>
          </div>
          {bajos.length === 0 ? (
            <p className="text-sm text-slate-500">No hay productos bajo el mínimo.</p>
          ) : (
            <ul className="divide-y">
              {bajos.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{p.nombre}</span>
                  <Badge value="bajo">
                    {p.stock} / mín. {p.stock_minimo}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Pedidos recientes</h2>
          <ul className="divide-y">
            {store.pedidos.slice(-5).reverse().map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  #{p.id} · {store.clienteDe(p.cliente_id)?.nombre}
                </span>
                <Badge value={p.estado}>{ESTADOS_PEDIDO[p.estado]}</Badge>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, warn }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`rounded-xl p-3 ${warn ? "bg-rose-50 text-rose-700" : "bg-teal-50 text-teal-800"}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}
