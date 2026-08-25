import { useMemo, useState } from "react";
import type { Food, RecipeIngredient } from "../types";
import { FOODS } from "../data/foods";
import { round1, uid } from "../lib/store";
import { Modal } from "./ui";
import { IChefHat, IPlus, ISearch, ITrash } from "./Icons";

interface Row {
  key: string;
  food: Food;
  grams: string;
}

const num = (s: string) => {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

export function RecipeBuilderModal({
  customFoods,
  onClose,
  onSave,
}: {
  customFoods: Food[];
  onClose: () => void;
  onSave: (r: { name: string; ingredients: RecipeIngredient[] }) => void;
}) {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [touched, setTouched] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return [...customFoods, ...FOODS]
      .filter((f) => f.name.toLowerCase().includes(q) || f.cat.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, "ru"))
      .slice(0, 30);
  }, [query, customFoods]);

  const addIngredient = (food: Food) => {
    setRows((prev) => {
      const ex = prev.find((r) => r.food.id === food.id);
      const add = food.unit?.grams ?? 100;
      if (ex) {
        const cur = num(ex.grams);
        return prev.map((r) =>
          r.food.id === food.id
            ? { ...r, grams: String(Math.round((Number.isFinite(cur) ? cur : 0) + add)) }
            : r,
        );
      }
      return [...prev, { key: uid(), food, grams: String(add) }];
    });
    setQuery("");
  };

  const setGrams = (key: string, grams: string) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, grams } : r)));

  const removeRow = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key));

  const totals = useMemo(
    () =>
      rows.reduce(
        (a, r) => {
          const g = num(r.grams);
          const gg = Number.isFinite(g) && g > 0 ? g : 0;
          const k = gg / 100;
          return {
            grams: a.grams + gg,
            kcal: a.kcal + r.food.kcal * k,
            p: a.p + r.food.p * k,
            f: a.f + r.food.f * k,
            c: a.c + r.food.c * k,
          };
        },
        { grams: 0, kcal: 0, p: 0, f: 0, c: 0 },
      ),
    [rows],
  );

  const nameOk = name.trim().length >= 2;
  const rowsOk =
    rows.length > 0 &&
    rows.every((r) => {
      const g = num(r.grams);
      return Number.isFinite(g) && g > 0 && g <= 3000;
    });

  const submit = () => {
    setTouched(true);
    if (!nameOk || !rowsOk) return;
    onSave({
      name: name.trim(),
      ingredients: rows.map((r) => {
        const grams = Math.round(num(r.grams));
        const k = grams / 100;
        return {
          foodId: r.food.id,
          name: r.food.name,
          grams,
          kcal: Math.round(r.food.kcal * k),
          p: round1(r.food.p * k),
          f: round1(r.food.f * k),
          c: round1(r.food.c * k),
        };
      }),
    });
  };

  return (
    <Modal
      title="Новое блюдо"
      subtitle="Соберите блюдо из ингредиентов — КБЖУ посчитается автоматически"
      onClose={onClose}
    >
      <label className="mb-1 block text-xs font-semibold text-soft">Название блюда</label>
      <input
        className={`field ${touched && !nameOk ? "field-invalid" : ""}`}
        placeholder="Например, Омлет, Борщ домашний"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="relative mt-4">
        <ISearch width={16} height={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
        <input
          className="field pl-10"
          placeholder="Найти ингредиент: яйцо, молоко…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {results.length > 0 && (
        <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-line">
          {results.map((f) => (
            <button
              key={f.id}
              onClick={() => addIngredient(f)}
              className="flex w-full items-center gap-3 border-b border-linesoft px-3.5 py-2 text-left transition-colors last:border-0 hover:bg-field"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{f.name}</span>
                <span className="block text-[11px] text-faint">{f.cat}</span>
              </span>
              <span className="text-sm font-bold text-carrot tabular-nums">{f.kcal}</span>
              <span className="grid size-6 place-items-center rounded-md bg-leafwash text-leafdeep">
                <IPlus width={13} height={13} />
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-line bg-field/60 p-3.5">
        <div className="flex items-center gap-2">
          <IChefHat width={16} height={16} className="text-soft" />
          <h3 className="text-xs font-bold uppercase tracking-wide text-soft">Ингредиенты</h3>
          <span className="ml-auto text-[11px] text-faint tabular-nums">{Math.round(totals.grams)} г</span>
        </div>

        {rows.length === 0 ? (
          <p className="mt-3 rounded-lg bg-paper px-3 py-3 text-center text-xs text-faint">
            Пока пусто. Найдите ингредиент выше и нажмите на него.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {rows.map((r) => (
              <li key={r.key} className="anim-in flex items-center gap-2 rounded-lg bg-card px-2.5 py-1.5">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.food.name}</span>
                <input
                  className="field h-8 w-16 px-2 py-0 text-center text-sm tabular-nums"
                  inputMode="decimal"
                  value={r.grams}
                  onChange={(e) => setGrams(r.key, e.target.value)}
                />
                <span className="text-[11px] text-faint">г</span>
                <button
                  onClick={() => removeRow(r.key)}
                  aria-label={`Убрать ${r.food.name}`}
                  className="btn-press grid size-7 place-items-center rounded-md border border-line text-soft hover:text-danger"
                >
                  <ITrash width={13} height={13} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {(
            [
              ["ккал", Math.round(totals.kcal), "var(--color-carrot)", "var(--color-carrotwash)"],
              ["белки", round1(totals.p), "var(--color-leaf)", "var(--color-leafwash)"],
              ["жиры", round1(totals.f), "var(--color-amber)", "var(--color-amberwash)"],
              ["углев.", round1(totals.c), "var(--color-teal)", "var(--color-tealwash)"],
            ] as const
          ).map(([label, v, color, wash]) => (
            <div key={label} className="rounded-lg px-1 py-2" style={{ background: wash }}>
              <div className="font-display text-sm font-bold tabular-nums" style={{ color }}>
                {v.toLocaleString("ru-RU")}
              </div>
              <div className="text-[10px] font-medium text-soft">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {touched && !nameOk && (
        <p className="mt-2 text-xs font-medium text-danger">Название — минимум 2 символа</p>
      )}
      {touched && nameOk && !rowsOk && (
        <p className="mt-2 text-xs font-medium text-danger">
          Добавьте хотя бы один ингредиент и проверьте вес (1–3000 г)
        </p>
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
          className="btn-press flex-1 rounded-xl bg-leaf px-5 py-2.5 text-sm font-bold text-paperink"
        >
          Сохранить блюдо
        </button>
      </div>
    </Modal>
  );
}
