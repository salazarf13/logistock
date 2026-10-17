import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { seed, seedUsuarios } from "../data/seed.js";
import { api } from "../api.js";
import { useAuth } from "./AuthContext.jsx";
import { normalizeStore, sameId } from "../lib/ids.js";
import { normalizarEstadoParada, normalizarEstadoRuta, rutaCerrada } from "../lib/format.js";

const StoreContext = createContext(null);

function storeKey(userId) {
  return `logistock-store-u${userId || "anon"}-v3`;
}

function nextId(list) {
  return (list || []).reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function loadLocal(userId) {
  try {
    const raw = localStorage.getItem(storeKey(userId));
    if (raw) {
      const parsed = normalizeStore(JSON.parse(raw));
      if (!parsed.usuarios?.length) {
        parsed.usuarios = seedUsuarios.map((u) => ({ ...u }));
      }
      return parsed;
    }
  } catch {
    /* ignore */
  }
  const data = normalizeStore(structuredClone(seed));
  data.usuarios = seedUsuarios.map((u) => ({ ...u }));
  return data;
}

function applyUpsert(prev, key, record) {
  const list = prev[key] || [];
  const exists = record.id != null && list.some((x) => sameId(x.id, record.id));
  const item = exists ? { ...record, id: Number(record.id) } : { ...record, id: nextId(list) };
  return {
    ...prev,
    [key]: exists ? list.map((x) => (sameId(x.id, item.id) ? item : x)) : [...list, item],
  };
}

export function StoreProvider({ children }) {
  const { user, token, mode } = useAuth();
  const [data, setData] = useState(() => {
    const base = normalizeStore(structuredClone(seed));
    base.usuarios = seedUsuarios.map((u) => ({ ...u }));
    return base;
  });
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bootGen = useRef(0);

  const reload = useCallback(async () => {
    if (!user) return;
    const mine = bootGen.current;
    if (mode === "api" && token) {
      setLoading(true);
      try {
        const boot = normalizeStore(await api("/bootstrap", { token }));
        if (mine !== bootGen.current) return;
        if (!boot.usuarios?.length) {
          boot.usuarios = seedUsuarios.map(({ password, ...u }) => u);
        }
        setData(boot);
        setError("");
      } catch (err) {
        if (mine !== bootGen.current) return;
        setData(loadLocal(user.id));
        setError("");
      } finally {
        if (mine === bootGen.current) {
          setLoading(false);
          setHydrated(true);
        }
      }
    } else {
      setData(loadLocal(user.id));
      setHydrated(true);
    }
  }, [user, mode, token]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!hydrated || !user) return;
    localStorage.setItem(storeKey(user.id), JSON.stringify(data));
  }, [data, user, hydrated]);

  const apiMode = mode === "api" && token;

  const value = useMemo(() => {
    const byId = (list, id) => (list || []).find((x) => sameId(x.id, id));
    const categoriaDe = (id) => byId(data.categorias, id);
    const proveedorDe = (id) => byId(data.proveedores, id);
    const clienteDe = (id) => byId(data.clientes, id);
    const productoDe = (id) => byId(data.productos, id);
    const vehiculoDe = (id) => byId(data.vehiculos, id);

    const bump = () => {
      bootGen.current += 1;
    };

    const sync = (fn) => {
      if (!apiMode) return;
      fn().then(() => reload()).catch(() => {});
    };

    const guardarUsuario = async (record) => {
      bump();
      setData((prev) => applyUpsert(prev, "usuarios", record));
      const payload = {
        nombre: record.nombre,
        email: record.email,
        rol: record.rol,
        telefono: record.telefono || "",
        activo: record.activo !== false,
      };
      if (record.password) payload.password = record.password;
      if (apiMode) {
        const path = record.id ? `/usuarios/${record.id}` : "/usuarios";
        sync(() => api(path, { method: record.id ? "PUT" : "POST", token, body: payload }));
      }
    };

    const upsert = async (key, record) => {
      bump();
      setData((prev) => applyUpsert(prev, key, record));
      if (apiMode) {
        const path = `/${key}${record.id ? `/${record.id}` : ""}`;
        sync(() => api(path, { method: record.id ? "PUT" : "POST", token, body: record }));
      }
    };

    const registrarCompra = async ({ proveedor_id, usuario_id, detalle }) => {
      bump();
      const total = detalle.reduce((s, d) => s + Number(d.cantidad) * Number(d.costo_unitario), 0);
      setData((prev) => {
        const productos = prev.productos.map((p) => {
          const line = detalle.find((d) => sameId(d.producto_id, p.id));
          if (!line) return p;
          return { ...p, stock: Number(p.stock) + Number(line.cantidad) };
        });
        const compra = {
          id: nextId(prev.compras),
          proveedor_id: Number(proveedor_id),
          usuario_id,
          fecha: new Date().toISOString(),
          total,
          estado: "registrada",
          detalle,
        };
        return { ...prev, productos, compras: [...(prev.compras || []), compra] };
      });
      if (apiMode) sync(() => api("/compras", { method: "POST", token, body: { proveedor_id, detalle } }));
    };
    const agregarStock = async (productoId, cantidad) => {
      const qty = Number(cantidad);
      if (!Number.isInteger(qty) || qty < 1) {
        return { ok: false, error: "La cantidad debe ser un entero mayor que 0" };
      }
      bump();
      setData((prev) => ({
        ...prev,
        productos: prev.productos.map((p) =>
          sameId(p.id, productoId) ? { ...p, stock: Number(p.stock) + qty } : p
        ),
      }));
      if (apiMode) {
        sync(() =>
          api(`/productos/${productoId}/stock`, { method: "POST", token, body: { cantidad: qty } })
        );
      }
      return { ok: true };
    };
    const crearPedido = async ({ cliente_id, usuario_id, notas, detalle }) => {
      for (const line of detalle) {
        const p = byId(data.productos, line.producto_id);
        if (!p || Number(p.stock) < Number(line.cantidad)) {
          return { ok: false, error: `Stock insuficiente: ${p?.nombre || "producto"}` };
        }
      }
      bump();
      const total = detalle.reduce((s, d) => s + Number(d.cantidad) * Number(d.precio_unitario), 0);
      setData((prev) => {
        const productos = prev.productos.map((p) => {
          const qty = detalle
            .filter((d) => sameId(d.producto_id, p.id))
            .reduce((s, d) => s + Number(d.cantidad), 0);
          return qty ? { ...p, stock: Number(p.stock) - qty } : p;
        });
        return {
          ...prev,
          productos,
          pedidos: [
            ...(prev.pedidos || []),
            {
              id: nextId(prev.pedidos),
              cliente_id: Number(cliente_id),
              usuario_id,
              fecha: new Date().toISOString(),
              estado: "pendiente",
              total,
              notas: notas || "",
              stock_descontado: true,
              detalle,
            },
          ],
        };
      });
      if (apiMode) {
        sync(() => api("/pedidos", { method: "POST", token, body: { cliente_id, notas, detalle } }));
      }
      return { ok: true };
    };

    const cambiarEstadoPedido = async (id, estado) => {
      bump();
      setData((prev) => {
        const pedido = (prev.pedidos || []).find((p) => sameId(p.id, id));
        if (!pedido) return prev;
        const lineas = Array.isArray(pedido.detalle) ? pedido.detalle : [];
        let productos = prev.productos;
        let stock_descontado = pedido.stock_descontado;
        if (estado === "cancelado" && pedido.stock_descontado) {
          productos = productos.map((p) => {
            const line = lineas.find((d) => sameId(d.producto_id, p.id));
            return line ? { ...p, stock: Number(p.stock) + Number(line.cantidad) } : p;
          });
          stock_descontado = false;
        }
        return {
          ...prev,
          productos,
          pedidos: prev.pedidos.map((p) =>
            sameId(p.id, id) ? { ...p, estado, stock_descontado } : p
          ),
        };
      });
      if (apiMode) {
        sync(() => api(`/pedidos/${id}/estado`, { method: "PATCH", token, body: { estado } }));
      }
    };

    const crearRuta = async ({ vehiculo_id, conductor_id, fecha, pedido_ids, polyline, distancia_km }) => {
      bump();
      const ids = (pedido_ids || []).map(Number);
      setData((prev) => {
        const ruta = {
          id: nextId(prev.rutas),
          vehiculo_id: Number(vehiculo_id),
          conductor_id: Number(conductor_id),
          fecha,
          estado: "en_despacho",
          polyline: Array.isArray(polyline) ? polyline : null,
          distancia_km,
          paradas: ids.map((pedido_id, i) => ({
            pedido_id,
            orden: i + 1,
            estado: "en_despacho",
            entregado_en: null,
          })),
        };
        return {
          ...prev,
          vehiculos: (prev.vehiculos || []).map((v) =>
            sameId(v.id, vehiculo_id) ? { ...v, conductor_id: Number(conductor_id) } : v
          ),
          pedidos: (prev.pedidos || []).map((p) =>
            ids.some((id) => sameId(id, p.id)) ? { ...p, estado: "en_ruta" } : p
          ),
          rutas: [...(prev.rutas || []), ruta],
        };
      });
      if (apiMode) {
        sync(() =>
          api("/rutas", {
            method: "POST",
            token,
            body: { vehiculo_id, conductor_id, fecha, pedido_ids: ids, polyline, distancia_km },
          })
        );
      }
    };

    const agregarPedidosARuta = async (rutaId, pedido_ids) => {
      bump();
      const ids = (pedido_ids || []).map(Number);
      if (!ids.length) return;
      setData((prev) => {
        const rutas = (prev.rutas || []).map((r) => {
          if (!sameId(r.id, rutaId) || rutaCerrada(r.estado)) return r;
          const existentes = (r.paradas || []).map((p) => Number(p.pedido_id));
          const extra = ids.filter((id) => !existentes.includes(id));
          const base = existentes.length;
          return {
            ...r,
            paradas: [
              ...(r.paradas || []),
              ...extra.map((pedido_id, i) => ({
                pedido_id,
                orden: base + i + 1,
                estado: normalizarEstadoRuta(r.estado) === "en_ruta" ? "en_ruta" : "en_despacho",
                entregado_en: null,
              })),
            ],
          };
        });
        return {
          ...prev,
          rutas,
          pedidos: (prev.pedidos || []).map((p) =>
            ids.some((id) => sameId(id, p.id)) ? { ...p, estado: "en_ruta" } : p
          ),
        };
      });
      if (apiMode) {
        sync(() => api(`/rutas/${rutaId}/pedidos`, { method: "POST", token, body: { pedido_ids: ids } }));
      }
    };

    const cambiarEstadoRuta = async (rutaId, estado) => {
      bump();
      const next = normalizarEstadoRuta(estado);
      setData((prev) => {
        const rutas = (prev.rutas || []).map((r) => {
          if (!sameId(r.id, rutaId)) return r;
          const paradas = (r.paradas || []).map((p) => {
            if (normalizarEstadoParada(p.estado) === "entregado") return p;
            if (next === "en_ruta") return { ...p, estado: "en_ruta" };
            if (next === "entregado") {
              return { ...p, estado: "entregado", entregado_en: p.entregado_en || new Date().toISOString() };
            }
            return { ...p, estado: "en_despacho" };
          });
          return { ...r, estado: next, paradas };
        });
        const ruta = rutas.find((r) => sameId(r.id, rutaId));
        const pedidoIds = (ruta?.paradas || []).map((p) => Number(p.pedido_id));
        const pedidos = (prev.pedidos || []).map((p) => {
          if (!pedidoIds.some((id) => sameId(id, p.id))) return p;
          if (next === "entregado") return { ...p, estado: "entregado" };
          return { ...p, estado: "en_ruta" };
        });
        const vehiculos = (prev.vehiculos || []).map((v) => {
          if (!sameId(v.id, ruta?.vehiculo_id)) return v;
          if (next === "en_ruta") return { ...v, estado: "en_ruta", conductor_id: ruta.conductor_id };
          if (next === "entregado") return { ...v, estado: "disponible" };
          return v;
        });
        return { ...prev, rutas, pedidos, vehiculos };
      });
      if (apiMode) {
        sync(() => api(`/rutas/${rutaId}/estado`, { method: "PATCH", token, body: { estado: next } }));
      }
    };

    const marcarParada = async (rutaId, pedidoId, estadoParada) => {
      bump();
      const nextParada = normalizarEstadoParada(estadoParada);
      setData((prev) => {
        const rutas = (prev.rutas || []).map((r) => {
          if (!sameId(r.id, rutaId)) return r;
          const paradas = (r.paradas || []).map((p) =>
            sameId(p.pedido_id, pedidoId)
              ? {
                  ...p,
                  estado: nextParada,
                  entregado_en: nextParada === "entregado" ? new Date().toISOString() : null,
                }
              : p
          );
          const done = paradas.every((p) => normalizarEstadoParada(p.estado) === "entregado");
          const estadoRuta = done
            ? "entregado"
            : paradas.some((p) => normalizarEstadoParada(p.estado) === "en_ruta")
              ? "en_ruta"
              : "en_despacho";
          return { ...r, paradas, estado: estadoRuta };
        });
        const pedidos = (prev.pedidos || []).map((p) =>
          sameId(p.id, pedidoId)
            ? { ...p, estado: nextParada === "entregado" ? "entregado" : "en_ruta" }
            : p
        );
        const ruta = rutas.find((r) => sameId(r.id, rutaId));
        const vehiculos =
          ruta && rutaCerrada(ruta.estado)
            ? (prev.vehiculos || []).map((v) =>
                sameId(v.id, ruta.vehiculo_id) ? { ...v, estado: "disponible" } : v
              )
            : prev.vehiculos;
        return { ...prev, rutas, pedidos, vehiculos };
      });
      if (apiMode) {
        sync(() =>
          api(`/rutas/${rutaId}/paradas`, {
            method: "PATCH",
            token,
            body: { pedido_id: pedidoId, estado: nextParada },
          })
        );
      }
    };

    return {
      ...data,
      usuarios: data.usuarios || [],
      loading,
      error,
      mode: apiMode ? "api" : "local",
      categoriaDe,
      proveedorDe,
      clienteDe,
      productoDe,
      vehiculoDe,
      upsert,
      guardarUsuario,
      registrarCompra,
      agregarStock,
      crearPedido,
      cambiarEstadoPedido,
      crearRuta,
      agregarPedidosARuta,
      cambiarEstadoRuta,
      marcarParada,
      reload,
    };
  }, [data, apiMode, token, loading, error, reload]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore fuera de StoreProvider");
  return ctx;
}
