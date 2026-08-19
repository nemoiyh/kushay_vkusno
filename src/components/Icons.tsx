import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = (props: P): P => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  ...props,
});

export const IPlus = (p: P) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);
export const IMinus = (p: P) => (
  <svg {...base(p)}><path d="M5 12h14" /></svg>
);
export const IChevL = (p: P) => (
  <svg {...base(p)}><path d="m15 18-6-6 6-6" /></svg>
);
export const IChevR = (p: P) => (
  <svg {...base(p)}><path d="m9 18 6-6-6-6" /></svg>
);
export const ISearch = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
);
export const ITrash = (p: P) => (
  <svg {...base(p)}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
);
export const IPencil = (p: P) => (
  <svg {...base(p)}><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
);
export const IX = (p: P) => (
  <svg {...base(p)}><path d="M18 6 6 18M6 6l12 12" /></svg>
);
export const IDrop = (p: P) => (
  <svg {...base(p)}><path d="M12 2.7s6.5 7 6.5 11.3a6.5 6.5 0 0 1-13 0C5.5 9.7 12 2.7 12 2.7Z" /></svg>
);
export const IFlame = (p: P) => (
  <svg {...base(p)}><path d="M12 22c4.4 0 7.5-2.9 7.5-7 0-3-2-5.5-3.7-7.2-.4 1.3-1.2 2.3-2.3 2.7.4-2.8-1-6.3-3.5-7.5.2 3-1.4 4.6-2.8 6.2A7.4 7.4 0 0 0 4.5 15c0 4.1 3.1 7 7.5 7Z" /></svg>
);
export const IBook = (p: P) => (
  <svg {...base(p)}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15A2.5 2.5 0 0 0 6.5 22H20v-2.5" /></svg>
);
export const IApple = (p: P) => (
  <svg {...base(p)}><path d="M12 7c1.5-2 4-2.5 6-1 2.6 2 2.4 7.5-.5 11.5-1.6 2.2-3.2 3-4.5 2-.5-.4-1.5-.4-2 0-1.3 1-2.9.2-4.5-2C3.6 13.5 3.4 8 6 6c2-1.5 4.5-1 6 1Z" /><path d="M12 7c0-2 1-3.5 3-4" /></svg>
);
export const IChart = (p: P) => (
  <svg {...base(p)}><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="6" rx="1" /><rect x="12" y="8" width="3" height="10" rx="1" /><rect x="17" y="5" width="3" height="13" rx="1" /></svg>
);
export const ITarget = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>
);
export const IDownload = (p: P) => (
  <svg {...base(p)}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></svg>
);
export const IAlert = (p: P) => (
  <svg {...base(p)}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg>
);
export const ICheck = (p: P) => (
  <svg {...base(p)}><path d="M20 6 9 17l-5-5" /></svg>
);
export const IInfo = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></svg>
);
export const IScale = (p: P) => (
  <svg {...base(p)}><path d="M12 3v3M7 21h10a2 2 0 0 0 2-2v-3a9 9 0 1 0-14 0v3a2 2 0 0 0 2 2Z" /><path d="m12 6-7 10h14Z" /></svg>
);
export const ITrendDown = (p: P) => (
  <svg {...base(p)}><path d="m22 17-7.5-7.5-4 4L2 5" /><path d="M22 11v6h-6" /></svg>
);
export const ITrendUp = (p: P) => (
  <svg {...base(p)}><path d="m22 7-7.5 7.5-4-4L2 19" /><path d="M22 13v-6h-6" /></svg>
);
export const IChevDown = (p: P) => (
  <svg {...base(p)}><path d="m6 9 6 6 6-6" /></svg>
);
export const IBarcode = (p: P) => (
  <svg {...base(p)}><path d="M4 6v12M8 6v12M11 6v12M15 6v12M20 6v12" /><path d="M17.5 6v12" strokeWidth={3} /></svg>
);
export const ICamera = (p: P) => (
  <svg {...base(p)}><path d="M14.5 4h-5L7.8 6.2A1 1 0 0 1 7 6.6H4a2 2 0 0 0-2 2V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8.6a2 2 0 0 0-2-2h-3a1 1 0 0 1-.8-.4L14.5 4Z" /><circle cx="12" cy="13" r="3.5" /></svg>
);
export const IStore = (p: P) => (
  <svg {...base(p)}><path d="M4 10v10h16V10" /><path d="M3 6.5 4.5 3h15L21 6.5a2.5 2.5 0 0 1-4.5 1.4A2.5 2.5 0 0 1 12 7.9a2.5 2.5 0 0 1-4.5 0A2.5 2.5 0 0 1 3 6.5Z" /><path d="M9 20v-5h6v5" /></svg>
);
export const IClock = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const IActivity = (p: P) => (
  <svg {...base(p)}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
);
export const IFoot = (p: P) => (
  <svg {...base(p)}><path d="M8 3.5c1.9 0 3 2.8 3 5.7 0 2.6-1.1 4.3-2.9 4.3S5.2 11.8 5.2 9.2c0-2.9 1-5.7 2.8-5.7Z" /><path d="M8.1 16.5c1 0 1.8 1 1.8 2.2 0 1.3-.8 2.3-1.8 2.3s-1.8-1-1.8-2.3c0-1.2.8-2.2 1.8-2.2Z" /><path d="M16.5 2.5c1.9 0 3 2.8 3 5.7 0 2.6-1.1 4.3-2.9 4.3s-2.9-1.7-2.9-4.3c0-2.9 1-5.7 2.8-5.7Z" /><path d="M16.4 15.5c1 0 1.8 1 1.8 2.2 0 1.3-.8 2.3-1.8 2.3s-1.8-1-1.8-2.3c0-1.2.8-2.2 1.8-2.2Z" /></svg>
);
export const IMoon = (p: P) => (
  <svg {...base(p)}><path d="M12 3a6.4 6.4 0 0 0 8.6 8.6A9 9 0 1 1 12 3Z" /></svg>
);
export const IRuler = (p: P) => (
  <svg {...base(p)}><path d="M21.3 8.7 15.3 2.7a1 1 0 0 0-1.4 0L2.7 13.9a1 1 0 0 0 0 1.4l6 6a1 1 0 0 0 1.4 0L21.3 10.1a1 1 0 0 0 0-1.4Z" /><path d="m7.5 10.5 2 2" /><path d="m10.5 7.5 2 2" /><path d="m13.5 4.5 2 2" /></svg>
);
export const IGlobe = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>
);
export const IStar = (p: P) => (
  <svg {...base(p)}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
);
export const IChefHat = (p: P) => (
  <svg {...base(p)}><path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z" /><path d="M6 17h12" /></svg>
);
export const ISettings = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.08A1.7 1.7 0 0 0 10 4.09V4a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56h.08a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.03Z" /></svg>
);

/** Фирменный знак: тарелка с листом */
export const LogoMark = ({ size = 34 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
    <rect width="100" height="100" rx="24" fill="var(--color-leaf)" />
    <circle cx="50" cy="50" r="27" fill="none" stroke="var(--color-paperink)" strokeWidth="7" />
    <path d="M50 36c9 4 12 13 6 22-8-2-13-11-6-22z" fill="var(--color-paperink)" />
    <path d="M50 44v16" stroke="var(--color-leaf)" strokeWidth="3" strokeLinecap="round" />
  </svg>
);
