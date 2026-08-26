import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { width?: number; height?: number };

const base = ({ width = 16, height = 16, ...rest }: P) => ({
  width,
  height,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...rest,
});

export const IBook = (p: P) => (
  <svg {...base(p)}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
);
export const IApple = (p: P) => (
  <svg {...base(p)}><path d="M12 20.9c-4 0-7-3.2-7-7.4 0-3.5 2.3-6.3 5-6.3 1 0 1.6.4 2 .4s1.2-.4 2.3-.4c2.5 0 4.7 2.6 4.7 6.3 0 4.2-3 7.4-7 7.4z" /><path d="M12 7.2c-.5-1.7.5-3.7 2-4.7" /></svg>
);
export const IChart = (p: P) => (
  <svg {...base(p)}><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>
);
export const ISettings = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.08A1.7 1.7 0 0 0 10 4.09V4a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56h.08a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.03z" /></svg>
);
export const IPlus = (p: P) => (
  <svg {...base(p)}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
export const IX = (p: P) => (
  <svg {...base(p)}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
export const ICheck = (p: P) => (
  <svg {...base(p)}><polyline points="20 6 9 17 4 12" /></svg>
);
export const ISearch = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
);
export const ITrash = (p: P) => (
  <svg {...base(p)}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
);
export const IPencil = (p: P) => (
  <svg {...base(p)}><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
);
export const IChevL = (p: P) => (
  <svg {...base(p)}><polyline points="15 18 9 12 15 6" /></svg>
);
export const IChevR = (p: P) => (
  <svg {...base(p)}><polyline points="9 18 15 12 9 6" /></svg>
);
export const IChevDown = (p: P) => (
  <svg {...base(p)}><polyline points="6 9 12 15 18 9" /></svg>
);
export const IFlame = (p: P) => (
  <svg {...base(p)}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
);
export const IDrop = (p: P & { fill?: string }) => (
  <svg {...base(p)}><path d="M12 2.7s6 6.3 6 10.8a6 6 0 0 1-12 0C6 9 12 2.7 12 2.7z" fill={p.fill ?? "none"} /></svg>
);
export const IClock = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const IScale = (p: P) => (
  <svg {...base(p)}><path d="M12 3v3" /><path d="M5 6h14l1 4H4l1-4z" /><path d="M4 10a8 8 0 0 0 16 0" /><path d="M12 13v4" /></svg>
);
export const IRuler = (p: P) => (
  <svg {...base(p)}><path d="M21.3 8.7 15.3 2.7a1 1 0 0 0-1.4 0l-11.2 11.2a1 1 0 0 0 0 1.4l6 6a1 1 0 0 0 1.4 0l11.2-11.2a1 1 0 0 0 0-1.4z" /><path d="m7.5 10.5 2 2M10.5 7.5l2 2M13.5 4.5l2 2" /></svg>
);
export const IActivity = (p: P) => (
  <svg {...base(p)}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
);
export const IFoot = (p: P) => (
  <svg {...base(p)}><path d="M4 16v-2.4a8 8 0 0 1 16 0V16" /><path d="M4 16h16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2z" /><path d="M9 12h.01M15 12h.01" /></svg>
);
export const IMoon = (p: P) => (
  <svg {...base(p)}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" /></svg>
);
export const ITarget = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
);
export const IDownload = (p: P) => (
  <svg {...base(p)}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
);
export const IAlert = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
);
export const IInfo = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
);
export const ITrendUp = (p: P) => (
  <svg {...base(p)}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
);
export const ITrendDown = (p: P) => (
  <svg {...base(p)}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></svg>
);
export const IBarcode = (p: P) => (
  <svg {...base(p)}><path d="M4 6v12M8 6v12M11 6v12M15 6v12M20 6v12" /><path d="M17.5 6v12" strokeWidth={3} /></svg>
);
export const ICamera = (p: P) => (
  <svg {...base(p)}><path d="M14.5 4h-5L7.8 6.2A1 1 0 0 1 7 6.6H4a2 2 0 0 0-2 2V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8.6a2 2 0 0 0-2-2h-3a1 1 0 0 1-.8-.4L14.5 4z" /><circle cx="12" cy="13" r="3.5" /></svg>
);
export const IStore = (p: P) => (
  <svg {...base(p)}><path d="M4 10v10h16V10" /><path d="M3 6.5 4.5 3h15L21 6.5a2.5 2.5 0 0 1-4.5 1.4A2.5 2.5 0 0 1 12 7.9a2.5 2.5 0 0 1-4.5 0A2.5 2.5 0 0 1 3 6.5z" /><path d="M9 20v-5h6v5" /></svg>
);
export const IGlobe = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
);
export const IStar = (p: P & { filled?: boolean }) => (
  <svg {...base(p)} fill={p.filled ? "currentColor" : "none"}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
);
export const IChefHat = (p: P) => (
  <svg {...base(p)}><path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1z" /><path d="M6 17h12" /></svg>
);
export const ICloudCheck = (p: P) => (
  <svg {...base(p)}><path d="M17.5 19a4.5 4.5 0 0 0 .42-8.98 7 7 0 0 0-13.6 1.9A4 4 0 0 0 6 19h11.5z" /><polyline points="9 13 11.5 15.5 15.5 11" /></svg>
);
export const IUser = (p: P) => (
  <svg {...base(p)}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);
export const IMail = (p: P) => (
  <svg {...base(p)}><rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="22,6 12,13 2,6" /></svg>
);
export const ILock = (p: P) => (
  <svg {...base(p)}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
);
export const IEye = (p: P) => (
  <svg {...base(p)}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const IEyeOff = (p: P) => (
  <svg {...base(p)}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
);
export const IUserIcon = (p: P) => (
  <svg {...base(p)}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);
export const ILogout = (p: P) => (
  <svg {...base(p)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
);


/** Логотип: вилка-лист на плашке цвета морской волны */
export function LogoMark({ size = 36 }: { size?: number }) {
  // Фирменный знак «Кушай вкусно»: вилка + ложка + капля (брендбук #2A9D8F / #264653)
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" aria-hidden>
      <rect width="128" height="128" rx="30" fill="#264653" />
      <path
        d="M29 30v15 M38 28v17 M47 30v15 M29 45q9 7 18 0 M38 48v51"
        fill="none"
        stroke="#2A9D8F"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx="90" cy="40" rx="12" ry="16" fill="none" stroke="#2A9D8F" strokeWidth="7" />
      <path d="M90 56v43" fill="none" stroke="#2A9D8F" strokeWidth="7" strokeLinecap="round" />
      <path d="M64 20 C60 30 51 39 51 47 a13 13 0 0 0 26 0 C77 39 68 30 64 20 Z" fill="#2A9D8F" />
      <circle cx="59.5" cy="49" r="3.2" fill="rgba(255,255,255,0.45)" />
    </svg>
  );
}
