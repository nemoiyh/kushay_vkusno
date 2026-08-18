import { useMemo, useRef, useState } from "react";
import type { DayLog, Entry, Goals, Meal } from "../types";
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
        <div className="flex flex-col gap-5">
          <section className="card p-5">
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
                <p className="mt-2 text-xs leading-relaxed text-soft">
                  {totals.count === 0
                    ? "Дневник пуст — добавьте первый приём пищи."
                    : `Записей: ${totals.count} · ${Math.round(ratio * 100)}% дневной цели`}
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <MacroBar label="Белки" value={totals.p} goal={goals.p} color="var(--color-leaf)" wash="var(--color-leafwash)" />
              <MacroBar label="Жиры" value={totals.f} goal={goals.f} color="var(--color-amber)" wash="var(--color-amberwash)" />
              <MacroBar label="Углеводы" value={totals.c} goal={goals.c} color="var(--color-teal)" wash="var(--color-tealwash)" />
            </div>
          </section>

          {/* вода */}
          <section className="card p-5">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-[13px] font-bold">Вода</h3>
              <span className="text-xs font-semibold text-water tabular-nums">{water * 250} мл</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Array.from({ length: 8 }, (_, i) => {
                const filled = i < water;
                return (
                  <button
                    key={i}
                    onClick={() => onWater(i + 1 === water ? i : i + 1)}
                    aria-label={`Стакан ${i + 1}`}
                    className={`btn-press grid size-10 place-items-center rounded-xl border transition-colors ${
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
        </div>

        {/* приёмы пищи */}
        <div className="grid content-start gap-5 sm:grid-cols-2">
          {MEALS.map((m) => (
            <MealCard
              key={m.id}
              meal={m.id}
              label={m.label}
              hint={m.hint}
              entries={(day?.entries ?? []).filter((e) => e.meal === m.id).sort((a, b) => a.addedAt - b.addedAt)}
              locked={!isToday && dayKey > todayKey()}
              onAdd={() => onAdd(m.id)}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MealCard({
  meal,
  label,
  hint,
  entries,
  onAdd,
  onEdit,
  onDelete,
}: {
  meal: Meal;
  label: string;
  hint: string;
  entries: Entry[];
  locked: boolean;
  onAdd: () => void;
  onEdit: (e: Entry) => void;
  onDelete: (e: Entry) => void;
}) {
  const [armed, setArmed] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
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
    <section className="card group/card flex flex-col p-4 transition-transform duration-200 hover:-translate-y-0.5">
      <header className="flex items-center gap-2.5 border-b border-dashed border-line pb-3">
        <span className="size-2.5 rounded-full" style={{ background: MEAL_DOT[meal] }} />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[13px] font-bold leading-tight">{label}</h3>
          <p className="text-[11px] text-faint">{hint}</p>
        </div>
        {subtotal > 0 && (
          <span className="rounded-full bg-carrotwash px-2.5 py-1 text-xs font-bold text-carrot tabular-nums">
            {fmt(subtotal)} ккал
          </span>
        )}
        <button
          onClick={onAdd}
          aria-label={`Добавить в ${label.toLowerCase()}`}
          className="btn-press grid size-8 place-items-center rounded-lg bg-leaf text-paperink"
        >
          <IPlus width={16} height={16} />
        </button>
      </header>

      {entries.length === 0 ? (
        <button
          onClick={onAdd}
          className="mt-3 flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-7 text-faint transition-colors hover:border-leaf/50 hover:text-leaf"
        >
          <IPlus width={18} height={18} />
          <span className="text-xs font-semibold">Пока пусто — добавить блюдо</span>
        </button>
      ) : (
        <ul className="mt-2 space-y-1">
          {entries.map((e) => (
            <li
              key={e.id}
              className="group anim-in flex items-center gap-2 rounded-xl px-2 py-2 transition-colors hover:bg-field"
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
              <div className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                <button
                  onClick={() => onEdit(e)}
                  aria-label="Изменить"
                  className="btn-press grid size-7 place-items-center rounded-md border border-line bg-card text-soft hover:text-ink"
                >
                  <IPencil width={13} height={13} />
                </button>
                <button
                  onClick={() => armDelete(e)}
                  aria-label="Удалить"
                  className={`btn-press grid h-7 place-items-center rounded-md border px-1.5 text-[11px] font-bold ${
                    armed === e.id
                      ? "border-danger bg-danger text-paperink"
                      : "w-7 border-line bg-card text-soft hover:text-danger"
                  }`}
                >
                  {armed === e.id ? "Точно?" : <ITrash width={13} height={13} />}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
