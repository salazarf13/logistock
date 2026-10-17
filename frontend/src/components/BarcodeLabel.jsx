import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export default function BarcodeLabel({ value, name, sku }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    ref.current.innerHTML = "";
    JsBarcode(ref.current, String(value), {
      format: "CODE128",
      displayValue: true,
      fontSize: 14,
      height: 56,
      margin: 8,
      lineColor: "#0f172a",
    });
  }, [value]);

  return (
    <div className="inline-block rounded-lg border border-slate-200 bg-white p-3 text-center print:border-black">
      <p className="text-xs font-semibold text-slate-800">{name}</p>
      {sku && <p className="text-[10px] text-slate-500">{sku}</p>}
      <svg ref={ref} />
    </div>
  );
}
