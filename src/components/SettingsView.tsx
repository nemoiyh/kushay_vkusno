import { useEffect, useState, type ReactNode } from "react";
import type { AppData, Goals, Profile, StatsBlockKey } from "../types";
import type { User } from "../lib/auth";
import { GoalsView } from "./GoalsView";
import {
  IApple, IChevL, IChevR, IChart, IDrop, IFlame, IFoot, ILogout, IMoon, IRuler, IScale, ISettings, ITarget,
} from "./Icons";

export interface PwaInfo {
  canInstall: boolean;
  installed: boolean;
  promptInstall: () => void;
}

type Screen = "menu" | "goals" | "stats" | "app";

const STATS_BLOCKS: { id: StatsBlockKey; label: string; hint: string; icon: ReactNode; tint: string }[] = [
  { id: "weight", label: "Вес", hint: "График и динамика веса", icon: <IScale width={16} height={16} />, tint: "bg-leafwash text-leafdeep" },
  { id: "measures", label: "Замеры тела", hint: "Грудь, талия, бёдра и другое", icon: <IRuler width={16} height={16} />, tint: "bg-amberwash text-amber" },
  { id: "calories", label: "Калории", hint: "Столбчатый график по дням", icon: <IFlame width={16} height={16} />, tint: "bg-carrotwash text-carrot" },
  { id: "macros", label: "БЖУ", hint: "Белки, жиры, углеводы", icon: <IApple width={16} height={16} />, tint: "bg-tealwash text-teal" },
  { id: "water", label: "Вода", hint: "Потребление по дням", icon: <IDrop width={16} height={16} />, tint: "bg-waterwash text-water" },
  { id: "activity", label: "Активность", hint: "Тренировки и калории", icon: <IFoot width={16} height={16} />, tint: "bg-carrotwash text-carrot" },
  { id: "steps", label: "Шаги", hint: "Количество шагов по дням", icon: <IFoot width={16} height={16} />, tint: "bg-leafwash text-leafdeep" },
  { id: "sleep", label: "Сон", hint: "Длительность и качество", icon: <IMoon width={16} height={16} />, tint: "bg-tealwash text-teal" },
];

export function SettingsView({
  data,
  onUpdateGoals,
  onUpdateProfile,
  pwa,
  onExport,
  onReset,
  statsVisibility,
  onToggleStat,
  account,
}: {
  data: AppData;
  onUpdateGoals: (g: Goals) => void;
  onUpdateProfile: (p: Profile) => void;
  pwa: PwaInfo;
  onExport: () => void;
  onReset: () => void;
  statsVisibility: AppData["statsVisibility"];
  onToggleStat: (id: StatsBlockKey) => void;
  account: { user: User; cloud: boolean; onLogout: () => void };
}) {
  const [screen, setScreen] = useState<Screen>("menu");

  const enabledCount = Object.values(statsVisibility).filter(Boolean).length;

  return (
    <div className="anim-in">
      {screen === "menu" ? (
        <>
          <h1 className="font-display text-xl font-extrabold sm:text-2xl">Настройки</h1>
          <p className="mt-1 text-sm text-soft">Выберите раздел</p>

          <div className="mt-5 flex max-w-2xl flex-col gap-3">
            <MenuItem
              icon={<ITarget width={18} height={18} />}
              tint="bg-leafwash text-leafdeep"
              title="Цели и расчёты"
              desc="Дневная норма калорий и БЖУ"
              onClick={() => setScreen("goals")}
            />
            <MenuItem
              icon={<IChart width={18} height={18} />}
              tint="bg-carrotwash text-carrot"
              title="Статистика"
              desc="Управление видимостью блоков"
              right={<span className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-bold text-faint">{enabledCount}/8</span>}
              onClick={() => setScreen("stats")}
            />
            <MenuItem
              icon={<ISettings width={18} height={18} />}
              tint="bg-tealwash text-teal"
              title="Приложение"
              desc="Аккаунт, вход и синхронизация"
              onClick={() => setScreen("app")}
            />
          </div>
        </>
      ) : screen === "goals" ? (
        <SubScreen title="Цели и расчёты" onBack={() => setScreen("menu")}>
          <GoalsView data={data} onUpdateGoals={onUpdateGoals} onUpdateProfile={onUpdateProfile} />
        </SubScreen>
      ) : screen === "stats" ? (
        <SubScreen title="Статистика" onBack={() => setScreen("menu")} subtitle="Какие блоки показывать на вкладке «Статистика»">
          <div className="card max-w-2xl overflow-hidden">
            {STATS_BLOCKS.map((b) => (
              <div key={b.id} className="flex items-center gap-3 border-b border-linesoft px-4 py-3 last:border-0">
                <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${b.tint}`}>{b.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{b.label}</div>
                  <div className="text-[11px] text-faint">{b.hint}</div>
                </div>
                <Toggle on={statsVisibility[b.id]} onClick={() => onToggleStat(b.id)} label={b.label} />
              </div>
            ))}
          </div>
        </SubScreen>
      ) : (
        <SubScreen title="Приложение" onBack={() => setScreen("menu")} subtitle="Аккаунт и синхронизация">
          <div className="max-w-2xl">
            <AccountCard user={account.user} cloud={account.cloud} onLogout={account.onLogout} />
          </div>
        </SubScreen>
      )}
    </div>
  );
}

function MenuItem({ icon, tint, title, desc, right, onClick }: { icon: ReactNode; tint: string; title: string; desc: string; right?: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="btn-press card group flex w-full items-center gap-4 p-4 text-left transition-transform hover:-translate-y-0.5"
    >
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${tint}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[14px] font-bold">{title}</span>
        <span className="block text-xs text-soft">{desc}</span>
      </span>
      {right}
      <IChevR width={18} height={18} className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function SubScreen({ title, subtitle, onBack, children }: { title: string; subtitle?: string; onBack: () => void; children: ReactNode }) {
  return (
    <div className="anim-in">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn-press flex items-center gap-1.5 rounded-xl border border-line bg-card px-3 py-2 text-xs font-bold text-soft hover:text-ink">
          <IChevL width={15} height={15} /> Назад
        </button>
        <div>
          <h1 className="font-display text-lg font-extrabold sm:text-xl">{title}</h1>
          {subtitle && <p className="text-xs text-soft">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${on ? "bg-leaf" : "bg-line"}`}
    >
      <span
        className={`absolute left-0.5 top-0.5 size-6 rounded-full bg-card shadow-sm transition-transform duration-200 ${on ? "translate-x-5" : ""}`}
      />
    </button>
  );
}

function AccountCard({ user, cloud, onLogout }: { user: User; cloud: boolean; onLogout: () => void }) {
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!confirm) return;
    const t = window.setTimeout(() => setConfirm(false), 4000);
    return () => window.clearTimeout(t);
  }, [confirm]);
  const initial = (user.nick[0] ?? "?").toUpperCase();
  const doLogout = () => {
    if (confirm) { setConfirm(false); onLogout(); }
    else setConfirm(true);
  };
  return (
    <section className="card p-5">
      <div className="flex items-center gap-3.5">
        <span className="grid size-12 shrink-0 place-items-center rounded-full border border-line bg-leafwash font-display text-lg font-extrabold text-leafdeep">
          {initial}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">@{user.nick}</div>
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                cloud ? "bg-leafwash text-leafdeep" : "bg-paper text-faint"
              }`}
            >
              <span className={`size-1.5 rounded-full ${cloud ? "bg-leaf" : "bg-faint"}`} />
              {cloud ? "Облачный аккаунт" : "Локальный аккаунт"}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11px] leading-snug text-faint">
          {cloud
            ? "Данные синхронизированы и доступны на всех ваших устройствах."
            : "Данные хранятся в этом браузере под вашим ником и откроются при следующем входе."}
        </p>
        <button
          onClick={doLogout}
          className={`btn-press flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold ${
            confirm ? "bg-danger text-paperink" : "border border-line bg-field text-soft hover:text-danger"
          }`}
        >
          <ILogout width={14} height={14} />
          {confirm ? "Точно выйти?" : "Выйти"}
        </button>
      </div>
    </section>
  );
}
