import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AppData,
  Entry,
  Food,
  Goals,
  Meal,
  MeasureKey,
  Profile,
  SleepEntry,
  StatsBlockKey,
  ToastItem,
  ToastKind,
  View,
} from "./types";
import {
  STORAGE_KEY,
  defaultMealByHour,
  fmt,
  loadState,
  mealLabel,
  ru1,
  saveState,
  shiftKey,
  streakDays,
  todayKey,
  uid,
  upsertByDate,
} from "./lib/store";
import { FOODS } from "./data/foods";
import { ErrorBoundary, ToastStack } from "./components/ui";
import {
  IApple,
  IBook,
  IChart,
  IFlame,
  ISettings,
  LogoMark,
} from "./components/Icons";
import { DiaryView } from "./components/DiaryView";
import { DatabaseView } from "./components/DatabaseView";
import { StatsView } from "./components/StatsView";
import { SettingsView } from "./components/SettingsView";
import { AddEntryModal, type EntryDraftInput } from "./components/AddEntryModal";

const NAV: { id: View; label: string; icon: typeof IBook }[] = [
  { id: "diary", label: "Дневник", icon: IBook },
  { id: "foods", label: "Продукты", icon: IApple },
  { id: "stats", label: "Статистика", icon: IChart },
  { id: "settings", label: "Настройки", icon: ISettings },
];

export default function App() {
  const [data, setData] = useState<AppData>(loadState);
  const [view, setView] = useState<View>("diary");
  const [dayKey, setDayKey] = useState(todayKey());
  const [draft, setDraft] = useState<(EntryDraftInput & { dateKey: string; ts: number }) | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => saveState(data), [data]);

  const toast = useCallback((text: string, kind: ToastKind = "success") => {
    const id = uid();
    setToasts((t) => [...t.slice(-2), { id, text, kind }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  /* ------- PWA: установка, офлайн, «нативный» запуск ------- */

  const [pwaEvent, setPwaEvent] = useState<Event | null>(null);
  const [installed, setInstalled] = useState(
    () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true,
  );
  const [hintDismissed, setHintDismissed] = useState(
    () => localStorage.getItem("seyedeno:hint") === "1",
  );

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // перехватываем, чтобы предложить установку из интерфейса
      setPwaEvent(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPwaEvent(null);
      toast("Приложение установлено на устройство");
    };
    const onOffline = () => toast("Нет сети — приложение продолжает работать офлайн", "info");
    const onOnline = () => toast("Связь восстановлена", "info");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [toast]);

  const promptInstall = useCallback(async () => {
    const ev = pwaEvent as (Event & { prompt?: () => void; userChoice?: Promise<{ outcome: string }> }) | null;
    if (!ev?.prompt) {
      toast("Откройте меню браузера: «Установить приложение» или «На экран Домой»", "info");
      return;
    }
    ev.prompt();
    const choice = await ev.userChoice;
    if (choice?.outcome === "accepted") toast("Установка началась");
    setPwaEvent(null);
  }, [pwaEvent, toast]);

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const showIosHint = isIOS && !installed && !hintDismissed;
  const dismissHint = () => {
    setHintDismissed(true);
    try {
      localStorage.setItem("seyedeno:hint", "1");
    } catch { /* ignore */ }
  };

  const streak = useMemo(() => streakDays(data.days, data.goals.kcal), [data.days, data.goals.kcal]);

  /* ------- действия ------- */

  const upsertDay = useCallback(
    (key: string, fn: (d: { entries: Entry[]; water: number }) => { entries: Entry[]; water: number }) => {
      setData((prev) => {
        const day = prev.days[key] ?? { entries: [], water: 0 };
        return { ...prev, days: { ...prev.days, [key]: fn(day) } };
      });
    },
    [],
  );

  const saveEntry = useCallback(
    (key: string, entry: Entry, replaceId?: string) => {
      upsertDay(key, (d) => ({
        ...d,
        entries: replaceId
          ? d.entries.map((e) => (e.id === replaceId ? entry : e))
          : [...d.entries, entry],
      }));
    },
    [upsertDay],
  );

  const handleSave = (entry: Entry) => {
    if (!draft) return;
    const editing = draft.entry;
    saveEntry(draft.dateKey, entry, editing?.id);
    setDraft(null);
    toast(
      editing
        ? `Обновлено: ${entry.name} · ${fmt(entry.kcal)} ккал`
        : `${mealLabel(entry.meal)}: ${entry.name} · ${fmt(entry.kcal)} ккал`,
    );
  };

  const handleDelete = (entry: Entry) => {
    upsertDay(dayKey, (d) => ({ ...d, entries: d.entries.filter((e) => e.id !== entry.id) }));
    toast(`Удалено: ${entry.name}`, "info");
  };

  const handleExport = () => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "kushai-vkusno-data.json";
      a.click();
      URL.revokeObjectURL(url);
      toast("Файл с данными выгружен");
    } catch {
      toast("Не получилось выгрузить файл", "error");
    }
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    const fresh = loadState();
    setData(fresh);
    setDayKey(todayKey());
    toast("Данные очищены и заполнены демо-примером", "info");
  };

  const openAdd = (meal: Meal, food?: Food) =>
    setDraft({ dateKey: dayKey, meal, food, ts: Date.now() });

  const openPick = (food: Food) => {
    setView("diary");
    setDayKey(todayKey());
    setDraft({ dateKey: todayKey(), meal: defaultMealByHour(), food, ts: Date.now() });
  };

  /* ------- свои продукты ------- */

  const saveCustomFood = useCallback((f: Omit<Food, "id">): Food => {
    const food: Food = { ...f, id: uid() };
    setData((prev) => {
      const rest = prev.customFoods.filter((x) => !(f.barcode && x.barcode === f.barcode));
      return { ...prev, customFoods: [food, ...rest] };
    });
    return food;
  }, []);

  const deleteCustomFood = useCallback((id: string) => {
    setData((prev) => ({ ...prev, customFoods: prev.customFoods.filter((f) => f.id !== id) }));
    toast("Продукт удалён из «Мои продукты»", "info");
  }, [toast]);

  /** добавление продукта из Open Food Facts в локальную базу */
  const addOffFood = useCallback(
    (food: Food) => {
      setData((prev) => {
        const rest = prev.customFoods.filter((x) => !(food.barcode && x.barcode === food.barcode));
        return { ...prev, customFoods: [food, ...rest] };
      });
      toast(`Продукт добавлен: ${food.name}`);
    },
    [toast],
  );

  const openCustomFood = useCallback(
    () => setDraft({ dateKey: dayKey, meal: defaultMealByHour(), custom: true, ts: Date.now() }),
    [dayKey],
  );

  /* ------- статистика: шаги, сон, активность, замеры ------- */

  const addSteps = useCallback((value: number) => {
    setData((p) => ({ ...p, steps: upsertByDate(p.steps, { date: todayKey(), value: Math.round(value) }) }));
    toast(`Шаги записаны: ${fmt(Math.round(value))}`);
  }, [toast]);

  const addWeight = useCallback((value: number) => {
    setData((p) => ({ ...p, weights: upsertByDate(p.weights, { date: todayKey(), value }) }));
    toast(`Вес ${value.toFixed(1).replace(".", ",")} кг записан`);
  }, [toast]);

  const addSleep = useCallback((hours: number, quality?: SleepEntry["quality"]) => {
    setData((p) => ({ ...p, sleep: upsertByDate(p.sleep, { date: todayKey(), hours, quality }) }));
    toast(`Сон записан: ${ru1(hours)} ч`);
  }, [toast]);

  const addActivity = useCallback((minutes: number, kcal: number) => {
    setData((p) => ({ ...p, activity: upsertByDate(p.activity, { date: todayKey(), minutes, kcal }) }));
    toast(`Активность: ${minutes} мин · ${kcal} ккал`);
  }, [toast]);

  const addMeasures = useCallback((vals: Partial<Record<MeasureKey, number>>) => {
    setData((p) => {
      const measures = { ...p.measures };
      (Object.entries(vals) as [MeasureKey, number][]).forEach(([k, v]) => {
        measures[k] = upsertByDate(measures[k] ?? [], { date: todayKey(), value: v });
      });
      return { ...p, measures };
    });
    toast("Замеры тела сохранены");
  }, [toast]);

  const toggleStatBlock = useCallback((id: StatsBlockKey) => {
    setData((p) => ({
      ...p,
      statsVisibility: { ...p.statsVisibility, [id]: !p.statsVisibility[id] },
    }));
  }, []);

  /* ------- рендер ------- */

  return (
    <div className="min-h-dvh">
      {/* шапка */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-2.5 sm:px-6">
          <LogoMark size={38} />
          <div className="leading-none">
            <div className="font-display text-[15px] font-extrabold tracking-wide sm:text-base">КУШАЙ ВКУСНО</div>
            <div className="mt-1 text-[10px] font-medium tracking-[0.18em] text-soft">
              не будет грустно
            </div>
          </div>
        </div>
      </header>

      {/* подсказка об установке на iPhone */}
      {showIosHint && (
        <div className="border-b border-line bg-waterwash/80">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 anim-in sm:px-6">
            <IApple width={17} height={17} className="shrink-0 text-water" />
            <p className="flex-1 text-xs leading-snug sm:text-[13px]">
              Поставьте «Кушай вкусно» на домашний экран: <b>«Поделиться»</b> → <b>«На экран „Домой"»</b> —
              запуск в одно касание, работает офлайн.
            </p>
            <button
              onClick={dismissHint}
              className="btn-press shrink-0 rounded-lg border border-line bg-card px-2.5 py-1 text-[11px] font-bold text-soft"
            >
              Понятно
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-6xl gap-6 px-4 sm:px-6">
        {/* сайдбар */}
        <aside className="sticky top-[73px] hidden h-[calc(100dvh-73px)] w-52 shrink-0 flex-col py-6 lg:flex">
          <nav className="flex flex-col gap-1.5">
            {NAV.map((n) => {
              const Icon = n.icon;
              const active = view === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setView(n.id)}
                  className={`btn-press flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-semibold ${
                    active
                      ? "border-leaf bg-leaf text-paperink"
                      : "border-transparent text-soft hover:border-line hover:bg-card hover:text-ink"
                  }`}
                >
                  <Icon width={17} height={17} />
                  {n.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto space-y-3">
            <div className="card p-4">
              <div className="flex items-center gap-2.5">
                <span className={`grid size-9 place-items-center rounded-lg ${streak > 0 ? "bg-carrotwash text-carrot" : "bg-paper text-faint"}`}>
                  <IFlame width={18} height={18} />
                </span>
                <div>
                  <div className="font-display text-lg font-extrabold leading-none tabular-nums">{streak}</div>
                  <div className="mt-0.5 text-[11px] text-faint">{streak === 1 ? "день в цели" : "дней в цели"}</div>
                </div>
              </div>
            </div>
            <p className="px-1 text-[10px] leading-relaxed text-faint">
              Данные хранятся локально в браузере. База — {fmt(FOODS.length)} продуктов, включая
              каталог «Перекрёстка».
            </p>
          </div>
        </aside>

        {/* контент */}
        <main className="min-w-0 flex-1 py-6 pb-28 lg:pb-12">
          <ErrorBoundary onReset={() => setView("diary")}>
          <div key={view}>
            {view === "diary" && (
              <>
                <DiaryView
                  dayKey={dayKey}
                  day={data.days[dayKey]}
                  goals={data.goals}
                  onNav={(d) => setDayKey((k) => {
                    const next = d === 0 ? todayKey() : shiftKey(k, d);
                    return next > todayKey() ? todayKey() : next;
                  })}
                  onAdd={(meal) => openAdd(meal)}
                  onEdit={(entry) => setDraft({ dateKey: dayKey, meal: entry.meal, entry, ts: Date.now() })}
                  onDelete={handleDelete}
                  onWater={(n) => upsertDay(dayKey, (d) => ({ ...d, water: n }))}
                />
              </>
            )}
            {view === "foods" && (
              <DatabaseView
                onPick={openPick}
                customFoods={data.customFoods}
                onDeleteCustomFood={deleteCustomFood}
                onSaveOffFood={addOffFood}
                onAddCustomFood={openCustomFood}
              />
            )}
            {view === "stats" && (
              <StatsView
                data={data}
                onSteps={addSteps}
                onSleep={addSleep}
                onActivity={addActivity}
                onMeasures={addMeasures}
                onWeight={addWeight}
                onOpenSettings={() => setView("settings")}
                visibility={data.statsVisibility}
              />
            )}
            {view === "settings" && (
              <SettingsView
                data={data}
                onUpdateGoals={(g: Goals) => setData((p) => ({ ...p, goals: g }))}
                onUpdateProfile={(pr: Profile) => setData((p) => ({ ...p, profile: pr }))}
                onExport={handleExport}
                onReset={handleReset}
                pwa={{ canInstall: !!pwaEvent, installed, promptInstall }}
                statsVisibility={data.statsVisibility}
                onToggleStat={toggleStatBlock}
              />
            )}
          </div>
          </ErrorBoundary>
        </main>
      </div>

      {/* мобильная навигация */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = view === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-bold transition-colors ${
                  active ? "text-leafdeep" : "text-faint hover:text-soft"
                }`}
              >
                <span className={`grid place-items-center rounded-full px-4 py-1 transition-colors ${active ? "bg-leafwash" : ""}`}>
                  <Icon width={18} height={18} />
                </span>
                {n.label}
              </button>
            );
          })}
        </div>
      </nav>

      {draft && (
        <AddEntryModal
          key={draft.ts}
          input={draft}
          onClose={() => setDraft(null)}
          onSave={handleSave}
          customFoods={data.customFoods}
          onSaveCustomFood={saveCustomFood}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
