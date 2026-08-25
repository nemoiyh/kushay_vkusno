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

  const [modal, setModal] = useState<{ meal: Meal; items: Entry[] } | null>(null);

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

      {/* заголовок секции — над обеими колонками, поэтому верхняя грань «Завтрака»
          совпадает с верхней гранью квадрата КБЖУ */}
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-[15px] font-extrabold sm:text-base">Приёмы пищи</h2>
        <span className="hidden text-[11px] font-medium text-faint lg:block">
          нажмите на плитку — откроется список блюд
        </span>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        {/* квадрат КБЖУ: на десктопе его грани совпадают с гранями плиток */}
        <section className="card flex flex-col p-5 lg:h-full">
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
                {totals.count === 0 ? "Дневник пуст — добавьте первый приём пищи." : "Цель по калориям на день"}
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <MacroBar label="Белки" value={totals.p} goal={goals.p} color="var(--color-leaf)" wash="var(--color-leafwash)" />
            <MacroBar label="Жиры" value={totals.f} goal={goals.f} color="var(--color-amber)" wash="var(--color-amberwash)" />
            <MacroBar label="Углеводы" value={totals.c} goal={goals.c} color="var(--color-teal)" wash="var(--color-tealwash)" />
          </div>
        </section>

        {/* плитки приёмов пищи */}
        <div className="flex min-w-0 flex-col lg:h-full lg:min-h-0">
          <div className="grid flex-1 grid-cols-2 gap-3 sm:gap-4 lg:grid-rows-2 lg:gap-5 lg:min-h-0">
            {MEALS.map((m) => {
              const items = (day?.entries ?? []).filter((e) => e.meal === m.id);
              const sub = items.reduce((s, e) => s + e.kcal, 0);
              return (
                <MealTile
                  key={m.id}
                  meal={m.id}
                  label={m.label}
                  hint={m.hint}
                  kcal={sub}
                  count={items.length}
                  onOpen={() => setModal({ meal: m.id, items: [...items].sort((a, b) => a.addedAt - b.addedAt) })}
                  onAdd={() => onAdd(m.id)}
                />
              );
            })}
          </div>

        </div>
      </div>

      {/* вода — в самом низу ленты, во всю ширину страницы */}
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

      {/* список продуктов приёма пищи */}
      {modal && (
        <Modal
          title={MEALS.find((m) => m.id === modal.meal)?.label ?? ""}
          subtitle={`${modal.items.length} ${plural(modal.items.length, "продукт", "продукта", "продуктов")} · ${fmt(
            modal.items.reduce((s, e) => s + e.kcal, 0),
          )} ккал`}
          onClose={() => setModal(null)}
        >
          {modal.items.length === 0 ? (
            <button
              onClick={() => {
                const meal = modal.meal;
                setModal(null);
                onAdd(meal);
              }}
              className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed border-line py-10 text-faint transition-colors hover:border-leaf/50 hover:text-leaf"
            >
              <IPlus width={20} height={20} />
              <span className="text-sm font-semibold">Добавить продукт</span>
            </button>
          ) : (
            <ul className="space-y-1">
              {modal.items.map((e) => (
                <li
                  key={e.id}
                  className="anim-in flex items-center gap-2 rounded-xl px-2 py-2.5 transition-colors hover:bg-field"
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
                      <IPencil width={13} height={13} />
                    </button>
                    <ArmDelete onDelete={() => onDelete(e)} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={() => {
              const meal = modal.meal;
              setModal(null);
              onAdd(meal);
            }}
            className="btn-press mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-leaf px-4 py-3 text-sm font-bold text-paperink"
          >
            <IPlus width={16} height={16} /> Добавить продукт
          </button>
        </Modal>
      )}
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

/* ---------- квадратная плитка приёма пищи ---------- */

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
      {/* вся плитка кликабельна */}
      <button onClick={onOpen} aria-label={`Открыть ${label}`} className="absolute inset-0" />

      <button
        onClick={onAdd}
        aria-label={`Добавить в ${label.toLowerCase()}`}
        className="btn-press absolute right-2.5 top-2.5 z-10 grid size-8 place-items-center rounded-lg bg-leaf text-paperink sm:right-3 sm:top-3"
      >
        <IPlus width={15} height={15} />
      </button>

      <div className="pointer-events-none relative flex h-full flex-col pr-8 pt-0.5">
        <h3 className="flex items-center gap-2 truncate font-display text-[13px] font-bold leading-tight sm:text-sm">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: MEAL_DOT[meal] }} />
          {label}
        </h3>

        <div className="flex flex-1 flex-col items-center justify-center gap-0.5">
          <span
            className={`font-display text-[26px] font-extrabold leading-none tabular-nums transition-colors sm:text-3xl ${
              kcal > 0 ? "text-carrot" : "text-line"
            }`}
          >
            {kcal > 0 ? fmt(kcal) : "0"}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">ккал</span>
        </div>

        <p className="truncate text-center text-[11px] font-medium text-faint">
          {count > 0
            ? `${count} ${plural(count, "продукт", "продукта", "продуктов")}`
            : hint}
        </p>
      </div>
    </div>
  );
}

/* ---------- кнопка удаления с подтверждением ---------- */

function ArmDelete({ onDelete }: { onDelete: () => void }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  const click = () => {
    if (armed) {
      onDelete();
      return;
    }
    setArmed(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setArmed(false), 2600);
  };
  return (
    <button
      onClick={click}
      aria-label="Удалить"
      className={`btn-press grid h-8 place-items-center rounded-lg border px-2 text-[11px] font-bold ${
        armed
          ? "border-danger bg-danger text-paperink"
          : "w-8 border-line bg-card text-soft hover:text-danger"
      }`}
    >
      {armed ? "Точно?" : <ITrash width={13} height={13} />}
    </button>
  );
}
