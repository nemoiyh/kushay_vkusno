import { useEffect, useMemo, useRef, useState } from "react";
import type { AppData, Food, Meal, Recipe, RecipeIngredient } from "../types";
import { decodeEntities, fmt, MEALS } from "../lib/store";
import { FOODS } from "../data/foods";
import { offToFood, searchOffProducts, type OffProduct, type OffSearchState } from "../lib/openFoodFacts";
import { Modal } from "./ui";
import {
  IApple,
  IBarcode,
  ICheck,
  IClock,
  IGlobe,
  IPlus,
  ISearch,
  IStar,
  ITrash,
  IX,
} from "./Icons";

type Tab = "recent" | "frequent" | "favs" | "meals";

export function DatabaseView({
  days,
  customFoods,
  recipes,
  favorites,
  usage,
  onPickToMeal,
  onPickRecipe,
  onDeleteCustomFood,
  onToggleFavorite,
  onSaveOffFood,
  onAddRecipe,
  onDeleteRecipe,
  onAddCustomFood,
}: {
  days: AppData["days"];
  customFoods: Food[];
  recipes: Recipe[];
  favorites: string[];
  usage: AppData["usage"];
  onPickToMeal: (food: Food, meal: Meal, grams: number) => void;
  onPickRecipe: (recipe: Recipe, meal: Meal, grams: number) => void;
  onDeleteCustomFood: (id: string) => void;
  onToggleFavorite: (id: string, name: string) => void;
  onSaveOffFood: (food: Food) => Food;
  onAddRecipe: (r: { name: string; ingredients: RecipeIngredient[] }) => void;
  onDeleteRecipe: (id: string) => void;
  onAddCustomFood: () => void;
}) {
  const [tab, setTab] = useState<Tab>("recent");
  const [query, setQuery] = useState("");
  const [picker, setPicker] = useState<Food | null>(null);
  const [recipePicker, setRecipePicker] = useState<Recipe | null>(null);
  const [recipeBuilder, setRecipeBuilder] = useState(false);

  // недавние: из дневника + свои продукты (по времени использования)
  const recentFoods = useMemo(() => {
    const seen = new Map<string, number>();
    Object.values(days).forEach((d) =>
      d.entries.forEach((e) => {
        if (e.foodId) seen.set(e.foodId, Math.max(seen.get(e.foodId) ?? 0, e.addedAt));
      }),
    );
    customFoods.forEach((f) => seen.set(f.id, Math.max(seen.get(f.id) ?? 0, f.createdAt ?? 0)));
    const all = [...FOODS, ...customFoods];
    return [...seen.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([id]) => all.find((f) => f.id === id))
      .filter((f): f is Food => !!f);
  }, [days, customFoods]);

  // частые: по счётчику использований
  const frequentFoods = useMemo(() => {
    const all = [...FOODS, ...customFoods, ...recipes.map(recipeToFood)];
    return Object.entries(usage)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20)
      .map(([id, u]) => ({ food: all.find((f) => f.id === id), u }))
      .filter((x): x is { food: Food; u: (typeof usage)[string] } => !!x.food);
  }, [usage, customFoods, recipes]);

  const favFoods = useMemo(() => {
    const all = [...FOODS, ...customFoods];
    return favorites.map((id) => all.find((f) => f.id === id)).filter((f): f is Food => !!f);
  }, [favorites, customFoods]);

  const filteredLocal = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return [...FOODS, ...customFoods]
      .filter((f) => f.name.toLowerCase().includes(q) || f.cat.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, "ru"))
      .slice(0, 20);
  }, [query, customFoods]);

  return (
    <div className="anim-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold sm:text-2xl">Продукты</h1>
          <p className="mt-1 text-sm text-soft">{fmt(FOODS.length + customFoods.length)} продуктов · КБЖУ на 100 г</p>
        </div>
        <button
          onClick={onAddCustomFood}
          className="btn-press flex items-center gap-2 rounded-xl bg-leaf px-3.5 py-2.5 text-[13px] font-bold text-paperink"
        >
          <IPlus width={15} height={15} /> Свой продукт
        </button>
      </div>

      {/* поиск */}
      <div className="mt-4 flex flex-col gap-4">
        <SearchBox
          query={query}
          onQuery={setQuery}
          localResults={filteredLocal}
          favs={favorites}
          onFav={onToggleFavorite}
          onAdd={(f) => setPicker(f)}
          onSaveOffFood={onSaveOffFood}
        />

        {/* вкладки */}
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
          {(
            [
              ["recent", "Недавние"],
              ["frequent", "Частые"],
              ["favs", "Избранное"],
              ["meals", "Мои блюда"],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`btn-press shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                tab === id ? "border-ink bg-ink text-paperink" : "border-line bg-card text-soft hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* контент вкладки (когда нет активного поиска) */}
      {!query && (
        <div className="card mt-4 overflow-hidden">
          {tab === "recent" && (
            recentFoods.length === 0 ? (
              <EmptyState text="Здесь появятся недавно добавленные продукты." />
            ) : (
              <FoodList foods={recentFoods} favs={favorites} onFav={onToggleFavorite} onAdd={(f) => setPicker(f)} />
            )
          )}
          {tab === "frequent" && (
            frequentFoods.length === 0 ? (
              <EmptyState text="Добавляйте продукты в дневник — самые частые появятся здесь." />
            ) : (
              <ul>
                {frequentFoods.map(({ food, u }) => (
                  <FoodRow
                    key={food.id}
                    food={food}
                    fav={favorites.includes(food.id)}
                    onFav={() => onToggleFavorite(food.id, food.name)}
                    onAdd={() => setPicker(food)}
                    badge={`×${u.count}`}
                    metaLine={`${u.count} раз · обычно ${u.grams} г`}
                  />
                ))}
              </ul>
            )
          )}
          {tab === "favs" && (
            favFoods.length === 0 ? (
              <EmptyState text="Отмечайте продукты звёздочкой — они соберутся здесь." />
            ) : (
              <FoodList foods={favFoods} favs={favorites} onFav={onToggleFavorite} onAdd={(f) => setPicker(f)} />
            )
          )}
          {tab === "meals" && (
            <div>
              <div className="border-b border-linesoft px-4 py-3">
                <button
                  onClick={() => setRecipeBuilder(true)}
                  className="btn-press flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-leaf/50 bg-leafwash/40 px-4 py-3 text-sm font-bold text-leafdeep hover:bg-leafwash"
                >
                  <IPlus width={17} height={17} /> Создать блюдо
                </button>
              </div>
              {recipes.length === 0 ? (
                <EmptyState text="Соберите блюдо из ингредиентов — КБЖУ посчитается автоматически." />
              ) : (
                <ul>
                  {recipes.map((r) => (
                    <RecipeRow
                      key={r.id}
                      recipe={r}
                      onAdd={() => setRecipePicker(r)}
                      onDel={() => onDeleteRecipe(r.id)}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* выбор приёма пищи + граммовки для продукта */}
      {picker && (
        <MealGramsPicker
          title={picker.name}
          defaultGrams={usage[picker.id]?.grams ?? picker.unit?.grams ?? 100}
          onClose={() => setPicker(null)}
          onConfirm={(meal, grams) => { onPickToMeal(picker, meal, grams); setPicker(null); }}
        />
      )}
      {recipePicker && (
        <MealGramsPicker
          title={recipePicker.name}
          defaultGrams={usage[recipePicker.id]?.grams ?? recipeTotalsGrams(recipePicker)}
          onClose={() => setRecipePicker(null)}
          onConfirm={(meal, grams) => { onPickRecipe(recipePicker, meal, grams); setRecipePicker(null); }}
        />
      )}
      {recipeBuilder && (
        <RecipeBuilder
          onClose={() => setRecipeBuilder(false)}
          onSave={(r) => { onAddRecipe(r); setRecipeBuilder(false); }}
        />
      )}
    </div>
  );
}

function recipeToFood(r: Recipe): Food {
  const t = r.ingredients.reduce((a, i) => ({ kcal: a.kcal + i.kcal, p: a.p + i.p, f: a.f + i.f, c: a.c + i.c, g: a.g + i.grams }), { kcal: 0, p: 0, f: 0, c: 0, g: 0 });
  const per100 = t.g > 0 ? 100 / t.g : 1;
  return { id: r.id, name: r.name, cat: "Мои блюда", kcal: Math.round(t.kcal * per100), p: Math.round(t.p * per100 * 10) / 10, f: Math.round(t.f * per100 * 10) / 10, c: Math.round(t.c * per100 * 10) / 10 };
}

function recipeTotalsGrams(r: Recipe): number {
  return r.ingredients.reduce((s, i) => s + i.grams, 0) || 100;
}

/* ---------- поиск (локальная база + Open Food Facts) ---------- */

function SearchBox({
  query,
  onQuery,
  localResults,
  favs,
  onFav,
  onAdd,
  onSaveOffFood,
}: {
  query: string;
  onQuery: (q: string) => void;
  localResults: Food[];
  favs: string[];
  onFav: (id: string, name: string) => void;
  onAdd: (f: Food) => void;
  onSaveOffFood: (food: Food) => Food;
}) {
  const [off, setOff] = useState<OffProduct[]>([]);
  const [offState, setOffState] = useState<OffSearchState>("idle");
  const timer = useRef<number | null>(null);

  // дебаунс 400 мс → запрос к Open Food Facts
  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 3) {
      setOff([]);
      setOffState("idle");
      return;
    }
    setOffState("loading");
    timer.current = window.setTimeout(async () => {
      try {
        const res = await searchOffProducts(q);
        setOff(res);
        setOffState("done");
      } catch {
        setOff([]);
        setOffState(navigator.onLine ? "done" : "error");
      }
    }, 400);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [query]);

  return (
    <div>
      <div className="relative">
        <ISearch width={18} height={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
        <input
          className={`field field-search${query ? " field-search-with-clear" : ""}`}
          placeholder="Поиск: курица, гречка, «Перекрёсток»…"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
        {offState === "loading" && (
          <span className="spinner absolute right-3.5 top-1/2 -translate-y-1/2" />
        )}
        {query && offState !== "loading" && (
          <button
            onClick={() => onQuery("")}
            aria-label="Очистить поиск"
            className="btn-press absolute right-2.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg border border-line bg-card text-soft hover:text-ink"
          >
            <IX width={13} height={13} />
          </button>
        )}
      </div>

      {query.trim().length >= 3 && (
        <div className="card mt-3 overflow-hidden">
          {/* локальная база */}
          {localResults.length > 0 && (
            <>
              <div className="border-b border-linesoft bg-field/70 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-faint">
                В вашей базе
              </div>
              <FoodList foods={localResults} favs={favs} onFav={onFav} onAdd={onAdd} />
            </>
          )}

          {/* Open Food Facts */}
          <div className="border-t border-line bg-field/70 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-faint flex items-center gap-1.5">
            <IGlobe width={12} height={12} /> Open Food Facts
          </div>
          {offState === "loading" && (
            <p className="flex items-center gap-2 px-4 py-5 text-sm text-soft"><span className="spinner" /> Ищем в мировой базе…</p>
          )}
          {offState === "error" && (
            <p className="px-4 py-5 text-sm text-soft">
              Нет соединения. Проверьте интернет для поиска в базе Open Food Facts.
            </p>
          )}
          {offState === "done" && off.length === 0 && (
            <p className="px-4 py-5 text-sm text-soft">
              Ничего не найдено в базе Open Food Facts. Попробуйте ввести название вручную или проверьте штрихкод.
            </p>
          )}
          {off.length > 0 && (
            <ul>
              {off.map((p) => (
                <OffRow key={p.code} p={p} onAdd={(f) => onAdd(f)} onSave={onSaveOffFood} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function OffRow({ p, onAdd, onSave }: { p: OffProduct; onAdd: (f: Food) => void; onSave: (f: Food) => Food }) {
  const food = useMemo(() => offToFood(p), [p]);
  return (
    <li className="fadeup flex items-center gap-2.5 border-b border-linesoft px-3.5 py-2.5 last:border-0 hover:bg-field sm:gap-3 sm:px-4">
      {p.image ? (
        <img src={p.image} alt="" loading="lazy" className="size-9 shrink-0 rounded-lg border border-line object-cover" />
      ) : (
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-paper text-faint"><IGlobe width={15} height={15} /></span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{food.name}</div>
        <div className="truncate text-[11px] text-faint">{food.brand}</div>
        <div className="text-[10px] italic text-faint">Источник: Open Food Facts</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-display text-sm font-bold text-carrot tabular-nums">{food.kcal}</div>
        <div className="text-[10px] text-faint">ккал/100 г</div>
      </div>
      <button
        onClick={() => { onSave(food); onAdd(food); }}
        aria-label={`Добавить ${food.name}`}
        className="btn-press tap grid size-9 shrink-0 place-items-center rounded-lg border border-leaf/40 bg-leafwash text-leafdeep hover:bg-leaf hover:text-paperink"
      >
        <IPlus width={16} height={16} />
      </button>
    </li>
  );
}

/* ---------- списки и строки ---------- */

function FoodList({ foods, favs, onFav, onAdd, onDel }: { foods: Food[]; favs: string[]; onFav: (id: string, name: string) => void; onAdd: (f: Food) => void; onDel?: (id: string) => void }) {
  return (
    <ul>
      {foods.map((f) => (
        <FoodRow
          key={f.id}
          food={f}
          fav={favs.includes(f.id)}
          onFav={() => onFav(f.id, f.name)}
          onAdd={() => onAdd(f)}
          onDel={onDel ? () => onDel(f.id) : undefined}
        />
      ))}
    </ul>
  );
}

function FoodRow({ food, fav, onFav, onAdd, onDel, badge, metaLine }: { food: Food; fav: boolean; onFav: () => void; onAdd: () => void; onDel?: () => void; badge?: string; metaLine?: string }) {
  return (
    <li className="group flex items-center gap-2.5 border-b border-linesoft px-3.5 py-2.5 transition-colors last:border-0 hover:bg-field sm:gap-3 sm:px-4">
      <button onClick={onFav} aria-label={fav ? "Убрать из избранного" : "В избранное"} className={`btn-press shrink-0 ${fav ? "text-amber" : "text-faint hover:text-amber"}`}>
        <IStar width={17} height={17} filled={fav} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 truncate text-sm font-semibold">
          <span className="truncate">{decodeEntities(food.name)}</span>
          {food.barcode && <IBarcode width={12} height={12} className="shrink-0 text-faint" />}
        </div>
        {metaLine ? (
          <div className="truncate text-[11px] text-soft">{metaLine}</div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-faint">
            <span className="shrink-0 rounded-full bg-paper px-1.5 py-px">{food.cat}</span>
            {food.brand && <span className="truncate">{decodeEntities(food.brand)}</span>}
            <span className="shrink-0 tabular-nums">Б {food.p} · Ж {food.f} · У {food.c}</span>
          </div>
        )}
      </div>
      {badge && (
        <span className="shrink-0 rounded-full bg-leafwash px-2 py-0.5 text-[11px] font-extrabold text-leafdeep tabular-nums">{badge}</span>
      )}
      <div className="shrink-0 text-right">
        <div className="font-display text-sm font-bold text-carrot tabular-nums">{food.kcal}</div>
        <div className="text-[10px] text-faint">ккал/100 г</div>
      </div>
      {onDel && (
        <button onClick={onDel} aria-label="Удалить" className="btn-press grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-card text-soft hover:text-danger">
          <ITrash width={14} height={14} />
        </button>
      )}
      <button
        onClick={onAdd}
        aria-label={`Добавить ${food.name}`}
        className="btn-press tap grid size-9 shrink-0 place-items-center rounded-lg border border-leaf/40 bg-leafwash text-leafdeep hover:bg-leaf hover:text-paperink"
      >
        <IPlus width={16} height={16} />
      </button>
    </li>
  );
}

function RecipeRow({ recipe, onAdd, onDel }: { recipe: Recipe; onAdd: () => void; onDel: () => void }) {
  const t = recipe.ingredients.reduce((a, i) => ({ kcal: a.kcal + i.kcal, n: a.n + 1 }), { kcal: 0, n: 0 });
  return (
    <li className="flex items-center gap-3 border-b border-linesoft px-3.5 py-3 last:border-0 hover:bg-field sm:px-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-leafwash text-leaf"><IApple width={16} height={16} /></span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{recipe.name}</div>
        <div className="text-[11px] text-faint">{t.n} ингр. · {fmt(Math.round(t.kcal))} ккал</div>
      </div>
      <button onClick={onDel} aria-label="Удалить блюдо" className="btn-press grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-card text-soft hover:text-danger">
        <ITrash width={14} height={14} />
      </button>
      <button onClick={onAdd} aria-label={`Добавить ${recipe.name}`} className="btn-press tap grid size-9 shrink-0 place-items-center rounded-lg bg-leaf text-paperink hover:brightness-110">
        <IPlus width={16} height={16} />
      </button>
    </li>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <IClock width={26} height={26} className="text-faint" />
      <p className="max-w-xs text-sm text-faint">{text}</p>
    </div>
  );
}

/* ---------- выбор приёма пищи + граммовки ---------- */

function MealGramsPicker({
  title,
  defaultGrams,
  onClose,
  onConfirm,
}: {
  title: string;
  defaultGrams: number;
  onClose: () => void;
  onConfirm: (meal: Meal, grams: number) => void;
}) {
  const [meal, setMeal] = useState<Meal | null>(null);
  const [grams, setGrams] = useState(String(defaultGrams));
  const g = parseFloat(grams.replace(",", "."));
  const ok = meal !== null && Number.isFinite(g) && g > 0 && g <= 3000;

  return (
    <Modal title="Куда добавить?" subtitle={title} onClose={onClose}>
      <p className="text-xs font-bold uppercase tracking-wide text-faint">Приём пищи</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MEALS.map((m) => (
          <button
            key={m.id}
            onClick={() => setMeal(m.id)}
            className={`btn-press rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors ${
              meal === m.id ? "border-leaf bg-leaf text-paperink" : "border-line bg-field text-soft hover:text-ink"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="mt-5 text-xs font-bold uppercase tracking-wide text-faint">Сколько грамм?</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          className="field w-28 text-center text-base font-bold tabular-nums"
          inputMode="decimal"
          value={grams}
          onChange={(e) => setGrams(e.target.value)}
        />
        <span className="text-sm font-semibold text-soft">г</span>
        {[50, 100, 150, 200].map((q) => (
          <button
            key={q}
            onClick={() => setGrams(String(q))}
            className={`btn-press rounded-lg border px-2.5 py-1.5 text-xs font-semibold tabular-nums ${
              Number.isFinite(g) && Math.round(g) === q ? "border-ink bg-ink text-paperink" : "border-line bg-card text-soft hover:text-ink"
            }`}
          >
            {q}
          </button>
        ))}
      </div>

      <button
        onClick={() => ok && onConfirm(meal!, Math.round(g))}
        disabled={!ok}
        className="btn-press mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-leaf px-4 py-3 text-sm font-bold text-paperink disabled:opacity-50"
      >
        <ICheck width={16} height={16} />
        Добавить{meal ? ` в «${MEALS.find((m) => m.id === meal)?.label}»` : ""}
      </button>
    </Modal>
  );
}

/* ---------- конструктор блюд ---------- */

function RecipeBuilder({ onClose, onSave }: { onClose: () => void; onSave: (r: { name: string; ingredients: RecipeIngredient[] }) => void }) {
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [grams, setGrams] = useState("100");
  const [sel, setSel] = useState<Food | null>(null);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [err, setErr] = useState("");

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return FOODS.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 8);
  }, [search]);

  const g = parseFloat(grams.replace(",", "."));
  const canAddIng = sel && Number.isFinite(g) && g > 0;
  const totals = ingredients.reduce((a, i) => ({ kcal: a.kcal + i.kcal, p: a.p + i.p, f: a.f + i.f, c: a.c + i.c }), { kcal: 0, p: 0, f: 0, c: 0 });

  const addIngredient = () => {
    if (!canAddIng || !sel) return;
    const k = g / 100;
    setIngredients((list) => [
      ...list,
      { foodId: sel.id, name: sel.name, grams: Math.round(g), kcal: Math.round(sel.kcal * k), p: Math.round(sel.p * k * 10) / 10, f: Math.round(sel.f * k * 10) / 10, c: Math.round(sel.c * k * 10) / 10 },
    ]);
    setSel(null);
    setSearch("");
    setGrams("100");
  };

  const save = () => {
    if (name.trim().length < 2) return setErr("Введите название блюда");
    if (ingredients.length === 0) return setErr("Добавьте хотя бы один ингредиент");
    onSave({ name: name.trim(), ingredients });
  };

  return (
    <Modal title="Новое блюдо" subtitle="КБЖУ посчитается автоматически" onClose={onClose}>
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold text-soft">Название блюда</span>
        <input className="field" placeholder="например, Борщ домашний" value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-faint">Ингредиент</p>
      <div className="mt-1.5">
        <input className="field" placeholder="Найти продукт…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {results.length > 0 && (
          <div className="mt-1.5 max-h-36 overflow-y-auto rounded-xl border border-line">
            {results.map((f) => (
              <button
                key={f.id}
                onClick={() => setSel(f)}
                className={`flex w-full items-center justify-between gap-2 border-b border-linesoft px-3 py-2 text-left text-sm last:border-0 ${sel?.id === f.id ? "bg-leafwash" : "hover:bg-field"}`}
              >
                <span className="truncate">{f.name}</span>
                <span className="shrink-0 text-[11px] text-faint">{f.kcal} ккал</span>
              </button>
            ))}
          </div>
        )}
        {sel && (
          <div className="mt-2 flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-leaf">{sel.name}</span>
            <input className="field w-24 text-center tabular-nums" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} />
            <span className="text-xs text-soft">г</span>
            <button onClick={addIngredient} className="btn-press rounded-lg bg-leaf px-3 py-2 text-xs font-bold text-paperink">
              <IPlus width={14} height={14} />
            </button>
          </div>
        )}
      </div>

      {ingredients.length > 0 && (
        <ul className="mt-4 max-h-40 overflow-y-auto rounded-xl border border-line">
          {ingredients.map((i, idx) => (
            <li key={idx} className="flex items-center gap-2 border-b border-linesoft px-3 py-2 text-sm last:border-0">
              <span className="min-w-0 flex-1 truncate">{i.name}</span>
              <span className="shrink-0 text-[11px] text-faint tabular-nums">{i.grams} г · {i.kcal} ккал</span>
              <button onClick={() => setIngredients((l) => l.filter((_, j) => j !== idx))} className="btn-press text-faint hover:text-danger">
                <IX width={14} height={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        {(
          [
            ["ккал", Math.round(totals.kcal), "var(--color-carrot)", "var(--color-carrotwash)"],
            ["белки", Math.round(totals.p * 10) / 10, "var(--color-leaf)", "var(--color-leafwash)"],
            ["жиры", Math.round(totals.f * 10) / 10, "var(--color-amber)", "var(--color-amberwash)"],
            ["углев.", Math.round(totals.c * 10) / 10, "var(--color-teal)", "var(--color-tealwash)"],
          ] as const
        ).map(([label, v, color, wash]) => (
          <div key={label} className="rounded-lg px-1 py-2" style={{ background: wash }}>
            <div className="font-display text-sm font-bold tabular-nums" style={{ color }}>{v.toLocaleString("ru-RU")}</div>
            <div className="text-[10px] font-medium text-soft">{label}</div>
          </div>
        ))}
      </div>

      {err && <p className="mt-2 text-xs font-medium text-danger">{err}</p>}

      <div className="mt-4 flex gap-2.5">
        <button onClick={onClose} className="btn-press rounded-xl border border-line bg-field px-5 py-2.5 text-sm font-semibold text-soft hover:text-ink">
          Отмена
        </button>
        <button onClick={save} className="btn-press flex-1 rounded-xl bg-leaf px-5 py-2.5 text-sm font-bold text-paperink">
          Сохранить блюдо
        </button>
      </div>
    </Modal>
  );
}
