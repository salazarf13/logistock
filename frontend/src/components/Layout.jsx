import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Boxes,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Package,
  QrCode,
  ShoppingCart,
  Tags,
  Truck,
  Users,
  Warehouse,
  Route as RouteIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useStore } from "../context/StoreContext.jsx";
import { ROLES } from "../lib/format.js";

const links = [
  { to: "/", label: "Panel", icon: LayoutDashboard, roles: ["administrador", "bodeguero", "conductor"] },
  { to: "/productos", label: "Productos", icon: Package, roles: ["administrador", "bodeguero"] },
  { to: "/categorias", label: "Categorías", icon: Tags, roles: ["administrador"] },
  { to: "/proveedores", label: "Proveedores", icon: Warehouse, roles: ["administrador", "bodeguero"] },
  { to: "/compras", label: "Compras / recepción", icon: Boxes, roles: ["administrador", "bodeguero"] },
  { to: "/pedidos", label: "Pedidos", icon: ShoppingCart, roles: ["administrador", "bodeguero"] },
  { to: "/escaner", label: "Escáner", icon: QrCode, roles: ["administrador", "bodeguero"] },
  { to: "/vehiculos", label: "Vehículos", icon: Truck, roles: ["administrador"] },
  { to: "/rutas", label: "Rutas", icon: RouteIcon, roles: ["administrador"] },
  { to: "/usuarios", label: "Usuarios", icon: Users, roles: ["administrador"] },
  { to: "/mi-ruta", label: "Mi ruta", icon: MapPinned, roles: ["conductor", "administrador"] },
];

export default function Layout() {
  const { user, logout, mode } = useAuth();
  const store = useStore();
  const navigate = useNavigate();
  const menu = links.filter((l) => l.roles.includes(user.rol));

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-teal-900/40 bg-slate-900 text-slate-200 lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500 font-bold text-slate-900">
            LS
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-white">LogiStock</p>
            <p className="text-xs text-slate-400">Inventario y despacho</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {menu.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  isActive
                    ? "bg-teal-600/20 text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div>
            <p className="text-sm font-medium">{user.nombre}</p>
            <p className="text-xs text-slate-500">{ROLES[user.rol]}</p>
          </div>
          <button
            className="btn-secondary"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            <LogOut size={16} />
            Salir
          </button>
        </header>
        <main className="flex-1 p-4 lg:p-8">
          {mode === "local" && (
            <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Modo local: el API no está conectado. Los cambios se guardan en este navegador.
            </p>
          )}
          {store.error && (
            <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{store.error}</p>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
