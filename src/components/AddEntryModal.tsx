import { useMemo, useState } from "react";
import type { Entry, Food, Meal } from "../types";
import { FOODS, findFood } from "../data/foods";
import { MEALS, mealLabel, round1, uid } from "../lib/store";
import { Modal } from "./ui";
import { ICheck, ISearch } from "./Icons";

export interface EntryDraftInput {
  meal: Meal;
  food?: Food;
  entry?: Entry; // режим редактирования
}

function parseNum(s: string): number {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

export function AddEntryModal({
  input,
  onClose,
  onSave,
}: {
  input: EntryDraftInput;
  onClose: () => void;
  onSave: (entry: Entry) => void;
}) {
  const editing = input.entry;
  const [meal, setMeal] = useState<Meal>(input.meal);
  const [tab, setTab] = useState<"db" | "custom">(() => {
    if (editing && !findFood(editing.foodId)) return "custom";
    return "db";
  });
  const [query, setQuery] = useState("");
  const [food, setFood] = useState<Food | null>(() => {
    if (editing) return findFood(editing.foodId) ?? null;
    return input.food ?? null;
  });
  const [grams, setGrams] = useState<string>(() => {
    if (editing) return String(editing.grams);
    if (input.food) return String(input.food.unit?.grams ?? 100);
    return "100";
  });

  // свой продукт (значения на 100 г)
  const [cName, setCName] = useState(editing && !findFood(editing.foodId) ? editing.name : "");
  const back = (v: number) =>
    editing && editing.grams > 0 ? String(round1((v * 100) / editing.grams)) : "0";
  const [cKcal, setCKcal] = useState(() => back(editing?.kcal ?? 0));
  const [cP, setCP] = useState(() => back(editing?.p ?? 0));
  const [cF, setCF] = useState(() => back(editing?.f ?? 0));
  const [cC, setCC] = useState(() => back(editing?.c ?? 0));
  const [touched, setTouched] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? FOODS.filter((f) => f.name.toLowerCase().includes(q) || f.cat.toLowerCase().includes(q))
      : FOODS;
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [query]);

  const g = parseNum(grams);
  const gramsOk = Number.isFinite(g) && g > 0 && g <= 2000;

  const preview = useMemo(() => {
    const gg = gramsOk ? g : 0;
    if (tab === "db" && food) {
      const k = gg / 100;
      return {
        kcal: Math.round(food.kcal * k),
        p: round1(food.p * k),
        f: round1(food.f * k),
        c: round1(food.c * k),
      };
    }
    const k = gg / 100;
    return {
      kcal: Math.round(parseNum(cKcal) * k || 0),
      p: round1((parseNum(cP) || 0) * k),
      f: round1((parseNum(cF) || 0) * k),
      c: round1((parseNum(cC) || 0) * k),
    };
  }, [tab, food, g, gramsOk, cKcal, cP, cF, cC]);

  const nameOk = tab === "db" ? !!food : cName.trim().length >= 2;
  const canSave = nameOk && gramsOk && preview.kcal >= 0;
  const problem = !nameOk
    ? tab === "db"
      ? "Выберите продукт из списка"
      : "Укажите название (минимум 2 символа)"
    : !gramsOk
      ? "Вес порции — от 1 до 2000 г"
      : "";

  const submit = () => {
    setTouched(true);
    if (!canSave) return;
    const entry: Entry =
      tab === "db" && food
        ? {
            id: editing?.id ?? uid(),
            foodId: food.id,
            name: food.name,
            grams: Math.round(g),
            meal,
            addedAt: editing?.addedAt ?? Date.now(),
            ...preview,
          }
        : {
            id: editing?.id ?? uid(),
            name: cName.trim(),
            grams: Math.round(g),
            meal,
            addedAt: editing?.addedAt ?? Date.now(),
            ...preview,
          };
    onSave(entry);
  };

  const quick = [50, 100, 150, 200];

  return (
    <Modal
      title={editing ? "Изменить запись" : "Добавить в дневник"}
      subtitle="Значения рассчитываются по весу порции"
      onClose={onClose}
    >
      {/* приём пищи */}
      <div className="flex flex-wrap gap-1.5">
        {MEALS.map((m) => (
          <button
            key={m.id}
            onClick={() => setMeal(m.id)}
            className={`btn-press rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${
              meal === m.id
                ? "border-leaf bg-leaf text-paperink"
                : "border-line bg-field text-soft hover:text-ink"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* вкладки */}
      <div className="mt-4 grid grid-cols-2 rounded-xl border border-line bg-field p-1 text-[13px] font-semibold">
        {(["db", "custom"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg py-1.5 transition-colors ${
              tab === t ? "bg-ink text-paperink" : "text-soft hover:text-ink"
            }`}
          >
            {t === "db" ? "Из базы продуктов" : "Свой продукт"}
          </button>
        ))}
      </div>

      {tab === "db" ? (
        <div className="mt-4">
          <div className="relative">
            <ISearch width={16} height={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              className="field pl-9"
              placeholder="Найти продукт… например, гречка"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-line">
            {results.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-faint">
                Ничего не нашлось. Попробуйте другое название или добавьте свой продукт.
              </p>
            ) : (
              results.map((f) => {
                const active = food?.id === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => {
                      setFood(f);
                      setGrams(String(f.unit?.grams ?? 100));
                    }}
                    className={`flex w-full items-center gap-3 border-b border-linesoft px-3.5 py-2.5 text-left transition-colors last:border-0 ${
                      active ? "bg-leafwash" : "hover:bg-field"
                    }`}
                  >
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded-full border ${
                        active ? "border-leaf bg-leaf text-paperink" : "border-line text-transparent"
                      }`}
                    >
                      <ICheck width={11} height={11} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{f.name}</span>
                      <span className="block text-[11px] text-faint">{f.cat}</span>
                    </span>
                    <span className="text-right text-sm">
                      <b className="text-carrot tabular-nums">{f.kcal}</b>
                      <span className="block text-[11px] text-faint">ккал / 100 г</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          <div className="col-span-2 sm:col-span-5">
            <label className="mb-1 block text-xs font-semibold text-soft">Название</label>
            <input
              className={`field ${touched && !nameOk ? "field-invalid" : ""}`}
              placeholder="Например, домашний суп"
              value={cName}
              onChange={(e) => setCName(e.target.value)}
            />
          </div>
          {(
            [
              ["Ккал / 100 г", cKcal, setCKcal, "var(--color-carrot)"],
              ["Белки, г", cP, setCP, "var(--color-leaf)"],
              ["Жиры, г", cF, setCF, "var(--color-amber)"],
              ["Углеводы, г", cC, setCC, "var(--color-teal)"],
            ] as const
          ).map(([label, val, set, color]) => (
            <div key={label} className="col-span-1">
              <label className="mb-1 block text-xs font-semibold" style={{ color }}>{label}</label>
              <input
                className="field tabular-nums"
                inputMode="decimal"
                value={val}
                onChange={(e) => set(e.target.value)}
              />
            </div>
          ))}
          <div className="col-span-1 flex items-end pb-1 text-[11px] leading-tight text-faint">
            на 100 г продукта
          </div>
        </div>
      )}

      {/* вес порции */}
      <div className="mt-4 rounded-xl border border-line bg-field/70 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <label className="text-xs font-semibold text-soft">Вес порции, г</label>
          {food?.unit && (
            <button
              onClick={() => setGrams(String(food.unit!.grams))}
              className="btn-press rounded-full border border-leaf/40 bg-leafwash px-2.5 py-0.5 text-[11px] font-semibold text-leafdeep"
            >
              {food.unit.label} ≈ {food.unit.grams} г
            </button>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            className={`field w-28 text-center text-base font-bold tabular-nums ${
              touched && !gramsOk ? "field-invalid" : ""
            }`}
            inputMode="decimal"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
          />
          {quick.map((q) => (
            <button
              key={q}
              onClick={() => setGrams(String(q))}
              className={`btn-press rounded-lg border px-2.5 py-1.5 text-xs font-semibold tabular-nums ${
                gramsOk && Math.round(g) === q
                  ? "border-ink bg-ink text-paperink"
                  : "border-line bg-card text-soft hover:text-ink"
              }`}
            >
              {q}
            </button>
          ))}
        </div>

        {/* живой расчёт */}
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {(
            [
              ["ккал", preview.kcal, "var(--color-carrot)", "var(--color-carrotwash)"],
              ["белки", preview.p, "var(--color-leaf)", "var(--color-leafwash)"],
              ["жиры", preview.f, "var(--color-amber)", "var(--color-amberwash)"],
              ["углев.", preview.c, "var(--color-teal)", "var(--color-tealwash)"],
            ] as const
          ).map(([label, v, color, wash]) => (
            <div key={label} className="rounded-lg px-1 py-2" style={{ background: wash }}>
              <div className="font-display text-sm font-bold tabular-nums" style={{ color }}>
                {typeof v === "number" ? v.toLocaleString("ru-RU") : v}
              </div>
              <div className="text-[10px] font-medium text-soft">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {touched && problem && (
        <p className="mt-2 text-xs font-medium text-danger">{problem}</p>
      )}

      <div className="mt-4 flex gap-2.5">
        <button
          onClick={onClose}
          className="btn-press rounded-xl border border-line bg-field px-5 py-2.5 text-sm font-semibold text-soft hover:text-ink"
        >
          Отмена
        </button>
        <button
          onClick={submit}
          disabled={touched && !canSave}
          className="btn-press flex-1 rounded-xl bg-leaf px-5 py-2.5 text-sm font-bold text-paperink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {editing ? "Сохранить" : "Добавить"} в «{mealLabel(meal)}» · {preview.kcal.toLocaleString("ru-RU")} ккал
        </button>
      </div>
    </Modal>
  );
}
