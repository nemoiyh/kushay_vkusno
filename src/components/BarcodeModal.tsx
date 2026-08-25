import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { ICamera, IX } from "./Icons";

export function BarcodeModal({
  onCode,
  onClose,
}: {
  onCode: (code: string) => void;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const resolvedRef = useRef(false);
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const start = useCallback(async () => {
    let cancelled = false;
    setError(null);
    setStarting(true);
    try {
      const devs = await BrowserMultiFormatReader.listVideoInputDevices();
      if (cancelled) return;
      setDevices(devs);
      const chosen =
        deviceId ??
        devs.find((d) => /back|environment|rear|задн/i.test(d.label))?.deviceId ??
        devs[0]?.deviceId;
      if (!chosen) {
        setError("Камера не найдена на этом устройстве");
        setStarting(false);
        return;
      }
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(chosen, videoRef.current!, (result) => {
        if (result && !resolvedRef.current) {
          resolvedRef.current = true;
          controls.stop();
          onCodeRef.current(result.getText());
        }
      });
      if (cancelled) {
        controls.stop();
        return;
      }
      controlsRef.current?.stop();
      controlsRef.current = controls;
      setStarting(false);
    } catch (e) {
      if (cancelled) return;
      const name = (e as DOMException)?.name;
      setError(
        name === "NotAllowedError" || name === "PermissionDeniedError"
          ? "Нет доступа к камере. Разрешите доступ в настройках браузера и попробуйте ещё раз."
          : name === "NotFoundError"
            ? "Камера не найдена на этом устройстве"
            : "Не удалось запустить камеру",
      );
      setStarting(false);
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    start().then((c) => (cleanup = c));
    return () => {
      cleanup?.();
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [start]);

  return createPortal(
    <div
      className="fixed top-0 left-0 z-[10000] flex h-full w-full items-end justify-center sm:items-center sm:p-6"
      style={{ position: "fixed", inset: 0 }}
    >
      <div className="absolute inset-0 bg-ink/70 animate-fadein" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full overflow-hidden rounded-t-2xl border border-line bg-ink text-paperink sm:max-w-md sm:rounded-2xl animate-rise"
      >
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-display text-[15px] font-bold">Сканирование штрихкода</h2>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="btn-press rounded-lg border border-paperink/25 p-1.5 text-paperink/80 hover:text-paperink"
          >
            <IX width={18} height={18} />
          </button>
        </div>

        <div className="relative mx-5 overflow-hidden rounded-xl bg-black" style={{ height: 280 }}>
          <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />

          {/* рамка сканера */}
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="relative h-36 w-64 max-w-[80%]">
              {(["top-0 left-0 border-t-4 border-l-4", "top-0 right-0 border-t-4 border-r-4", "bottom-0 left-0 border-b-4 border-l-4", "bottom-0 right-0 border-b-4 border-r-4"] as const).map(
                (cls) => (
                  <span key={cls} className={`absolute size-8 rounded-sm border-[#7dd9a5] ${cls}`} />
                ),
              )}
              <span className="scanline absolute inset-x-2 h-0.5 rounded-full bg-[#7dd9a5] shadow-[0_0_12px_2px_rgba(125,217,165,0.8)]" />
            </div>
          </div>

          {starting && !error && (
            <div className="absolute inset-0 grid place-items-center bg-black/60">
              <span className="flex items-center gap-2 text-sm font-semibold text-paperink/90">
                <ICamera width={18} height={18} /> Запуск камеры…
              </span>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 grid place-items-center bg-black/75 p-6 text-center">
              <p className="text-sm font-semibold leading-relaxed text-paperink/90">{error}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4">
          <p className="text-xs leading-relaxed text-paperink/70">
            Поднесите штрихкод упаковки (EAN-13) к камере на расстояние 10–15 см. Если товар есть в
            базе — он подставится автоматически, если нет — проверим Open Food Facts.
          </p>
          {devices.length > 1 && (
            <select
              className="mt-3 w-full rounded-lg border border-paperink/25 bg-transparent px-3 py-2 text-xs font-semibold text-paperink outline-none"
              value={deviceId ?? ""}
              onChange={(e) => {
                resolvedRef.current = false;
                setDeviceId(e.target.value || undefined);
              }}
            >
              <option value="" className="text-ink">Камера по умолчанию</option>
              {devices.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId} className="text-ink">
                  {d.label || `Камера ${i + 1}`}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
