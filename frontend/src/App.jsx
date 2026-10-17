import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Productos from "./pages/Productos.jsx";
import Categorias from "./pages/Categorias.jsx";
import Proveedores from "./pages/Proveedores.jsx";
import Compras from "./pages/Compras.jsx";
import Pedidos from "./pages/Pedidos.jsx";
import Vehiculos from "./pages/Vehiculos.jsx";
import Rutas from "./pages/Rutas.jsx";
import Usuarios from "./pages/Usuarios.jsx";
import MiRuta from "./pages/MiRuta.jsx";
import Escaner from "./pages/Escaner.jsx";

function Guard({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.rol)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        element={
          <Guard>
            <Layout />
          </Guard>
        }
      >
        <Route index element={<Dashboard />} />
        <Route
          path="productos"
          element={
            <Guard roles={["administrador", "bodeguero"]}>
              <Productos />
            </Guard>
          }
        />
        <Route
          path="categorias"
          element={
            <Guard roles={["administrador"]}>
              <Categorias />
            </Guard>
          }
        />
        <Route
          path="proveedores"
          element={
            <Guard roles={["administrador", "bodeguero"]}>
              <Proveedores />
            </Guard>
          }
        />
        <Route
          path="compras"
          element={
            <Guard roles={["administrador", "bodeguero"]}>
              <Compras />
            </Guard>
          }
        />
        <Route
          path="pedidos"
          element={
            <Guard roles={["administrador", "bodeguero"]}>
              <Pedidos />
            </Guard>
          }
        />
        <Route
          path="vehiculos"
          element={
            <Guard roles={["administrador"]}>
              <Vehiculos />
            </Guard>
          }
        />
        <Route
          path="rutas"
          element={
            <Guard roles={["administrador"]}>
              <Rutas />
            </Guard>
          }
        />
        <Route
          path="usuarios"
          element={
            <Guard roles={["administrador"]}>
              <Usuarios />
            </Guard>
          }
        />
        <Route
          path="escaner"
          element={
            <Guard roles={["administrador", "bodeguero"]}>
              <Escaner />
            </Guard>
          }
        />
        <Route
          path="mi-ruta"
          element={
            <Guard roles={["conductor", "administrador"]}>
              <MiRuta />
            </Guard>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
