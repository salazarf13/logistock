import { useMemo } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useStore } from "../context/StoreContext.jsx";
import { ESTADOS_PARADA, ESTADOS_RUTA, normalizarEstadoParada, normalizarEstadoRuta, rutaCerrada } from "../lib/format.js";
import { sameId } from "../lib/ids.js";
import MapRoute from "../components/MapRoute.jsx";
import Badge from "../components/Badge.jsx";

export default function MiRuta() {
  const { user } = useAuth();
  const store = useStore();
  const ruta =
    store.rutas.find((r) => sameId(r.conductor_id, user.id) && !rutaCerrada(r.estado)) ||
    (user.rol === "administrador" ? store.rutas.find((r) => !rutaCerrada(r.estado)) : null);

  const estadoRuta = normalizarEstadoRuta(ruta?.estado);

  const paradasMapa = useMemo(() => {
    if (!ruta) return [];
    return (ruta.paradas || [])
      .map((p) => {
        const pedido = store.pedidos.find((x) => sameId(x.id, p.pedido_id));
        const cliente = pedido ? store.clienteDe(pedido.cliente_id) : null;
        if (!cliente) return null;
        return { id: p.pedido_id, ...cliente };
      })
      .filter(Boolean);
  }, [ruta, store]);

  if (!ruta) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Mi ruta</h1>
        <p className="mt-2 text-slate-500">No tienes una ruta asignada por ahora.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Ruta #{ruta.id}</h1>
          <p className="text-sm text-slate-500">
            {store.vehiculoDe(ruta.vehiculo_id)?.placa} · {ruta.fecha}
            {ruta.distancia_km ? ` · ${ruta.distancia_km} km` : ""}
          </p>
        </div>
        <Badge value={estadoRuta}>{ESTADOS_RUTA[estadoRuta]}</Badge>
      </div>
      {estadoRuta === "en_despacho" && (
        <button type="button" className="btn-primary" onClick={() => store.cambiarEstadoRuta(ruta.id, "en_ruta")}>
          Salir a ruta
        </button>
      )}
      <MapRoute paradas={paradasMapa} polyline={ruta.polyline} />
      <div className="space-y-3">
        {(ruta.paradas || []).map((p) => {
          const pedido = store.pedidos.find((x) => sameId(x.id, p.pedido_id));
          const cliente = store.clienteDe(pedido?.cliente_id);
          const paradaEstado = normalizarEstadoParada(p.estado);
          return (
            <div key={p.pedido_id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">
                  {p.orden}. {cliente?.nombre}
                </p>
                <p className="text-sm text-slate-500">{cliente?.direccion}</p>
                <p className="text-xs text-slate-400">{cliente?.telefono}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge value={paradaEstado}>{ESTADOS_PARADA[paradaEstado]}</Badge>
                {paradaEstado !== "entregado" && estadoRuta === "en_ruta" && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => store.marcarParada(ruta.id, p.pedido_id, "entregado")}
                  >
                    Marcar entregado
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
