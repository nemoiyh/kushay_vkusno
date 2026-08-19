import { lazy, Suspense, useMemo, useState } from "react";
import type { Entry, Food, Meal } from "../types";
import { FOODS, findFood } from "../data/foods";
import { fetchOffProduct } from "../lib/off";
import { MEALS, mealLabel, round1, uid } from "../lib/store";
import { Modal } from "./ui";
import { IAlert, IBarcode, ICheck, ISearch } from "./Icons";

// сканер подгружается по требованию, отдельным чанком
const BarcodeModal = lazy(() =>
  import("./BarcodeModal").then((m) => ({ default: m.BarcodeModal })),
);

export interface EntryDraftInput {
  meal: Meal;
  food?: Food;
  entry?: Entry; // режим редактирования
  barcode?: string; // подставлен из сканирования
  custom?: boolean; // сразу открыть вкладку «Свой продукт»
}

type ScanStatus =
  | { kind: "idle" }
  | { kind: "searching"; code: string }
  | { kind: "local"; food: Food }
  | { kind: "off"; food: Food }
  | { kind: "miss"; code: string };

function parseNum(s: string): number {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

export function AddEntryModal({
  input,
  onClose,
  onSave,
  customFoods,
  onSaveCustomFood,
}: {
  input: EntryDraftInput;
  onClose: () => void;
  onSave: (entry: Entry) => void;
  customFoods: Food[];
  onSaveCustomFood: (food: Omit<Food, "id">) => Food;
}) {
  const editing = input.entry;
  const editingFood = editing ? findFood(editing.foodId, customFoods) : undefined;
  const initialFood = input.food ?? editingFood ?? null;

  const [meal, setMeal] = useState<Meal>(input.meal);
  const [tab, setTab] = useState<"db" | "custom">(() => {
    if (input.custom) return "custom";
    if (editing && !editingFood) return "custom";
    if (input.barcode && !initialFood) return "custom";
    // продукт из Open Food Facts ещё не в базе — сразу на вкладку «Свой продукт»
    if (initialFood && !findFood(initialFood.id, customFoods)) return "custom";
    return "db";
  });
  const [query, setQuery] = useState("");
  const [food, setFood] = useState<Food | null>(initialFood);
  const [grams, setGrams] = useState<string>(() => {
    if (editing) return String(editing.grams);
    if (initialFood) return String(initialFood.unit?.grams ?? 100);
    return "100";
  });
  const [barcode, setBarcode] = useState<string | undefined>(
    () => input.barcode ?? initialFood?.barcode ?? editingFood?.barcode,
  );
  const [scanOpen, setScanOpen] = useState(false);
  const [status, setStatus] = useState<ScanStatus>(
    () =>
      input.barcode && !initialFood
        ? { kind: "miss", code: input.barcode }
        : { kind: "idle" },
  );

  // свой продукт (значения на 100 г)
  const fromEntry = (v: number) =>
    editing && editing.grams > 0 ? String(round1((v * 100) / editing.grams)) : "0";
  const initCustom = !editingFood && initialFood ? initialFood : null;
  const [cName, setCName] = useState(() => {
    if (editing && !editingFood) return editing.name;
    if (initCustom) return initCustom.name;
    return "";
  });
  const [cKcal, setCKcal] = useState(() =>
    initCustom ? String(initCustom.kcal) : editing && !editingFood ? fromEntry(editing.kcal) : "0",
  );
  const [cP, setCP] = useState(() =>
    initCustom ? String(initCustom.p) : editing && !editingFood ? fromEntry(editing.p) : "0",
  );
  const [cF, setCF] = useState(() =>
    initCustom ? String(initCustom.f) : editing && !editingFood ? fromEntry(editing.f) : "0",
  );
  const [cC, setCC] = useState(() =>
    initCustom ? String(initCustom.c) : editing && !editingFood ? fromEntry(editing.c) : "0",
  );
  const [touched, setTouched] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = [...customFoods, ...FOODS];
    const list = q
      ? all.filter((f) => f.name.toLowerCase().includes(q) || f.cat.toLowerCase().includes(q))
      : all;
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [query, customFoods]);

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
      kcal: Math.round((parseNum(cKcal) || 0) * k),
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

  /* ------- сканирование ------- */

  const handleScanned = async (code: string) => {
    setScanOpen(false);
    setStatus({ kind: "searching", code });
    // 1. локальная база + продукты пользователя
    const local = customFoods.find((f) => f.barcode === code) ?? FOODS.find((f) => f.barcode === code);
    if (local) {
      setTab("db");
      setFood(local);
      setGrams(String(local.unit?.grams ?? 100));
      setBarcode(local.barcode ?? code);
      setStatus({ kind: "local", food: local });
      return;
    }
    // 2. Open Food Facts
    const off = await fetchOffProduct(code);
    if (off) {
      setTab("custom");
      setCName(off.name);
      setCKcal(String(off.kcal));
      setCP(String(off.p));
      setCF(String(off.f));
      setCC(String(off.c));
      setBarcode(code);
      setStatus({ kind: "off", food: off });
      return;
    }
    setTab("custom");
    setBarcode(code);
    setStatus({ kind: "miss", code });
  };

  const submit = () => {
    setTouched(true);
    if (!canSave) return;
    if (tab === "db" && food) {
      onSave({
        id: editing?.id ?? uid(),
        foodId: food.id,
        name: food.name,
        grams: Math.round(g),
        meal,
        addedAt: editing?.addedAt ?? Date.now(),
        ...preview,
      });
      return;
    }
    // свой продукт: сохраняем в «Мои продукты» (со штрихкодом, если есть)
    const saved = onSaveCustomFood({
      name: cName.trim(),
      cat: "Мои продукты",
      kcal: Math.round(parseNum(cKcal) || 0),
      p: round1(parseNum(cP) || 0),
      f: round1(parseNum(cF) || 0),
      c: round1(parseNum(cC) || 0),
      barcode: barcode || undefined,
    });
    onSave({
      id: editing?.id ?? uid(),
      foodId: saved.id,
      name: saved.name,
      grams: Math.round(g),
      meal,
      addedAt: editing?.addedAt ?? Date.now(),
      ...preview,
    });
  };

  const quick = [50, 100, 150, 200];

  return (
    <>
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
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ISearch width={16} height={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                <input
                  className="field field-icon"
                  placeholder="Найти продукт… например, гречка"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <button
                onClick={() => setScanOpen(true)}
                className="btn-press flex shrink-0 items-center gap-1.5 rounded-xl bg-ink px-3.5 text-[13px] font-bold text-paperink"
              >
                <IBarcode width={16} height={16} />
                <span className="hidden sm:inline">Сканер</span>
              </button>
            </div>

            <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-line">
              {results.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-faint">
                  Ничего не нашлось. Попробуйте другое название или отсканируйте штрихкод.
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
                        if (f.barcode) setBarcode(f.barcode);
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
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium">{f.name}</span>
                          {f.barcode && <IBarcode width={11} height={11} className="shrink-0 text-faint" />}
                        </span>
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
          <div className="mt-4">
            {/* статус сканирования */}
            {status.kind !== "idle" && (
              <div
                className={`anim-in mb-3 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
                  status.kind === "miss"
                    ? "bg-amberwash text-amber"
                    : status.kind === "searching"
                      ? "bg-waterwash text-water"
                      : "bg-leafwash text-leafdeep"
                }`}
              >
                {status.kind === "miss" ? (
                  <IAlert width={15} height={15} className="shrink-0" />
                ) : (
                  <IBarcode width={15} height={15} className="shrink-0" />
                )}
                <span className="tabular-nums">
                  {status.kind === "searching" && `Ищем штрихкод ${status.code}…`}
                  {status.kind === "local" && `Найдено в вашей базе: ${status.food.name}`}
                  {status.kind === "off" && `Найдено в Open Food Facts: ${status.food.name}`}
                  {status.kind === "miss" &&
                    `Штрихкод ${status.code} не найден — заполните название и КБЖУ с упаковки`}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
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

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setScanOpen(true)}
                className="btn-press flex items-center gap-1.5 rounded-lg border border-line bg-field px-3 py-1.5 text-xs font-bold text-soft hover:text-ink"
              >
                <IBarcode width={14} height={14} /> {barcode ? "Сканировать другой" : "Отсканировать штрихкод"}
              </button>
              {barcode && (
                <span className="flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold text-paperink tabular-nums">
                  <IBarcode width={12} height={12} /> {barcode}
                  <button onClick={() => setBarcode(undefined)} aria-label="Убрать штрихкод" className="opacity-60 hover:opacity-100">✕</button>
                </span>
              )}
              <span className="text-[11px] text-faint">
                Продукт сохранится в «Мои продукты» и будет находиться по штрихкоду
              </span>
            </div>
          </div>
        )}

        {/* вес порции */}
        <div className="mt-4 rounded-xl border border-line bg-field/70 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-semibold text-soft">Вес порции, г</label>
            {tab === "db" && food?.unit && (
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
                  {v.toLocaleString("ru-RU")}
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

      {scanOpen && (
        <Suspense fallback={null}>
          <BarcodeModal onCode={handleScanned} onClose={() => setScanOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
