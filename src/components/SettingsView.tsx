import { useEffect, useState } from "react";
import type { AppData, Goals, Profile } from "../types";
import { FOODS } from "../data/foods";
import { fmt } from "../lib/store";
import { GoalsView } from "./GoalsView";
import { IApple, ICheck, IDownload, IInfo, ITrash } from "./Icons";

const APP_ICON_URL =
  "https://image.qwenlm.ai/generated-images/d3f7e042-ac15-4531-8403-df7eba42d1e0/_result.png";

export interface PwaInfo {
  canInstall: boolean;
  installed: boolean;
  promptInstall: () => void;
}

export function SettingsView({
  data,
  onUpdateGoals,
  onUpdateProfile,
  pwa,
  onExport,
  onReset,
}: {
  data: AppData;
  onUpdateGoals: (g: Goals) => void;
  onUpdateProfile: (p: Profile) => void;
  pwa: PwaInfo;
  onExport: () => void;
  onReset: () => void;
}) {
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

  return (
    <div className="anim-in">
      <h1 className="font-display text-xl font-extrabold sm:text-2xl">Настройки</h1>
      <p className="mt-1 text-sm text-soft">Цели и профиль, данные, установка</p>

      {/* цели, калькулятор нормы и профиль */}
      <div className="mt-5">
        <GoalsView
          data={data}
          onUpdateGoals={onUpdateGoals}
          onUpdateProfile={onUpdateProfile}
        />
      </div>

      <div className="mt-5 grid content-start gap-5 lg:grid-cols-2">
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
  );
}
