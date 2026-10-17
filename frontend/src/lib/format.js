export function quetzales(n) {
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
  }).format(Number(n) || 0);
}

export function fechaCorta(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-GT", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export const ROLES = {
  administrador: "Administrador",
  bodeguero: "Bodeguero",
  conductor: "Conductor",
};

export const ESTADOS_PEDIDO = {
  pendiente: "Pendiente",
  en_picking: "En picking",
  listo: "Listo para entregar",
  en_ruta: "En entrega",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const ESTADOS_RUTA = {
  en_despacho: "En despacho",
  en_ruta: "En ruta",
  entregado: "Entregado",
  planificada: "En despacho",
  en_curso: "En ruta",
  completada: "Entregado",
};

export const ESTADOS_PARADA = {
  en_despacho: "En despacho",
  en_ruta: "En ruta",
  entregado: "Entregado",
  pendiente: "En despacho",
  fallido: "No entregado",
};

export function normalizarEstadoRuta(estado) {
  if (estado === "planificada") return "en_despacho";
  if (estado === "en_curso") return "en_ruta";
  if (estado === "completada") return "entregado";
  return estado || "en_despacho";
}

export function normalizarEstadoParada(estado) {
  if (estado === "pendiente") return "en_despacho";
  return estado || "en_despacho";
}

export function rutaCerrada(estado) {
  const e = normalizarEstadoRuta(estado);
  return e === "entregado";
}
