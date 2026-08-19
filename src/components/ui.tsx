import { Component, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { ToastItem } from "../types";
import { IAlert, ICheck, IInfo, IX } from "./Icons";

/* ---------- защита от «белого экрана» ---------- */
export class ErrorBoundary extends Component<
  { children: ReactNode; onReset?: () => void },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Ошибка интерфейса:", error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="card anim-in mx-auto mt-10 max-w-md p-6 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-dangerwash text-danger">
            <IAlert width={22} height={22} />
          </div>
          <h2 className="mt-3 font-display text-base font-extrabold">Что-то пошло не так</h2>
          <p className="mt-1.5 text-sm text-soft">
            Экран не смог отобразиться. Данные в безопасности — попробуйте ещё раз.
          </p>
          <p className="mt-2 break-all rounded-lg bg-paper px-3 py-2 text-left text-[11px] text-faint">
            {this.state.error.message}
          </p>
          <button
            onClick={() => {
              this.setState({ error: null });
              this.props.onReset?.();
            }}
            className="btn-press mt-4 rounded-xl bg-leaf px-5 py-2.5 text-sm font-bold text-paperink"
          >
            Попробовать снова
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ---------- плавное число ---------- */
export function useAnimatedNumber(value: number, duration = 550) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}

export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const v = useAnimatedNumber(value);
  return <span className={className}>{Math.round(v).toLocaleString("ru-RU")}</span>;
}

/* ---------- кольцо прогресса ---------- */
export function Ring({
  size = 176,
  stroke = 15,
  value,
  max,
  color,
  children,
}: {
  size?: number;
  stroke?: number;
  value: number;
  max: number;
  color: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const frac = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-linesoft)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
          style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1), stroke 0.3s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/* ---------- полоса макроса ---------- */
export function MacroBar({
  label,
  value,
  goal,
  color,
  wash,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
  wash: string;
}) {
  const frac = goal > 0 ? Math.min(1, value / goal) : 0;
  const over = goal > 0 && value > goal;
  const pct = goal > 0 ? Math.round((value / goal) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold" style={{ color }}>{label}</span>
        <span className="text-xs text-soft tabular-nums">
          <b className="text-ink">{Math.round(value)}</b> / {goal} г · {pct}%
        </span>
      </div>
      <div className="mt-1 h-2.5 rounded-full overflow-hidden" style={{ background: wash }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${frac * 100}%`,
            background: over ? "var(--color-carrot)" : color,
            transition: "width 0.6s cubic-bezier(0.22,1,0.36,1), background 0.3s",
          }}
        />
      </div>
    </div>
  );
}

/* ---------- модальное окно ---------- */
export function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  /*
   * Рендерим через Portal прямо в <body>: это гарантирует, что position: fixed
   * считается от окна браузера, а не от ближайшего предка с transform/filter
   * (которые создают новый контекст наложения и «ломают» фиксированное позиционирование).
   * Очень высокий z-index ставит окно поверх шапки, сайдбара, мобильной навигации и карточек.
   */
  return createPortal(
    <div
      className="fixed top-0 left-0 z-[10000] flex h-full w-full items-end justify-center sm:items-center sm:p-6"
      style={{ position: "fixed", inset: 0 }}
    >
      <div className="absolute inset-0 bg-ink/45 animate-fadein" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full sm:max-w-xl max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-line bg-card hard-sm animate-rise"
        style={{ boxShadow: "0 24px 60px rgba(23,40,30,0.28)" }}
      >
        {/* «ручка» нижней шторки — как в нативных приложениях iOS */}
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-ink/15 sm:hidden" />
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-linesoft bg-card/95 backdrop-blur px-5 py-3.5 sm:px-6 sm:py-4">
          <div>
            <h2 className="font-display text-[15px] font-bold leading-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-soft">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="btn-press shrink-0 rounded-lg border border-line bg-field p-1.5 text-soft hover:text-ink"
          >
            <IX width={18} height={18} />
          </button>
        </div>
        <div className="px-5 pt-4 pb-[max(env(safe-area-inset-bottom),24px)] sm:px-6 sm:py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/* ---------- тосты ---------- */
export function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-20 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-in pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-xl border border-line bg-ink px-4 py-3 text-[13px] font-medium text-paperink hard-sm"
        >
          <span
            className="grid size-6 shrink-0 place-items-center rounded-full"
            style={{
              background:
                t.kind === "error"
                  ? "var(--color-danger)"
                  : t.kind === "info"
                    ? "var(--color-water)"
                    : "var(--color-leaf)",
            }}
          >
            {t.kind === "error" ? (
              <IAlert width={13} height={13} />
            ) : t.kind === "info" ? (
              <IInfo width={13} height={13} />
            ) : (
              <ICheck width={13} height={13} />
            )}
          </span>
          <span className="flex-1">{t.text}</span>
          <button onClick={() => onDismiss(t.id)} aria-label="Скрыть" className="opacity-60 hover:opacity-100">
            <IX width={15} height={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
