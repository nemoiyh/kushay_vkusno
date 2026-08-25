import { useEffect, useState, type ReactNode } from "react";
import type { AppData, Goals, Profile, StatsBlockKey } from "../types";
import { FOODS } from "../data/foods";
import { fmt } from "../lib/store";
import { accountSyncedAt, type SessionUser } from "../lib/auth";
import { GoalsView } from "./GoalsView";
import {
  IActivity,
  IApple,
  IChart,
  ICheck,
  IChevL,
  IChevR,
  IDrop,
  IDownload,
  IFlame,
  IFoot,
  IInfo,
  ILogout,
  IMoon,
  IRuler,
  IScale,
  ITarget,
  ITrash,
} from "./Icons";

const APP_ICON_URL =
  "https://image.qwenlm.ai/generated-images/d3f7e042-ac15-4531-8403-df7eba42d1e0/_result.png";

export interface PwaInfo {
  canInstall: boolean;
  installed: boolean;
  promptInstall: () => void;
}

type Section = "menu" | "goals" | "stats" | "app";

const STAT_BLOCKS: {
  id: StatsBlockKey;
  label: string;
  hint: string;
  icon: ReactNode;
  tint: string;
}[] = [
  { id: "weight", label: "Вес", hint: "График и текущее значение", icon: <IScale width={16} height={16} />, tint: "bg-leafwash text-leafdeep" },
  { id: "measures", label: "Замеры тела", hint: "Грудь, талия, бёдра и др.", icon: <IRuler width={16} height={16} />, tint: "bg-amberwash text-amber" },
  { id: "calories", label: "Калории", hint: "Столбчатый график по дням", icon: <IFlame width={16} height={16} />, tint: "bg-carrotwash text-carrot" },
  { id: "macros", label: "БЖУ", hint: "Белки, жиры, углеводы", icon: <IApple width={16} height={16} />, tint: "bg-tealwash text-teal" },
  { id: "water", label: "Вода", hint: "Потребление в мл", icon: <IDrop width={16} height={16} />, tint: "bg-waterwash text-water" },
  { id: "activity", label: "Активность", hint: "Тренировки и ккал", icon: <IActivity width={16} height={16} />, tint: "bg-carrotwash text-carrot" },
  { id: "steps", label: "Шаги", hint: "Количество шагов по дням", icon: <IFoot width={16} height={16} />, tint: "bg-leafwash text-leafdeep" },
  { id: "sleep", label: "Сон", hint: "Часы и качество сна", icon: <IMoon width={16} height={16} />, tint: "bg-tealwash text-teal" },
];

const MENU_ITEMS: {
  id: Section;
  icon: ReactNode;
  tint: string;
  title: string;
  desc: string;
}[] = [
  {
    id: "goals",
    icon: <ITarget width={20} height={20} />,
    tint: "bg-carrotwash text-carrot",
    title: "Цели и расчёты",
    desc: "Дневная норма калорий и БЖУ",
  },
  {
    id: "stats",
    icon: <IChart width={20} height={20} />,
    tint: "bg-tealwash text-teal",
    title: "Статистика",
    desc: "Управление видимостью блоков",
  },
  {
    id: "app",
    icon: <IApple width={20} height={20} />,
    tint: "bg-leafwash text-leafdeep",
    title: "Приложение",
    desc: "Аккаунт, вход и синхронизация",
  },
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
  account: { user: SessionUser; providerLabel: string; onLogout: () => void };
}) {
  const [section, setSection] = useState<Section>("menu");
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!confirmReset) return;
    const t = window.setTimeout(() => setConfirmReset(false), 4000);
    return () => window.clearTimeout(t);
  }, [confirmReset]);

  const askReset = () => {
    if (confirmReset) {
      setConfirmReset(false);
      onReset();
    } else {
      setConfirmReset(true);
    }
  };

  const enabledCount = STAT_BLOCKS.filter((b) => statsVisibility[b.id]).length;
  const back = () => setSection("menu");

  return (
    <div key={section} className="anim-in">
      {section === "menu" && (
        <>
          <h1 className="font-display text-xl font-extrabold sm:text-2xl">Настройки</h1>
          <p className="mt-1 text-sm text-soft">Выберите раздел</p>

          <div className="mt-5 flex max-w-2xl flex-col gap-3">
            {MENU_ITEMS.map((item, i) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className="card btn-press group flex w-full items-center gap-4 p-4 text-left transition-colors hover:border-leaf/50 sm:p-5 anim-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${item.tint}`}>
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-sm font-bold leading-tight">{item.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-soft">{item.desc}</span>
                </span>
                {item.id === "stats" && (
                  <span className="shrink-0 rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold text-faint tabular-nums">
                    {enabledCount}/{STAT_BLOCKS.length}
                  </span>
                )}
                <IChevR
                  width={16}
                  height={16}
                  className="shrink-0 text-faint transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-ink"
                />
              </button>
            ))}
          </div>
        </>
      )}

      {section === "goals" && (
        <SubScreen onBack={back} title="Цели и расчёты" subtitle="Дневная норма калорий и БЖУ">
          <GoalsView data={data} onUpdateGoals={onUpdateGoals} onUpdateProfile={onUpdateProfile} />
        </SubScreen>
      )}

      {section === "stats" && (
        <SubScreen
          onBack={back}
          title="Статистика"
          subtitle={`Какие блоки показывать на вкладке «Статистика» · включено ${enabledCount} из ${STAT_BLOCKS.length}`}
        >
          <div className="card max-w-2xl divide-y divide-linesoft">
            {STAT_BLOCKS.map((b) => (
              <div key={b.id} className="flex items-center gap-3.5 px-4 py-3 sm:px-5">
                <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${b.tint}`}>{b.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{b.label}</div>
                  <div className="truncate text-[11px] text-faint">{b.hint}</div>
                </div>
                <Switch on={statsVisibility[b.id]} onToggle={() => onToggleStat(b.id)} label={b.label} />
              </div>
            ))}
          </div>
        </SubScreen>
      )}

      {section === "app" && (
        <SubScreen onBack={back} title="Аккаунт" subtitle="Профиль и синхронизация данных">
          <AccountCard
            user={account.user}
            providerLabel={account.providerLabel}
            onLogout={account.onLogout}
          />
        </SubScreen>
      )}

      {/* нижеследующие блоки («Приложение», «Данные», «О приложении») намеренно скрыты —
          раздел оставлен только под управление аккаунтом */}
      {false && (
        <div className="hidden">
          <div className="grid content-start gap-5 lg:grid-cols-2">

            {/* приложение */}
            <section className="card p-5 lg:col-span-2">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <img
                  src={APP_ICON_URL}
                  alt="Иконка приложения «Кушай вкусно»"
                  className="size-20 shrink-0 rounded-[22%] border border-line object-cover hard-sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-[13px] font-bold">Приложение «Кушай вкусно»</h2>
                    <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold text-faint">
                      v1.0.0 · офлайн · без аккаунта
                    </span>
                  </div>

                  {pwa.installed ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-leafwash px-2.5 py-1 text-xs font-bold text-leafdeep">
                      <ICheck width={13} height={13} /> Работает как приложение на этом устройстве
                    </p>
                  ) : (
                    <p className="mt-2 max-w-2xl text-xs leading-relaxed text-soft">
                      «Кушай вкусно» — PWA: ставится на домашний экран как обычное приложение, открывается в
                      полноэкранном режиме и работает без интернета. Для публикации в App Store проект
                      упаковывается в нативную оболочку через Capacitor — всё уже настроено, шаги в README.md.
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2.5">
                    {pwa.canInstall && (
                      <button
                        onClick={pwa.promptInstall}
                        className="btn-press flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-paperink"
                      >
                        <IDownload width={16} height={16} /> Установить на устройство
                      </button>
                    )}
                    {!pwa.installed && (
                      <span className="flex items-center gap-2 rounded-xl border border-line bg-field px-4 py-2.5 text-xs font-medium text-soft">
                        <IApple width={15} height={15} /> iPhone: «Поделиться» → «На экран „Домой"»
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.25fr]">
                    <div className="rounded-xl border border-line bg-paper p-3.5 text-xs leading-relaxed text-soft">
                      <div className="font-display text-[11px] font-bold text-ink">Быстро · без APK</div>
                      <p className="mt-1.5">
                        <b className="text-ink">Android / планшет:</b> Chrome → меню ⋮ → «Установить
                        приложение» — иконка на домашнем экране, полноэкранный режим, офлайн.
                      </p>
                      <p className="mt-1.5">
                        <b className="text-ink">iPhone / iPad:</b> Safari → «Поделиться» → «На экран
                        „Домой"».
                      </p>
                    </div>
                    <div className="rounded-xl border border-leaf/35 bg-leafwash/60 p-3.5 text-xs leading-relaxed text-soft">
                      <div className="font-display text-[11px] font-bold text-leafdeep">
                        Настоящий APK для планшета · ~10 минут
                      </div>
                      <ol className="mt-1.5 list-decimal space-y-1 pl-4">
                        <li>
                          Собрать сайт: <code className="rounded bg-card px-1 font-bold text-ink">npm run build</code>{" "}
                          и выложить папку <b className="text-ink">dist</b> бесплатно (Netlify Drop —
                          просто перетащить).
                        </li>
                        <li>
                          Вставить адрес на <b className="text-ink">pwabuilder.com</b> → Android →
                          «Generate package» → готовый подписанный APK.
                        </li>
                        <li>
                          Перенести APK на планшет и открыть — разрешить установку из неизвестных
                          источников.
                        </li>
                      </ol>
                      <p className="mt-1.5 text-[11px] opacity-80">
                        Полностью нативная сборка — через Android Studio (Capacitor уже подключён,
                        скрипт <b className="text-ink">scripts/build-apk.sh</b>, шаги в README.md).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* данные */}
            <section className="card p-5">
              <h2 className="font-display text-[13px] font-bold">Данные</h2>
              <p className="mt-1 text-xs leading-relaxed text-soft">
                Всё хранится локально в вашем браузере (localStorage) и никуда не отправляется.
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <button
                  onClick={onExport}
                  className="btn-press flex items-center gap-2 rounded-xl border border-line bg-field px-4 py-2.5 text-sm font-semibold text-soft hover:text-ink"
                >
                  <IDownload width={16} height={16} /> Скачать JSON
                </button>
                <button
                  onClick={askReset}
                  className={`btn-press flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${
                    confirmReset
                      ? "bg-danger text-paperink"
                      : "border border-danger/40 bg-dangerwash text-danger"
                  }`}
                >
                  <ITrash width={16} height={16} />
                  {confirmReset ? "Точно стереть? Нажмите ещё раз" : "Стереть все данные"}
                </button>
              </div>
              {confirmReset && (
                <p className="mt-2 text-[11px] font-medium text-danger">
                  Будут удалены дневник, цели, вес и демо-данные. Через 4 секунды отмена.
                </p>
              )}
            </section>

            {/* о приложении */}
            <section className="card p-5">
              <h2 className="font-display text-[13px] font-bold">О приложении</h2>
              <ul className="mt-3 space-y-2.5 text-sm">
                <li className="flex items-center gap-2.5 text-soft">
                  <IInfo width={15} height={15} className="shrink-0 text-leaf" />
                  База — {fmt(FOODS.length)} продуктов, включая каталог «Перекрёстка»
                </li>
                <li className="flex items-center gap-2.5 text-soft">
                  <IInfo width={15} height={15} className="shrink-0 text-leaf" />
                  Штрихкоды: ваша база → Open Food Facts → свои товары
                </li>
                <li className="flex items-center gap-2.5 text-soft">
                  <IInfo width={15} height={15} className="shrink-0 text-leaf" />
                  Офлайн-режим: данные доступны без интернета
                </li>
              </ul>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- экран раздела с кнопкой «Назад» ---------- */

function SubScreen({
  onBack,
  title,
  subtitle,
  children,
}: {
  onBack: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onBack}
        className="btn-press inline-flex items-center gap-1 rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs font-bold text-soft hover:text-ink"
      >
        <IChevL width={14} height={14} /> Назад
      </button>
      <h1 className="mt-3 font-display text-xl font-extrabold sm:text-2xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-soft">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

/* ---------- тумблер ---------- */

function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={`Показывать блок «${label}»`}
      onClick={onToggle}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
        on ? "bg-leaf" : "bg-ink/15"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-card shadow-sm transition-transform duration-200 ${
          on ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

/* ---------- аккаунт ---------- */

function AccountCard({
  user,
  providerLabel,
  onLogout,
}: {
  user: SessionUser;
  providerLabel: string;
  onLogout: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!confirm) return;
    const t = window.setTimeout(() => setConfirm(false), 4000);
    return () => window.clearTimeout(t);
  }, [confirm]);

  const syncedAt = accountSyncedAt(user.id);
  const initial = (user.name?.[0] ?? user.email[0] ?? "?").toUpperCase();

  const doLogout = () => {
    if (confirm) {
      setConfirm(false);
      onLogout();
    } else setConfirm(true);
  };

  return (
    <section className="card p-5">
      <div className="flex items-center gap-3.5">
        <span className="grid size-12 shrink-0 place-items-center rounded-full border border-line bg-leafwash font-display text-lg font-extrabold text-leafdeep">
          {initial}
        </span>
        <div className="min-w-0">
          {user.name && <div className="truncate text-sm font-bold">{user.name}</div>}
          <div className="truncate text-xs text-soft">{user.email}</div>
          <div className="mt-0.5 text-[11px] text-faint">
            Вход через {providerLabel}
            {syncedAt && (
              <>
                {" · синхронизировано в "}
                {new Date(syncedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
              </>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11px] leading-snug text-faint">
          Данные сохраняются в вашем аккаунте и подхватятся при следующем входе на этом устройстве.
        </p>
        <button
          onClick={doLogout}
          className={`btn-press flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold ${
            confirm
              ? "bg-danger text-paperink"
              : "border border-line bg-field text-soft hover:text-danger"
          }`}
        >
          <ILogout width={14} height={14} />
          {confirm ? "Точно выйти?" : "Выйти"}
        </button>
      </div>
    </section>
  );
}
