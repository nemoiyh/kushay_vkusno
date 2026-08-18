import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppData, Entry, Food, Goals, Meal, Profile, ToastItem, ToastKind, View } from "./types";
import {
  STORAGE_KEY,
  dayTotals,
  defaultMealByHour,
  fmt,
  loadState,
  mealLabel,
  saveState,
  shiftKey,
  streakDays,
  todayKey,
  uid,
} from "./lib/store";
import { AnimatedNumber, ToastStack } from "./components/ui";
import {
  IApple,
  IBook,
  IChart,
  IFlame,
  ITarget,
  LogoMark,
} from "./components/Icons";
import { DiaryView } from "./components/DiaryView";
import { DatabaseView } from "./components/DatabaseView";
import { StatsView } from "./components/StatsView";
import { GoalsView } from "./components/GoalsView";
import { AddEntryModal, type EntryDraftInput } from "./components/AddEntryModal";

const NAV: { id: View; label: string; icon: typeof IBook }[] = [
  { id: "diary", label: "Дневник", icon: IBook },
  { id: "foods", label: "Продукты", icon: IApple },
  { id: "stats", label: "Статистика", icon: IChart },
  { id: "goals", label: "Цели", icon: ITarget },
];

const VIEW_TITLE: Record<View, string> = {
  diary: "Дневник питания",
  foods: "База продуктов",
  stats: "Статистика",
  goals: "Цели и профиль",
};

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

  const today = data.days[todayKey()];
  const todayTotals = useMemo(() => dayTotals(today), [today]);
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
      a.download = "seyedeno-data.json";
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

  /* ------- рендер ------- */

  return (
    <div className="min-h-dvh">
      {/* шапка */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <LogoMark size={36} />
          <div className="leading-none">
            <div className="font-display text-[15px] font-extrabold tracking-wide">СЪЕДЕНО</div>
            <div className="mt-0.5 text-[11px] font-medium text-faint">дневник питания</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-xl border border-line bg-card px-3 py-1.5 hard-sm sm:flex">
              <IFlame width={15} height={15} className="text-carrot" />
              <span className="text-xs font-semibold text-soft">сегодня</span>
              <AnimatedNumber value={todayTotals.kcal} className="font-display text-sm font-extrabold tabular-nums" />
              <span className="text-xs text-faint tabular-nums">/ {fmt(data.goals.kcal)} ккал</span>
            </div>
            <span className="hidden text-xs font-medium text-faint md:block">{VIEW_TITLE[view]}</span>
          </div>
        </div>
      </header>

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
              Данные хранятся локально в браузере. База — {fmt(67)} продуктов.
            </p>
          </div>
        </aside>

        {/* контент */}
        <main className="min-w-0 flex-1 py-6 pb-28 lg:pb-12">
          <div key={view}>
            {view === "diary" && (
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
            )}
            {view === "foods" && <DatabaseView onPick={openPick} />}
            {view === "stats" && <StatsView data={data} />}
            {view === "goals" && (
              <GoalsView
                data={data}
                onUpdateGoals={(g: Goals) => setData((p) => ({ ...p, goals: g }))}
                onUpdateProfile={(pr: Profile) => setData((p) => ({ ...p, profile: pr }))}
                onAddWeight={(value) => {
                  setData((p) => ({
                    ...p,
                    weights: [...p.weights.filter((w) => w.date !== todayKey()), { date: todayKey(), value }],
                  }));
                  toast(`Вес ${value.toFixed(1)} кг записан`);
                }}
                onDeleteWeight={(date) => {
                  setData((p) => ({ ...p, weights: p.weights.filter((w) => w.date !== date) }));
                  toast("Замер удалён", "info");
                }}
                onExport={handleExport}
                onReset={handleReset}
              />
            )}
          </div>
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
        />
      )}

      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
