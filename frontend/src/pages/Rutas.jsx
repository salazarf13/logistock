import { useMemo, useState } from "react";
import { useStore } from "../context/StoreContext.jsx";
import { seedUsuarios } from "../data/seed.js";
import { BODEGA } from "../data/seed.js";
import {
  ESTADOS_PARADA,
  ESTADOS_PEDIDO,
  ESTADOS_RUTA,
  normalizarEstadoParada,
  normalizarEstadoRuta,
  quetzales,
  rutaCerrada,
} from "../lib/format.js";
import { sameId } from "../lib/ids.js";
import Badge from "../components/Badge.jsx";
import MapRoute from "../components/MapRoute.jsx";
import Modal from "../components/Modal.jsx";

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function fallbackGeo(paradas) {
  const pts = [{ lat: BODEGA.lat, lng: BODEGA.lng }, ...paradas];
  let km = 0;
  for (let i = 1; i < pts.length; i += 1) km += haversineKm(pts[i - 1], pts[i]);
  return {
    polyline: pts.map((p) => [p.lng, p.lat]),
    distancia_km: +km.toFixed(2),
  };
}

async function trazarOSRM(paradas) {
  if (!paradas.length) return fallbackGeo([]);
  const coords = [`${BODEGA.lng},${BODEGA.lat}`, ...paradas.map((p) => `${p.lng},${p.lat}`)].join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error("OSRM no disponible");
    const json = await res.json();
    const route = json.routes?.[0];
    if (!route) throw new Error("Sin ruta");
    return {
      polyline: route.geometry.coordinates,
      distancia_km: +(route.distance / 1000).toFixed(2),
    };
  } catch {
    return fallbackGeo(paradas);
  } finally {
    clearTimeout(timer);
  }
}

function pedidosOcupados(rutas) {
  const ids = new Set();
  (rutas || []).forEach((r) => {
    if (rutaCerrada(r.estado)) return;
    (r.paradas || []).forEach((p) => ids.add(Number(p.pedido_id)));
  });
  return ids;
}
function ordenarPorCercania(ids, coordDe) {
  const items = ids.map((id) => ({ id, c: coordDe(id) }));
  const validos = items.filter(
    (p) => p.c && Number.isFinite(Number(p.c.lat)) && Number.isFinite(Number(p.c.lng))
  );
  const sinCoord = items.filter((p) => !validos.includes(p));
  let actual = { lat: BODEGA.lat, lng: BODEGA.lng };
  const orden = [];
  while (validos.length) {
    let mejor = 0;
    let dMejor = Infinity;
    validos.forEach((p, i) => {
      const d = haversineKm(actual, { lat: Number(p.c.lat), lng: Number(p.c.lng) });
      if (d < dMejor) {
        dMejor = d;
        mejor = i;
      }
    });
    const [sig] = validos.splice(mejor, 1);
    orden.push(sig.id);
    actual = { lat: Number(sig.c.lat), lng: Number(sig.c.lng) };
  }
  return [...orden, ...sinCoord.map((p) => p.id)];
}

function tiempoEstimadoMin(km, paradas) {
  return Math.round((Number(km) / 30) * 60 + paradas * 10);
}

function formatoTiempo(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
export default function Rutas() {
  const store = useStore();
  const usuarios = store.usuarios?.length ? store.usuarios : seedUsuarios;
  const [open, setOpen] = useState(false);
  const [agregar, setAgregar] = useState(false);
  const [selected, setSelected] = useState(store.rutas[0]?.id || null);
  const [vehiculo_id, setVehiculo] = useState(store.vehiculos[0]?.id || "");
  const [conductor_id, setConductor] = useState("");
  const conductores = usuarios.filter((u) => u.rol === "conductor");
  const [pedidoIds, setPedidoIds] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const ruta = store.rutas.find((r) => sameId(r.id, selected)) || store.rutas[0];
  const estadoRuta = normalizarEstadoRuta(ruta?.estado);
  const ocupados = pedidosOcupados(store.rutas);
  const listos = store.pedidos.filter((p) => p.estado === "listo" && !ocupados.has(Number(p.id)));
  const abiertas = (store.rutas || []).filter((r) => !rutaCerrada(r.estado));
  const vehiculoRuta = (id) => abiertas.find((r) => sameId(r.vehiculo_id, id));
  const conductorRuta = (id) => abiertas.find((r) => sameId(r.conductor_id, id));
    const resumenPedido = (p) =>
    (p.detalle || [])
      .map((d) => `${d.cantidad} × ${store.productoDe(d.producto_id)?.nombre || "Producto"}`)
      .join(", ");
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

  const togglePedido = (id, checked) => {
    const n = Number(id);
    setPedidoIds((prev) => (checked ? [...prev, n] : prev.filter((x) => !sameId(x, n))));
  };

  const crear = async (e) => {
    e.preventDefault();
    if (pedidoIds.length === 0) {
      setError("Selecciona al menos un pedido listo para entregar");
      return;
    }
        if (!vehiculo_id || vehiculoRuta(vehiculo_id)) {
      setError("Selecciona un vehículo disponible");
      return;
    }
    if (!conductor_id || conductorRuta(conductor_id)) {
      setError("Selecciona un conductor disponible");
      return;
    }
        const coordDe = (id) =>
      store.clienteDe(store.pedidos.find((p) => sameId(p.id, id))?.cliente_id);
    const ordenados = ordenarPorCercania(pedidoIds, coordDe);
    const paradas = ordenados
      .map(coordDe)
      .filter((c) => c && Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lng)));
    setLoading(true);
    setError("");
    try {
      const geo = await trazarOSRM(paradas);
      const nuevoId = (store.rutas || []).reduce((max, r) => Math.max(max, Number(r.id) || 0), 0) + 1;
      store.crearRuta({
        vehiculo_id: Number(vehiculo_id),
         conductor_id: Number(conductor_id),
        fecha: new Date().toISOString().slice(0, 10),
        pedido_ids: ordenados.map(Number),
        polyline: geo.polyline,
        distancia_km: geo.distancia_km,
      });
      setSelected(nuevoId);
      setOpen(false);
      setPedidoIds([]);
    } catch (err) {
      setError(err.message || "No se pudo crear la ruta.");
    } finally {
      setLoading(false);
    }
  };

  const sumarPedidos = (e) => {
    e.preventDefault();
    if (!ruta || pedidoIds.length === 0) {
      setError("Selecciona al menos un pedido listo");
      return;
    }
    store.agregarPedidosARuta(ruta.id, pedidoIds);
    setAgregar(false);
    setPedidoIds([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Rutas de despacho</h1>
          <p className="text-sm text-slate-500">
            Agenda pedidos listos (en despacho), sácalos a ruta y márcalos entregados
          </p>
        </div>
        <button
          className="btn-primary"
          type="button"
                     onClick={() => {
            setPedidoIds([]);
            setError("");
            const libre = store.vehiculos.find((v) => !vehiculoRuta(v.id));
            setVehiculo(libre ? String(libre.id) : "");
            const cond = libre?.conductor_id;
            setConductor(cond && !conductorRuta(cond) ? String(cond) : "");
            setOpen(true);
          }}
        >
          Nueva ruta
        </button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="card divide-y">
          {(store.rutas || []).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(r.id)}
              className={`block w-full px-4 py-3 text-left text-sm ${sameId(ruta?.id, r.id) ? "bg-teal-50" : ""}`}
            >
              <p className="font-medium">Ruta #{r.id}</p>
              <p className="text-xs text-slate-500">
                {store.vehiculoDe(r.vehiculo_id)?.placa} · {r.fecha}
              </p>
              <Badge value={normalizarEstadoRuta(r.estado)}>
                {ESTADOS_RUTA[normalizarEstadoRuta(r.estado)]}
              </Badge>
            </button>
          ))}
        </div>
        {ruta && (
          <div className="space-y-3">
            <MapRoute paradas={paradasMapa} polyline={ruta.polyline} />
            <div className="card space-y-3 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p>
                  Distancia: <strong>{ruta.distancia_km ? `${ruta.distancia_km} km` : "sin calcular"}</strong>
                  {ruta.distancia_km ? (
                    <>
                      {" "}
                      · Tiempo estimado:{" "}
                      <strong>
                        {formatoTiempo(tiempoEstimadoMin(ruta.distancia_km, (ruta.paradas || []).length))}
                      </strong>
                      <span className="block text-xs text-slate-400">
                        Estimado con 30 km/h de promedio y 10 min por parada, sin contar el regreso.
                      </span>
                    </>
                  ) : null}
                </p>
                <Badge value={estadoRuta}>{ESTADOS_RUTA[estadoRuta]}</Badge>
              </div>
              <p className="text-xs text-slate-500">
                {estadoRuta === "en_despacho" && "La ruta se está agendando en bodega. Los pedidos ya están en entrega."}
                {estadoRuta === "en_ruta" && "La unidad va en camino. Marca cada parada cuando se entregue."}
                {estadoRuta === "entregado" && "Todos los pedidos de esta ruta ya fueron entregados."}
              </p>
              <div className="flex flex-wrap gap-2">
                {estadoRuta === "en_despacho" && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => store.cambiarEstadoRuta(ruta.id, "en_ruta")}
                  >
                    Salir a ruta
                  </button>
                )}
                {!rutaCerrada(estadoRuta) && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setPedidoIds([]);
                      setError("");
                      setAgregar(true);
                    }}
                  >
                    Agregar pedidos listos
                  </button>
                )}
              </div>
              <ol className="list-decimal space-y-3 pl-5">
                {(ruta.paradas || []).map((p) => {
                  const pedido = store.pedidos.find((x) => sameId(x.id, p.pedido_id));
                  const paradaEstado = normalizarEstadoParada(p.estado);
                  return (
                    <li key={p.pedido_id} className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        {store.clienteDe(pedido?.cliente_id)?.nombre}{" "}
                        <span className="text-xs text-slate-400">
                          · pedido #{p.pedido_id} · {ESTADOS_PEDIDO[pedido?.estado] || pedido?.estado}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
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
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        )}
      </div>

      {open && (
        <Modal title="Nueva ruta de despacho" onClose={() => setOpen(false)}>
          <form onSubmit={crear} className="space-y-3">
            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            <p className="text-sm text-slate-500">
              Elige pedidos <strong>listos para entregar</strong>. Quedarán en entrega y la ruta iniciará en despacho.
            </p>
                        <p className="text-xs font-medium text-slate-500">Vehículo</p>
                       <p className="text-xs font-medium text-slate-500">Vehículo</p>
            <select
              className="input"
              value={vehiculo_id}
              onChange={(e) => {
                setVehiculo(e.target.value);
                const v = store.vehiculoDe(Number(e.target.value));
                if (v?.conductor_id && !conductorRuta(v.conductor_id)) {
                  setConductor(String(v.conductor_id));
                }
              }}
            >
              <option value="">Selecciona un vehículo</option>
              {store.vehiculos.map((v) => {
                const ocupado = vehiculoRuta(v.id);
                return (
                  <option
                    key={v.id}
                    value={v.id}
                    disabled={!!ocupado}
                    className={ocupado ? "text-rose-600" : ""}
                  >
                    {v.placa}
                    {ocupado ? ` — ya en ruta (Ruta #${ocupado.id})` : ""}
                  </option>
                );
              })}
            </select>
            {store.vehiculos.some((v) => vehiculoRuta(v.id)) && (
              <p className="text-xs text-rose-600">
                En ruta:{" "}
                {store.vehiculos
                  .filter((v) => vehiculoRuta(v.id))
                  .map((v) => `${v.placa} (Ruta #${vehiculoRuta(v.id).id})`)
                  .join(", ")}
              </p>
            )}

            <p className="text-xs font-medium text-slate-500">Conductor</p>
            <select className="input" value={conductor_id} onChange={(e) => setConductor(e.target.value)}>
              <option value="">Selecciona un conductor</option>
              {conductores.map((c) => {
                const ocupado = conductorRuta(c.id);
                return (
                  <option
                    key={c.id}
                    value={c.id}
                    disabled={!!ocupado}
                    className={ocupado ? "text-rose-600" : ""}
                  >
                    {c.nombre}
                    {ocupado ? ` — ya en ruta (Ruta #${ocupado.id})` : ""}
                  </option>
                );
              })}
            </select>
            {conductores.some((c) => conductorRuta(c.id)) && (
              <p className="text-xs text-rose-600">
                En ruta:{" "}
                {conductores
                  .filter((c) => conductorRuta(c.id))
                  .map((c) => `${c.nombre} (Ruta #${conductorRuta(c.id).id})`)
                  .join(", ")}
              </p>
            )}
            <p className="text-xs font-medium text-slate-500">Pedidos listos para entregar</p>
            {listos.length === 0 && (
              <p className="text-sm text-slate-500">
                No hay pedidos listos libres. En Pedidos usa “Marcar listo” y luego agrégalos aquí.
              </p>
            )}
                       {listos.map((p) => (
              <label key={p.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={pedidoIds.some((id) => sameId(id, p.id))}
                  onChange={(e) => togglePedido(p.id, e.target.checked)}
                />
                <span>
                  <strong>Pedido #{p.id}</strong> · {quetzales(p.total)}{" "}
                  <Badge value="listo">Listo</Badge>
                  <span className="block text-xs text-slate-500">{resumenPedido(p)}</span>
                </span>
              </label>
            ))}
            <button className="btn-primary w-full" disabled={loading || listos.length === 0} type="submit">
              {loading ? "Generando ruta…" : "Crear ruta y poner en entrega"}
            </button>
          </form>
        </Modal>
      )}

      {agregar && ruta && (
        <Modal title={`Agregar pedidos a ruta #${ruta.id}`} onClose={() => setAgregar(false)}>
          <form onSubmit={sumarPedidos} className="space-y-3">
            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            {listos.length === 0 && <p className="text-sm text-slate-500">No hay más pedidos listos para agregar.</p>}
                       {listos.map((p) => (
              <label key={p.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={pedidoIds.some((id) => sameId(id, p.id))}
                  onChange={(e) => togglePedido(p.id, e.target.checked)}
                />
                <span>
                  <strong>Pedido #{p.id}</strong> · {quetzales(p.total)}
                  <span className="block text-xs text-slate-500">{resumenPedido(p)}</span>
                </span>
              </label>
            ))}
            <button className="btn-primary w-full" disabled={listos.length === 0} type="submit">
              Agregar a la ruta
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
