import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { BODEGA } from "../data/seed.js";

const bodegaIcon = L.divIcon({
  className: "",
  html: `<div style="background:#0f172a;color:#fff;border:2px solid #fff;border-radius:8px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;box-shadow:0 1px 5px rgba(0,0,0,.45)">B</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const numeroIcon = (n) =>
  L.divIcon({
    className: "",
    html: `<div style="background:#0f766e;color:#fff;border:2px solid #fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;box-shadow:0 1px 5px rgba(0,0,0,.45)">${n}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

function AjustarVista({ puntos, clave }) {
  const map = useMap();
  useEffect(() => {
    if (puntos.length > 1) {
      map.fitBounds(L.latLngBounds(puntos), { padding: [40, 40], maxZoom: 17 });
    } else if (puntos.length === 1) {
      map.setView(puntos[0], 15);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, clave]);
  return null;
}

export default function MapRoute({ paradas = [], polyline }) {
  const center = [BODEGA.lat, BODEGA.lng];
  const stops = (paradas || []).filter(
    (p) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng))
  );
  const line =
    Array.isArray(polyline) && polyline.length > 0
      ? polyline
          .filter((pt) => Array.isArray(pt) && pt.length >= 2)
          .map(([lng, lat]) => [lat, lng])
      : [[BODEGA.lat, BODEGA.lng], ...stops.map((p) => [Number(p.lat), Number(p.lng)])];
  const mapKey = `m-${stops.map((p) => p.id).join("-")}-${line.length}`;
  const puntos = [center, ...stops.map((p) => [Number(p.lat), Number(p.lng)]), ...line];

  return (
    <div className="relative z-0 h-80 overflow-hidden rounded-xl border border-slate-200">
      <MapContainer key={mapKey} center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AjustarVista puntos={puntos} clave={mapKey} />
        {line.length > 1 && <Polyline positions={line} color="#0f766e" weight={5} opacity={0.85} />}
        <Marker position={center} icon={bodegaIcon}>
          <Popup>{BODEGA.nombre}</Popup>
        </Marker>
        {stops.map((p, i) => (
          <Marker key={p.id} position={[Number(p.lat), Number(p.lng)]} icon={numeroIcon(i + 1)}>
            <Popup>
              <strong>
                {i + 1}. {p.nombre}
              </strong>
              <br />
              {p.direccion}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}