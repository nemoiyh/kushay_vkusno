import { useEffect, useMemo, useRef, useState } from "react";
import type { DayLog, Entry, Goals, Meal } from "../types";
import { MEALS, dayTotals, fmt, humanDate, todayKey } from "../lib/store";
import { AnimatedNumber, MacroBar, Modal, Ring } from "./ui";
import { IChevL, IChevR, IClock, IDrop, IPencil, IPlus, ITrash } from "./Icons";

const MEAL_DOT: Record<Meal, string> = {
  breakfast: "var(--color-amber)",
  lunch: "var(--color-leaf)",
  dinner: "var(--color-teal)",
  snack: "var(--color-carrot)",
};

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

export function DiaryView({
  dayKey,
  day,
  goals,
  onNav,
  onAdd,
  onEdit,
  onDelete,
  onWater,
}: {
  dayKey: string;
  day?: DayLog;
  goals: Goals;
  onNav: (delta: number) => void;
  onAdd: (meal: Meal) => void;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  onWater: (n: number) => void;
}) {
  const totals = useMemo(() => dayTotals(day), [day]);
  const isToday = dayKey === todayKey();
  const canNext = dayKey < todayKey();
  const remaining = goals.kcal - totals.kcal;
  const over = remaining < 0;
  const ratio = goals.kcal > 0 ? totals.kcal / goals.kcal : 0;
  const ringColor =
    ratio > 1.05 ? "var(--color-carrot)" : ratio > 0.92 ? "var(--color-amber)" : "var(--color-leaf)";
  const water = day?.water ?? 0;
  const [openMeal, setOpenMeal] = useState<Meal | null>(null);

  const mealEntries = (meal: Meal) =>
    (day?.entries ?? []).filter((e) => e.meal === meal).sort((a, b) => a.addedAt - b.addedAt);

  return (
    <div key={dayKey} className="anim-in">
      {/* переключатель даты */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-xl border border-line bg-card hard-sm">
          <button
            onClick={() => onNav(-1)}
            aria-label="Предыдущий день"
            className="btn-press rounded-l-xl p-2 text-soft hover:text-ink"
          >
            <IChevL />
          </button>
          <div className="min-w-40 px-2 text-center">
            <div className="font-display text-sm font-bold">{humanDate(dayKey)}</div>
            <div className="text-[11px] text-faint">{dayKey.split("-").reverse().join(".")}</div>
          </div>
          <button
            onClick={() => onNav(1)}
            disabled={!canNext}
            aria-label="Следующий день"
            className="btn-press rounded-r-xl p-2 text-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
          >
            <IChevR />
          </button>
        </div>
        {!isToday && (
          <button
            onClick={() => onNav(0)}
            className="btn-press rounded-xl border border-leaf/40 bg-leafwash px-3 py-2 text-xs font-bold text-leafdeep"
          >
            Вернуться к сегодня
          </button>
        )}
        {isToday && (
          <span className="ml-auto hidden items-center gap-1.5 text-xs font-medium text-faint sm:flex">
            <IClock width={14} height={14} /> записи сохраняются автоматически
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[360px_1fr]">
        {/* сводка дня */}
        <section className="card h-fit p-5">
          <div className="flex items-center gap-5">
            <Ring value={totals.kcal} max={goals.kcal} color={ringColor}>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">съедено</span>
              <AnimatedNumber
                value={totals.kcal}
                className="font-display text-[26px] font-extrabold leading-tight tabular-nums"
              />
              <span className="text-[11px] text-soft tabular-nums">из {fmt(goals.kcal)} ккал</span>
            </Ring>
            <div className="min-w-0 flex-1">
              <div
                className={`rounded-xl px-3 py-2.5 text-sm font-bold ${
                  over ? "bg-carrotwash text-carrot" : "bg-leafwash text-leafdeep"
                }`}
              >
                {over ? `Сверх цели ${fmt(-remaining)} ккал` : `Осталось ${fmt(remaining)} ккал`}
              </div>
              {totals.count === 0 && (
                <p className="mt-2 text-xs leading-relaxed text-soft">
                  Дневник пуст — добавьте первый приём пищи.
                </p>
              )}
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <MacroBar label="Белки" value={totals.p} goal={goals.p} color="var(--color-leaf)" wash="var(--color-leafwash)" />
            <MacroBar label="Жиры" value={totals.f} goal={goals.f} color="var(--color-amber)" wash="var(--color-amberwash)" />
            <MacroBar label="Углеводы" value={totals.c} goal={goals.c} color="var(--color-teal)" wash="var(--color-tealwash)" />
          </div>
        </section>

        {/* приёмы пищи — 4 плитки */}
        <div className="grid grid-cols-2 content-start gap-3 lg:gap-4">
          {MEALS.map((m) => {
            const entries = mealEntries(m.id);
            const kcal = entries.reduce((s, e) => s + e.kcal, 0);
            return (
              <MealTile
                key={m.id}
                meal={m.id}
                label={m.label}
                kcal={kcal}
                onOpen={() => setOpenMeal(m.id)}
              />
            );
          })}
        </div>
      </div>

      {/* вода — в самом низу ленты */}
      <section className="card mt-5 p-5">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-[13px] font-bold">Вода</h3>
          <span className="text-xs font-semibold text-water tabular-nums">{water * 250} мл</span>
        </div>
        <div className="mt-3 grid grid-cols-8 gap-1.5">
          {Array.from({ length: 8 }, (_, i) => {
            const filled = i < water;
            return (
              <button
                key={i}
                onClick={() => onWater(i + 1 === water ? i : i + 1)}
                aria-label={`Стакан ${i + 1}`}
                className={`btn-press grid aspect-square place-items-center rounded-xl border transition-colors ${
                  filled
                    ? "border-water bg-waterwash text-water"
                    : "border-line bg-field text-faint hover:text-water"
                }`}
              >
                <span key={`${i}-${filled}`} className={filled ? "drop-pop" : ""}>
                  <IDrop width={18} height={18} fill={filled ? "var(--color-water)" : "none"} strokeWidth={1.8} />
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2.5 text-[11px] text-faint">
          {water} из 8 стаканов · кликните, чтобы отметить
        </p>
      </section>

      {openMeal && (
        <MealSheet
          meal={openMeal}
          entries={mealEntries(openMeal)}
          onClose={() => setOpenMeal(null)}
          onAdd={() => onAdd(openMeal)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

/* ---------- плитка приёма пищи ---------- */
function MealTile({
  meal,
  label,
  kcal,
  onOpen,
}: {
  meal: Meal;
  label: string;
  kcal: number;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      aria-label={`${label}: ${fmt(kcal)} ккал. Открыть список продуктов`}
      className="card btn-press relative flex aspect-square flex-col items-center justify-center gap-2 overflow-hidden p-4 text-center"
    >
      <span className="absolute left-4 top-4 flex items-center gap-1.5 text-[13px] font-bold text-soft">
        <span className="size-2 rounded-full" style={{ background: MEAL_DOT[meal] }} />
        {label}
      </span>
      <span
        className={`font-display text-[27px] font-extrabold leading-none tabular-nums sm:text-3xl ${
          kcal > 0 ? "" : "text-faint/60"
        }`}
      >
        {fmt(kcal)}
      </span>
      <span className="text-[11px] font-semibold text-faint">ккал</span>
      <IChevR width={15} height={15} className="absolute bottom-3.5 right-3.5 text-faint/70" />
    </button>
  );
}

/* ---------- экран приёма пищи ---------- */
function MealSheet({
  meal,
  entries,
  onClose,
  onAdd,
  onEdit,
  onDelete,
}: {
  meal: Meal;
  entries: Entry[];
  onClose: () => void;
  onAdd: () => void;
  onEdit: (e: Entry) => void;
  onDelete: (e: Entry) => void;
}) {
  const meta = MEALS.find((m) => m.id === meal)!;
  const [armed, setArmed] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const subtotal = entries.reduce((s, e) => s + e.kcal, 0);

  const armDelete = (e: Entry) => {
    if (armed === e.id) {
      onDelete(e);
      setArmed(null);
      return;
    }
    setArmed(e.id);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setArmed(null), 2600);
  };

  return (
    <Modal
      title={meta.label}
      subtitle={
        entries.length > 0
          ? `${entries.length} ${plural(entries.length, "продукт", "продукта", "продуктов")} · ${fmt(subtotal)} ккал`
          : "пока пусто"
      }
      onClose={onClose}
    >
      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-paper text-faint">
            <IPlus width={22} height={22} />
          </span>
          <p className="text-sm font-semibold">В «{meta.label.toLowerCase()}» пока пусто</p>
          <p className="text-xs text-faint">Добавьте блюдо — калории появятся на плитке</p>
        </div>
      ) : (
        <ul className="space-y-1">
          {entries.map((e) => (
            <li
              key={e.id}
              className="anim-in flex items-center gap-2 rounded-xl px-2 py-2 transition-colors hover:bg-field"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-sm font-semibold">{e.name}</span>
                  <span className="shrink-0 text-[11px] text-faint tabular-nums">{e.grams} г</span>
                </div>
                <div className="mt-0.5 flex gap-2.5 text-[11px] tabular-nums">
                  <span className="text-leaf">Б {e.p}</span>
                  <span className="text-amber">Ж {e.f}</span>
                  <span className="text-teal">У {e.c}</span>
                </div>
              </div>
              <span className="font-display text-sm font-bold text-carrot tabular-nums">{e.kcal}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => onEdit(e)}
                  aria-label="Изменить"
                  className="btn-press grid size-8 place-items-center rounded-lg border border-line bg-card text-soft hover:text-ink"
                >
                  <IPencil width={14} height={14} />
                </button>
                <button
                  onClick={() => armDelete(e)}
                  aria-label="Удалить"
                  className={`btn-press grid h-8 place-items-center rounded-lg border px-1.5 text-[11px] font-bold ${
                    armed === e.id
                      ? "border-danger bg-danger text-paperink"
                      : "w-8 border-line bg-card text-soft hover:text-danger"
                  }`}
                >
                  {armed === e.id ? "Точно?" : <ITrash width={14} height={14} />}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={onAdd}
        className="btn-press mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-leaf px-5 py-3 text-sm font-bold text-paperink"
      >
        <IPlus width={16} height={16} /> Добавить в «{meta.label}»
      </button>
    </Modal>
  );
}
