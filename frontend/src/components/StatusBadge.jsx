const styles = {
  pendiente: "bg-amber-50 text-amber-800",
  en_picking: "bg-sky-50 text-sky-800",
  listo: "bg-indigo-50 text-indigo-800",
  en_ruta: "bg-teal-50 text-teal-800",
  entregado: "bg-emerald-50 text-emerald-800",
  cancelado: "bg-rose-50 text-rose-800",
  planificada: "bg-slate-100 text-slate-700",
  en_despacho: "bg-amber-50 text-amber-800",
  en_curso: "bg-teal-50 text-teal-800",
  completada: "bg-emerald-50 text-emerald-800",
  disponible: "bg-emerald-50 text-emerald-800",
  mantenimiento: "bg-rose-50 text-rose-800",
  bajo: "bg-rose-50 text-rose-800",
  ok: "bg-emerald-50 text-emerald-800",
};

export default function StatusBadge({ value, label }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[value] || "bg-slate-100"}`}>
      {label || value}
    </span>
  );
}
