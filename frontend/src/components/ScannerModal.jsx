import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import Modal from "./Modal.jsx";

export default function ScannerModal({ onClose, onScan }) {
  const [manual, setManual] = useState("");
  const [error, setError] = useState("");
  const contenedor = useRef(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    const host = contenedor.current;
    if (!host) return;

    const el = document.createElement("div");
    el.id = "qr-" + Math.random().toString(36).slice(2);
    host.appendChild(el);

    const scanner = new Html5Qrcode(el.id, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
      ],
      verbose: false,
    });

    let handled = false;
    let cancelado = false;

    const arranque = scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (w, h) => ({
            width: Math.min(300, Math.floor(w * 0.9)),
            height: Math.min(150, Math.floor(h * 0.6)),
          }),
        },
        (decoded) => {
          if (handled) return;
          handled = true;
          onScanRef.current(decoded);
        }
      )
      .then(() => true)
      .catch((err) => {
        if (!cancelado) {
          setError(
            `No se pudo abrir la cámara (${err?.message || String(err)}). Puedes escribir el código a mano.`
          );
        }
        return false;
      });

    return () => {
      cancelado = true;
      arranque.then(async (ok) => {
        try {
          if (ok) {
            await scanner.stop();
            scanner.clear();
          }
        } catch {
          // ignorar
        }
        el.remove();
      });
    };
  }, []);

  return (
    <Modal title="Escanear código de barras" onClose={onClose}>
      <div
        ref={contenedor}
        className="min-h-[200px] overflow-hidden rounded-xl bg-slate-900"
      />

      {error && <p className="mt-3 text-sm text-amber-700">{error}</p>}

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) onScanRef.current(manual.trim());
        }}
      >
        <input
          className="input"
          placeholder="O escribe el código"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <button className="btn-primary" type="submit">
          Buscar
        </button>
      </form>
    </Modal>
  );
}