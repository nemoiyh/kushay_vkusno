import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { ICamera, IX } from "./Icons";

/**
 * Сканер штрихкода с камеры (ZXing). Работает по HTTPS или localhost.
 * Рендерится через Portal в <body> — поверх всех элементов.
 */
export function BarcodeModal({
  onCode,
  onClose,
}: {
  onCode: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const resolvedRef = useRef(false);

  const start = useCallback(async () => {
    if (!videoRef.current) return;
    setError(null);
    const reader = new BrowserMultiFormatReader();
    let cancelled = false;
    try {
      const list = await BrowserMultiFormatReader.listVideoInputDevices();
      if (cancelled) return;
      setDevices(list);
      const chosen = deviceId ?? (list.find((d) => /back|rear|environment/i.test(d.label))?.deviceId ?? list[0]?.deviceId);
      const controls = await reader.decodeFromVideoDevice(chosen, videoRef.current!, (result) => {
        if (result && !resolvedRef.current) {
          resolvedRef.current = true;
          controls.stop();
          onCodeRef.current(result.getText());
        }
      });
      if (cancelled) controls.stop();
      else (start as any)._controls = controls;
    } catch (e) {
      if (!cancelled) setError("Не удалось получить доступ к камере. Проверьте разрешения.");
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  useEffect(() => {
    resolvedRef.current = false;
    const cleanupPromise = start();
    let controls: IScannerControls | undefined;
    cleanupPromise.then((c) => {
      controls = (start as any)._controls;
      return c;
    });
    return () => {
      controls?.stop();
      cleanupPromise.then((c) => c?.());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  return createPortal(
    <div
      className="fixed top-0 left-0 z-[10000] flex h-full w-full items-end justify-center sm:items-center sm:p-6"
      style={{ position: "fixed", inset: 0 }}
    >
      <div className="absolute inset-0 bg-ink/70 animate-fadein" onClick={onClose} />
      <div className="relative w-full sm:max-w-md overflow-hidden rounded-t-2xl sm:rounded-2xl border border-line bg-card animate-rise">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-display text-[15px] font-bold">Сканировать штрихкод</h2>
          <button onClick={onClose} aria-label="Закрыть" className="btn-press rounded-lg border border-line bg-field p-1.5 text-soft hover:text-ink">
            <IX width={18} height={18} />
          </button>
        </div>

        <div className="relative mx-5 aspect-[4/3] overflow-hidden rounded-xl bg-ink">
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
          {/* рамка */}
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="relative h-2/3 w-3/4">
              <div className="absolute left-0 top-0 size-8 border-l-4 border-t-4 border-paperink rounded-tl-lg" />
              <div className="absolute right-0 top-0 size-8 border-r-4 border-t-4 border-paperink rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 size-8 border-b-4 border-l-4 border-paperink rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 size-8 border-b-4 border-r-4 border-paperink rounded-br-lg" />
              <div className="scanline absolute inset-x-2 h-0.5 rounded-full bg-carrot shadow-[0_0_12px_rgba(228,87,46,0.8)]" />
            </div>
          </div>
          {error && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div className="text-paperink">
                <ICamera width={30} height={30} className="mx-auto opacity-70" />
                <p className="mt-2 text-sm font-semibold">{error}</p>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4">
          {devices.length > 1 && (
            <select
              value={deviceId ?? ""}
              onChange={(e) => setDeviceId(e.target.value)}
              className="field mb-3"
            >
              {devices.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Камера ${i + 1}`}</option>
              ))}
            </select>
          )}
          <p className="text-center text-[11px] text-faint">
            Наведите камеру на штрихкод упаковки — продукт найдётся автоматически.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
