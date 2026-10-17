import { normalizarEstadoParada, normalizarEstadoRuta } from "./format.js";

export const sameId = (a, b) => Number(a) === Number(b);

export function normalizeStore(raw) {
  const data = raw || {};
  const num = (v) => (v == null || v === "" ? v : Number(v));
  return {
    ...data,
    categorias: data.categorias || [],
    proveedores: data.proveedores || [],
    clientes: data.clientes || [],
    productos: (data.productos || []).map((p) => ({
      ...p,
      id: num(p.id),
      stock: num(p.stock) || 0,
      stock_minimo: num(p.stock_minimo) || 0,
      precio_venta: num(p.precio_venta) || 0,
      precio_compra: num(p.precio_compra) || 0,
    })),
    compras: data.compras || [],
    pedidos: (data.pedidos || []).map((p) => ({
      ...p,
      id: num(p.id),
      cliente_id: num(p.cliente_id),
      detalle: Array.isArray(p.detalle) ? p.detalle : [],
    })),
    vehiculos: (data.vehiculos || []).map((v) => ({ ...v, id: num(v.id) })),
    rutas: (data.rutas || []).map((r) => ({
      ...r,
      id: num(r.id),
      estado: normalizarEstadoRuta(r.estado),
      paradas: (Array.isArray(r.paradas) ? r.paradas : []).map((p) => ({
        ...p,
        estado: normalizarEstadoParada(p.estado),
      })),
      polyline: Array.isArray(r.polyline) ? r.polyline : null,
    })),
    usuarios: data.usuarios || [],
  };
}
