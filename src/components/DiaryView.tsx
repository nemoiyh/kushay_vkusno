import { useMemo, useRef, useState } from "react";
import type { DayLog, Entry, Food, Goals, Meal, Recipe } from "../types";
import { MEALS, dayTotals, fmt, humanDate, todayKey } from "../lib/store";
import { AnimatedNumber, MacroBar, Ring } from "./ui";
import { IChevL, IChevR, IClock, IDrop, IPencil, IPlus, ITrash } from "./Icons";

const MEAL_DOT: Record<Meal, string> = {
  breakfast: "var(--color-amber)",
  lunch: "var(--color-leaf)",
  dinner: "var(--color-teal)",
  snack: "var(--color-carrot)",
};

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

  return (
    <div key={dayKey} className="anim-in">
      {/* переключатель даты */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-xl border border-line bg-card hard-sm">
          <button onClick={() => onNav(-1)} aria-label="Предыдущий день" className="btn-press rounded-l-xl p-2 text-soft hover:text-ink">
            <IChevL />
          </button>
          <div className="min-w-40 px-2 text-center">
            <div className="font-display text-sm font-bold">{humanDate(dayKey)}</div>
            <div className="text-[11px] text-faint">{dayKey.split("-").reverse().join(".")}</div>
          </div>
          <button onClick={() => onNav(1)} disabled={!canNext} aria-label="Следующий день" className="btn-press rounded-r-xl p-2 text-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-30">
            <IChevR />
          </button>
        </div>
        {!isToday && (
          <button onClick={() => onNav(0)} className="btn-press rounded-xl border border-leaf/40 bg-leafwash px-3 py-2 text-xs font-bold text-leafdeep">
            Вернуться к сегодня
          </button>
        )}
        {isToday && (
          <span className="ml-auto hidden items-center gap-1.5 text-xs font-medium text-faint sm:flex">
            <IClock width={14} height={14} /> записи сохраняются автоматически
          </span>
        )}
      </div>

      {/* заголовок секции — над обеими колонками */}
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-[15px] font-extrabold sm:text-base">Приёмы пищи</h2>
        <span className="hidden text-[11px] font-medium text-faint lg:block">нажмите на плитку — откроется список блюд</span>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        {/* квадрат КБЖУ */}
        <section className="card flex flex-col p-5 lg:h-full">
          <div className="flex items-center gap-5">
            <Ring value={totals.kcal} max={goals.kcal} color={ringColor} size={150} stroke={13}>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">съедено</span>
              <AnimatedNumber value={totals.kcal} className="font-display text-2xl font-extrabold leading-tight tabular-nums" />
              <span className="text-[11px] text-soft tabular-nums">из {fmt(goals.kcal)} ккал</span>
            </Ring>
            <div className="min-w-0 flex-1">
              <div className={`rounded-xl px-3 py-2.5 text-sm font-bold ${over ? "bg-carrotwash text-carrot" : "bg-leafwash text-leafdeep"}`}>
                {over ? `Сверх цели ${fmt(-remaining)} ккал` : `Осталось ${fmt(remaining)} ккал`}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-soft">
                {totals.count === 0 ? "Дневник пуст — добавьте первый приём пищи." : `Записей: ${totals.count}`}
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <MacroBar label="Белки" value={totals.p} goal={goals.p} color="var(--color-leaf)" wash="var(--color-leafwash)" />
            <MacroBar label="Жиры" value={totals.f} goal={goals.f} color="var(--color-amber)" wash="var(--color-amberwash)" />
            <MacroBar label="Углеводы" value={totals.c} goal={goals.c} color="var(--color-teal)" wash="var(--color-tealwash)" />
          </div>
        </section>

        {/* плитки приёмов пищи 2×2 */}
        <div className="flex min-w-0 flex-col lg:h-full lg:min-h-0">
          <div className="grid flex-1 grid-cols-2 gap-3 sm:gap-4 lg:grid-rows-2 lg:gap-5 lg:min-h-0">
            {MEALS.map((m) => (
              <MealTile
                key={m.id}
                meal={m.id}
                label={m.label}
                hint={m.hint}
                kcal={(day?.entries ?? []).filter((e) => e.meal === m.id).reduce((s, e) => s + e.kcal, 0)}
                count={(day?.entries ?? []).filter((e) => e.meal === m.id).length}
                onOpen={() => setOpenMeal(m.id)}
                onAdd={() => onAdd(m.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* вода — в самом низу ленты, во всю ширину */}
      <section className="card mt-5 p-4 sm:p-5">
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
                  filled ? "border-water bg-waterwash text-water" : "border-line bg-field text-faint hover:text-water"
                }`}
              >
                <span key={`${i}-${filled}`} className={filled ? "drop-pop" : ""}>
                  <IDrop width={18} height={18} fill={filled ? "var(--color-water)" : "none"} strokeWidth={1.8} />
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2.5 text-[11px] text-faint">{water} из 8 стаканов · кликните, чтобы отметить</p>
      </section>

      {/* список продуктов приёма пищи */}
      {openMeal && (
        <MealSheet
          meal={openMeal}
          entries={(day?.entries ?? []).filter((e) => e.meal === openMeal).sort((a, b) => a.addedAt - b.addedAt)}
          onClose={() => setOpenMeal(null)}
          onAdd={() => { const m = openMeal; setOpenMeal(null); onAdd(m); }}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

function MealTile({
  meal,
  label,
  hint,
  kcal,
  count,
  onOpen,
  onAdd,
}: {
  meal: Meal;
  label: string;
  hint: string;
  kcal: number;
  count: number;
  onOpen: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="card group relative aspect-square overflow-hidden p-3.5 transition-transform duration-200 hover:-translate-y-0.5 sm:p-4 lg:aspect-auto lg:h-full lg:min-h-0">
      <button onClick={onOpen} aria-label={`Открыть ${label}`} className="absolute inset-0" />
      <button
        onClick={onAdd}
        aria-label={`Добавить в ${label}`}
        className="btn-press absolute right-2.5 top-2.5 z-10 grid size-8 place-items-center rounded-lg bg-leaf text-paperink"
      >
        <IPlus width={15} height={15} />
      </button>
      <div className="pointer-events-none relative flex h-full flex-col pr-8 pt-0.5">
        <h3 className="flex items-center gap-2 truncate font-display text-[13px] font-bold leading-tight sm:text-sm">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: MEAL_DOT[meal] }} />
          {label}
        </h3>
        <div className="flex flex-1 flex-col items-center justify-center">
          {kcal > 0 ? (
            <>
              <span className="font-display text-2xl font-extrabold text-carrot tabular-nums sm:text-3xl">{fmt(kcal)}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">ккал</span>
            </>
          ) : (
            <span className="font-display text-xl font-bold text-linesoft sm:text-2xl">—</span>
          )}
        </div>
        <p className="text-center text-[11px] text-faint">
          {count > 0 ? `${count} ${count === 1 ? "продукт" : count < 5 ? "продукта" : "продуктов"}` : hint}
        </p>
      </div>
    </div>
  );
}

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
  const [armed, setArmed] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const label = MEALS.find((m) => m.id === meal)?.label ?? "";
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
    <div className="fixed inset-0 z-[10000] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-ink/45 animate-fadein" onClick={onClose} />
      <div className="relative w-full sm:max-w-md max-h-[85dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-line bg-card animate-rise">
        <div className="sticky top-0 flex items-center justify-between border-b border-linesoft bg-card/95 backdrop-blur px-5 py-4">
          <div>
            <h2 className="font-display text-[15px] font-bold">{label}</h2>
            <p className="text-xs text-soft">{entries.length} записей · {fmt(subtotal)} ккал</p>
          </div>
          <button onClick={onClose} aria-label="Закрыть" className="btn-press rounded-lg border border-line bg-field p-1.5 text-soft hover:text-ink">
            <IX width={18} height={18} />
          </button>
        </div>
        {entries.length === 0 ? (
          <button onClick={onAdd} className="flex w-full flex-col items-center gap-1.5 px-6 py-10 text-faint hover:text-leaf">
            <IPlus width={20} height={20} />
            <span className="text-sm font-semibold">Добавить блюдо</span>
          </button>
        ) : (
          <ul className="px-3 py-2">
            {entries.map((e) => (
              <li key={e.id} className="group flex items-center gap-2 rounded-xl px-2 py-2 transition-colors hover:bg-field">
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
                  <button onClick={() => onEdit(e)} aria-label="Изменить" className="btn-press grid size-7 place-items-center rounded-md border border-line bg-card text-soft hover:text-ink">
                    <IPencil width={13} height={13} />
                  </button>
                  <button
                    onClick={() => armDelete(e)}
                    aria-label="Удалить"
                    className={`btn-press grid h-7 place-items-center rounded-md border px-1.5 text-[11px] font-bold ${
                      armed === e.id ? "border-danger bg-danger text-paperink" : "w-7 border-line bg-card text-soft hover:text-danger"
                    }`}
                  >
                    {armed === e.id ? "Точно?" : <ITrash width={13} height={13} />}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-linesoft px-5 py-3">
          <button onClick={onAdd} className="btn-press flex w-full items-center justify-center gap-2 rounded-xl bg-leaf px-4 py-2.5 text-sm font-bold text-paperink">
            <IPlus width={16} height={16} /> Добавить блюдо
          </button>
        </div>
      </div>
    </div>
  );
}

function IX({ width = 16, height = 16 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
