import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppData, Food, Meal, Recipe, RecipeIngredient, UsageInfo } from "../types";
import { FOODS, findFood } from "../data/foods";
import {
  MEALS,
  decodeEntities,
  defaultMealByHour,
  fmt,
  recipeTotals,
  round1,
} from "../lib/store";
import { searchProducts, toFood, type OffProduct } from "../lib/openFoodFacts";
import { Modal } from "./ui";
import { RecipeBuilderModal } from "./RecipeBuilderModal";
import {
  IApple,
  IBarcode,
  ICheck,
  IChevDown,
  IClock,
  IFlame,
  IGlobe,
  IPlus,
  ISearch,
  IStar,
  ITrash,
  IX,
} from "./Icons";

type Tab = "recent" | "frequent" | "favs" | "meals";

const MEAL_DOT: Record<Meal, string> = {
  breakfast: "var(--color-amber)",
  lunch: "var(--color-leaf)",
  dinner: "var(--color-teal)",
  snack: "var(--color-carrot)",
};

const parseNum = (s: string) => {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

/** блюдо → карточка продукта (КБЖУ на 100 г) для списков */
function recipeToFood(r: Recipe): Food {
  const t = recipeTotals(r);
  const k = t.grams > 0 ? 100 / t.grams : 0;
  return {
    id: r.id,
    name: r.name,
    cat: "Мои блюда",
    kcal: Math.round(t.kcal * k),
    p: round1(t.p * k),
    f: round1(t.f * k),
    c: round1(t.c * k),
    unit: { label: "порция", grams: t.grams },
  };
}

type OffState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "done"; results: OffProduct[] };

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
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("recent");

  /* ---- выбор приёма пищи ---- */
  const [picker, setPicker] = useState<{ food?: Food; recipe?: Recipe } | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  /* ---- поиск в Open Food Facts (дебаунс 400 мс) ---- */
  const [off, setOff] = useState<OffState>({ kind: "idle" });
  const reqId = useRef(0);
  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < 3) {
      setOff({ kind: "idle" });
      return;
    }
    const id = ++reqId.current;
    const ctrl = new AbortController();
    setOff({ kind: "loading" });
    const timer = window.setTimeout(async () => {
      try {
        const results = await searchProducts(trimmed, { signal: ctrl.signal });
        if (id !== reqId.current) return;
        setOff({ kind: "done", results });
      } catch {
        if (id !== reqId.current) return;
        setOff({ kind: "error" });
      }
    }, 400);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [trimmed]);

  const retry = useCallback(() => {
    const id = ++reqId.current;
    setOff({ kind: "loading" });
    searchProducts(trimmed)
      .then((results) => id === reqId.current && setOff({ kind: "done", results }))
      .catch(() => id === reqId.current && setOff({ kind: "error" }));
  }, [trimmed]);

  /* ---- локальные совпадения по запросу ---- */
  const localResults = useMemo(() => {
    const q = trimmed.toLowerCase();
    if (!q) return [];
    return [...customFoods, ...FOODS]
      .filter((f) => f.name.toLowerCase().includes(q) || f.cat.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, "ru"))
      .slice(0, 40);
  }, [trimmed, customFoods]);

  /* ---- недавние: из дневника + созданные вручную ---- */
  const recent = useMemo(() => {
    const map = new Map<string, { food: Food; ts: number }>();
    Object.values(days).forEach((d) =>
      d.entries.forEach((e) => {
        const key = e.foodId ?? `n:${e.name}`;
        const ex = map.get(key);
        if (ex && e.addedAt <= ex.ts) return;
        const base = e.foodId ? findFood(e.foodId, customFoods) : undefined;
        const food: Food =
          base ?? {
            id: e.foodId ?? key,
            name: e.name,
            cat: "Недавние",
            kcal: e.grams > 0 ? Math.round((e.kcal / e.grams) * 100) : e.kcal,
            p: e.grams > 0 ? round1((e.p / e.grams) * 100) : e.p,
            f: e.grams > 0 ? round1((e.f / e.grams) * 100) : e.f,
            c: e.grams > 0 ? round1((e.c / e.grams) * 100) : e.c,
          };
        map.set(key, { food, ts: e.addedAt });
      }),
    );
    customFoods.forEach((f) => {
      const ts = f.createdAt ?? 0;
      const ex = map.get(f.id);
      if (!ex) map.set(f.id, { food: f, ts: Math.max(ts, 1) });
      else if (ts > ex.ts) {
        ex.food = f;
        ex.ts = ts;
      }
    });
    return [...map.values()].sort((a, b) => b.ts - a.ts).slice(0, 24).map((x) => x.food);
  }, [days, customFoods]);

  const favs = useMemo(
    () =>
      favorites
        .map((id) => findFood(id, customFoods))
        .filter((f): f is Food => Boolean(f)),
    [favorites, customFoods],
  );

  /* частые: топ по счётчику использований */
  const frequent = useMemo(
    () =>
      Object.entries(usage)
        .filter(([, u]) => u.count > 0)
        .sort((a, b) => b[1].count - a[1].count || b[1].lastUsed - a[1].lastUsed)
        .slice(0, 20)
        .map(([id, u]) => {
          const food =
            recipes.find((r) => r.id === id)
              ? recipeToFood(recipes.find((r) => r.id === id)!)
              : findFood(id, customFoods);
          return food ? { food, u } : null;
        })
        .filter((x): x is { food: Food; u: UsageInfo } => x !== null),
    [usage, customFoods, recipes],
  );

  const isFav = (id: string) => favorites.includes(id);
  const isCustom = (id: string) => customFoods.some((f) => f.id === id);

  /* OFF-товар перед добавлением сохраняем в базу */
  const ensureSaved = (f: Food): Food =>
    f.id.startsWith("off-") && !findFood(f.id, customFoods) ? onSaveOffFood(f) : f;

  const openFood = (f: Food) => setPicker({ food: ensureSaved(f) });

  const star = (f: Food) => {
    const saved = ensureSaved(f);
    onToggleFavorite(saved.id, decodeEntities(saved.name));
  };

  const searching = trimmed.length >= 3;

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: "recent", label: "Недавние", count: recent.length },
    { id: "frequent", label: "Частые", count: frequent.length },
    { id: "favs", label: "Избранное", count: favs.length },
    { id: "meals", label: "Мои блюда", count: recipes.length },
  ];

  return (
    <div className="anim-in">
      <div>
        <h1 className="font-display text-xl font-extrabold sm:text-2xl">Продукты</h1>
        <p className="mt-1 text-sm text-soft">
          {fmt(FOODS.length + customFoods.length)} продуктов · значения на 100 г · «+» — добавить в дневник
        </p>
      </div>

      {/* поиск */}
      <div className="relative mt-4">
        <ISearch width={18} height={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
        <input
          className={`field field-search${query ? " field-search-with-clear" : ""}`}
          placeholder="Поиск: курица, гречка, молоко…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Очистить поиск"
            className="btn-press absolute right-2.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg border border-line bg-card text-soft hover:text-ink"
          >
            <IX width={13} height={13} />
          </button>
        )}
      </div>

      {searching ? (
        <div className="mt-4 space-y-4">
          {/* локальные совпадения */}
          <section className="card overflow-hidden">
            <header className="flex items-center gap-2 border-b border-line bg-field/70 px-4 py-2.5">
              <span className="size-2 rounded-full bg-leaf" />
              <h2 className="font-display text-xs font-bold">В базе приложения</h2>
              <span className="ml-auto text-[11px] text-faint tabular-nums">{localResults.length}</span>
            </header>
            {localResults.length === 0 ? (
              <p className="px-4 py-4 text-sm text-faint">Совпадений в локальной базе нет.</p>
            ) : (
              <ul>
                {localResults.map((f) => (
                  <FoodRow
                    key={f.id}
                    food={f}
                    fav={isFav(f.id)}
                    custom={isCustom(f.id)}
                    onFav={() => star(f)}
                    onAdd={() => openFood(f)}
                    onDel={isCustom(f.id) ? () => onDeleteCustomFood(f.id) : undefined}
                  />
                ))}
              </ul>
            )}
          </section>

          {/* Open Food Facts */}
          <section className="card overflow-hidden">
            <header className="flex items-center gap-2.5 border-b border-line bg-tealwash/50 px-4 py-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-tealwash text-teal">
                <IGlobe width={15} height={15} />
              </span>
              <h2 className="font-display text-xs font-bold">Open Food Facts</h2>
              <span className="ml-auto text-[11px] text-faint tabular-nums">
                {off.kind === "loading" && "ищем…"}
                {off.kind === "done" && `${off.results.length} найдено`}
              </span>
            </header>

            {off.kind === "loading" && (
              <div className="flex items-center gap-2.5 px-4 py-5 text-sm text-soft">
                <span className="spinner" />
                Ищем «{trimmed}» в базе Open Food Facts…
              </div>
            )}

            {off.kind === "error" && (
              <div className="px-4 py-5 text-sm text-soft">
                Нет соединения. Проверьте интернет для поиска в базе.{" "}
                <button onClick={retry} className="font-bold text-teal underline-offset-2 hover:underline">
                  Повторить
                </button>
              </div>
            )}

            {off.kind === "done" && off.results.length === 0 && (
              <div className="px-4 py-5">
                <p className="text-sm text-soft">
                  Ничего не найдено в базе Open Food Facts. Попробуйте ввести название вручную или
                  проверьте штрихкод.
                </p>
                <button
                  onClick={onAddCustomFood}
                  className="btn-press mt-3 flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-paperink"
                >
                  <IPlus width={15} height={15} /> Добавить вручную
                </button>
              </div>
            )}

            {off.kind === "done" && off.results.length > 0 && (
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {off.results.map((p, i) => (
                  <OffCard
                    key={p.code}
                    product={p}
                    index={i}
                    fav={isFav(`off-${p.code}`)}
                    onFav={() => star(toFood(p))}
                    onAdd={() => openFood(toFood(p))}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        <>
          {/* вкладки */}
          <div className="mt-4 flex rounded-xl border border-line bg-card p-1 hard-sm">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition-colors sm:text-[13px] ${
                  tab === t.id ? "bg-ink text-paperink" : "text-soft hover:text-ink"
                }`}
              >
                {t.label}
                <span
                  className={`rounded-full px-1.5 py-px text-[10px] tabular-nums ${
                    tab === t.id ? "bg-paperink/20" : "bg-paper text-faint"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* контент вкладки */}
          {tab === "recent" && (
            <section className="card anim-in mt-4 overflow-hidden">
              {recent.length === 0 ? (
                <EmptyState
                  icon={<IClock width={30} height={30} />}
                  title="Пока ничего нет"
                  text="Добавьте продукт в дневник или найдите его через поиск — он появится здесь для быстрого доступа."
                />
              ) : (
                <ul>
                  {recent.map((f) => (
                    <FoodRow
                      key={f.id}
                      food={f}
                      fav={isFav(f.id)}
                      custom={isCustom(f.id)}
                      onFav={() => star(f)}
                      onAdd={() => openFood(f)}
                      onDel={isCustom(f.id) ? () => onDeleteCustomFood(f.id) : undefined}
                    />
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === "frequent" && (
            <section className="card anim-in mt-4 overflow-hidden">
              {frequent.length === 0 ? (
                <EmptyState
                  icon={<IFlame width={30} height={30} />}
                  title="Частых продуктов пока нет"
                  text="Каждый раз, когда вы добавляете продукт в дневник, мы считаем. Самые используемые появятся здесь — сверху самые частые."
                />
              ) : (
                <ul>
                  {frequent.map(({ food, u }) => (
                    <FoodRow
                      key={food.id}
                      food={food}
                      fav={isFav(food.id)}
                      custom={isCustom(food.id)}
                      onFav={() => star(food)}
                      onAdd={() =>
                        recipes.some((r) => r.id === food.id)
                          ? setPicker({ recipe: recipes.find((r) => r.id === food.id)! })
                          : openFood(food)
                      }
                      onDel={isCustom(food.id) ? () => onDeleteCustomFood(food.id) : undefined}
                      badge={`×${u.count}`}
                      metaLine={`добавлен ${u.count} ${u.count === 1 ? "раз" : u.count < 5 ? "раза" : "раз"}${u.grams ? ` · обычно ${u.grams} г` : ""}`}
                    />
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === "favs" && (
            <section className="card anim-in mt-4 overflow-hidden">
              {favs.length === 0 ? (
                <EmptyState
                  icon={<IStar width={30} height={30} />}
                  title="В избранном пусто"
                  text="Отмечайте продукты звёздочкой в поиске или в «Недавних» — они соберутся здесь."
                />
              ) : (
                <ul>
                  {favs.map((f) => (
                    <FoodRow
                      key={f.id}
                      food={f}
                      fav
                      custom={isCustom(f.id)}
                      onFav={() => star(f)}
                      onAdd={() => openFood(f)}
                      onDel={isCustom(f.id) ? () => onDeleteCustomFood(f.id) : undefined}
                    />
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === "meals" && (
            <div className="anim-in mt-4 space-y-4">
              <button
                onClick={() => setBuilderOpen(true)}
                className="btn-press flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-leaf/50 bg-leafwash/40 py-4 font-display text-sm font-bold text-leafdeep transition-colors hover:bg-leafwash"
              >
                <IPlus width={17} height={17} /> Создать блюдо
              </button>

              {recipes.length === 0 ? (
                <EmptyState
                  icon={<IApple width={30} height={30} />}
                  title="Составных блюд пока нет"
                  text="Соберите «Борщ домашний» или «Омлет» из ингредиентов — КБЖУ посчитается автоматически, а добавлять блюдо в дневник можно одной кнопкой."
                />
              ) : (
                <ul className="space-y-4">
                  {recipes.map((r) => (
                    <RecipeCard
                      key={r.id}
                      recipe={r}
                      expanded={expanded === r.id}
                      onToggle={() => setExpanded((e) => (e === r.id ? null : r.id))}
                      onAdd={() => setPicker({ recipe: r })}
                      onDelete={() => onDeleteRecipe(r.id)}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      {/* выбор приёма пищи */}
      {picker && (
        <MealPicker
          title={picker.food ? decodeEntities(picker.food.name) : picker.recipe!.name}
          item={picker}
          usage={picker.food ? usage[picker.food.id] : picker.recipe ? usage[picker.recipe.id] : undefined}
          onClose={() => setPicker(null)}
          onPick={(meal, grams) => {
            if (picker.food) onPickToMeal(picker.food, meal, grams);
            else if (picker.recipe) onPickRecipe(picker.recipe, meal, grams);
            setPicker(null);
          }}
        />
      )}

      {builderOpen && (
        <RecipeBuilderModal
          customFoods={customFoods}
          onClose={() => setBuilderOpen(false)}
          onSave={(r) => {
            onAddRecipe(r);
            setBuilderOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* ---------- строка продукта ---------- */

function FoodRow({
  food,
  fav,
  custom,
  onFav,
  onAdd,
  onDel,
  badge,
  metaLine,
}: {
  food: Food;
  fav: boolean;
  custom: boolean;
  onFav: () => void;
  onAdd: () => void;
  onDel?: () => void;
  badge?: string;
  metaLine?: string;
}) {
  return (
    <li className="group flex items-center gap-2.5 border-b border-linesoft px-3.5 py-2.5 transition-colors last:border-0 hover:bg-field sm:gap-3 sm:px-4">
      <StarBtn on={fav} onClick={onFav} name={food.name} />
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {food.image ? (
          <img src={food.image} alt="" loading="lazy" className="size-9 shrink-0 rounded-lg border border-line object-cover" />
        ) : (
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-paper text-faint">
            <IApple width={15} height={15} />
          </span>
        )}
        <div className="min-w-0">
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
      </div>
      {badge && (
        <span className="shrink-0 rounded-full bg-leafwash px-2 py-0.5 text-[11px] font-extrabold text-leafdeep tabular-nums">
          {badge}
        </span>
      )}
      <div className="shrink-0 text-right">
        <div className="font-display text-sm font-bold text-carrot tabular-nums">{food.kcal}</div>
        <div className="text-[10px] text-faint">ккал/100 г</div>
      </div>
      {onDel && (
        <button
          onClick={onDel}
          aria-label={`Удалить ${food.name}`}
          className="btn-press grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-card text-soft hover:text-danger"
        >
          <ITrash width={14} height={14} />
        </button>
      )}
      <button
        onClick={onAdd}
        aria-label={`Добавить ${food.name} в дневник`}
        className="btn-press grid size-9 shrink-0 place-items-center rounded-lg border border-leaf/40 bg-leafwash text-leafdeep hover:bg-leaf hover:text-paperink"
      >
        <IPlus width={16} height={16} />
      </button>
    </li>
  );
}

/* ---------- кнопка-звёздочка ---------- */

function StarBtn({ on, onClick, name }: { on: boolean; onClick: () => void; name: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={on ? `Убрать ${name} из избранного` : `Добавить ${name} в избранное`}
      aria-pressed={on}
      className={`btn-press grid size-8 shrink-0 place-items-center rounded-lg border transition-colors ${
        on
          ? "border-amber/50 bg-amberwash text-amber"
          : "border-line bg-card text-faint hover:text-amber"
      }`}
    >
      <IStar width={15} height={15} fill={on ? "var(--color-amber)" : "none"} strokeWidth={1.8} />
    </button>
  );
}

/* ---------- карточка товара из Open Food Facts ---------- */

function OffCard({
  product,
  index,
  fav,
  onFav,
  onAdd,
}: {
  product: OffProduct;
  index: number;
  fav: boolean;
  onFav: () => void;
  onAdd: () => void;
}) {
  return (
    <div
      className="fadeup flex items-center gap-3 rounded-xl border border-line bg-field/60 p-3 transition-colors hover:border-teal/50 hover:bg-field"
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt=""
          loading="lazy"
          className="size-16 shrink-0 rounded-lg border border-line bg-paper object-cover"
        />
      ) : (
        <span className="grid size-16 shrink-0 place-items-center rounded-lg border border-dashed border-line bg-paper text-faint">
          <IGlobe width={20} height={20} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-sm font-semibold leading-snug">{decodeEntities(product.name)}</div>
        {product.brand && <div className="truncate text-[11px] text-faint">{decodeEntities(product.brand)}</div>}
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="font-display text-base font-extrabold text-carrot tabular-nums">{product.kcal}</span>
          <span className="text-[11px] text-faint">ккал / 100 г</span>
        </div>
        <div className="mt-0.5 text-[10px] text-faint">Источник: Open Food Facts</div>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5">
        <StarBtn on={fav} onClick={onFav} name={product.name} />
        <button
          onClick={onAdd}
          aria-label={`Добавить ${product.name} в дневник`}
          className="btn-press grid size-8 place-items-center rounded-lg bg-teal text-paperink hover:bg-leaf"
        >
          <IPlus width={16} height={16} />
        </button>
      </div>
    </div>
  );
}

/* ---------- карточка блюда ---------- */

function RecipeCard({
  recipe,
  expanded,
  onToggle,
  onAdd,
  onDelete,
}: {
  recipe: Recipe;
  expanded: boolean;
  onToggle: () => void;
  onAdd: () => void;
  onDelete: () => void;
}) {
  const t = recipeTotals(recipe);
  return (
    <li className="card anim-in overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button
          onClick={onToggle}
          aria-label={expanded ? "Свернуть ингредиенты" : "Показать ингредиенты"}
          className="btn-press grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-field text-soft"
        >
          <IChevDown
            width={16}
            height={16}
            className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-sm font-bold">{recipe.name}</div>
          <div className="text-[11px] text-faint tabular-nums">
            {recipe.ingredients.length} ингр. · {fmt(t.grams)} г
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-base font-extrabold text-carrot tabular-nums">{fmt(t.kcal)}</div>
          <div className="text-[10px] text-faint">ккал</div>
        </div>
        <button
          onClick={onDelete}
          aria-label={`Удалить блюдо ${recipe.name}`}
          className="btn-press grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-card text-soft hover:text-danger"
        >
          <ITrash width={14} height={14} />
        </button>
        <button
          onClick={onAdd}
          aria-label={`Добавить ${recipe.name} в дневник`}
          className="btn-press grid size-9 shrink-0 place-items-center rounded-lg border border-leaf/40 bg-leafwash text-leafdeep hover:bg-leaf hover:text-paperink"
        >
          <IPlus width={16} height={16} />
        </button>
      </div>

      {expanded && (
        <div className="anim-in border-t border-dashed border-line bg-field/50 px-4 py-3">
          <ul className="space-y-1">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-soft">{ing.name}</span>
                <span className="shrink-0 text-xs text-faint tabular-nums">{ing.grams} г</span>
              </li>
            ))}
          </ul>
          <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] font-semibold tabular-nums">
            <span className="rounded-full bg-leafwash px-2 py-0.5 text-leafdeep">Б {t.p}</span>
            <span className="rounded-full bg-amberwash px-2 py-0.5 text-amber">Ж {t.f}</span>
            <span className="rounded-full bg-tealwash px-2 py-0.5 text-teal">У {t.c}</span>
          </div>
        </div>
      )}
    </li>
  );
}

/* ---------- выбор приёма пищи + граммовка ---------- */

function MealPicker({
  title,
  item,
  usage,
  onClose,
  onPick,
}: {
  title: string;
  item: { food?: Food; recipe?: Recipe };
  usage?: UsageInfo;
  onClose: () => void;
  onPick: (m: Meal, grams: number) => void;
}) {
  const { food, recipe } = item;
  const def = defaultMealByHour();
  const [meal, setMeal] = useState<Meal>(def);

  /* --- граммовка --- */
  const totals = recipe ? recipeTotals(recipe) : null;
  const per100 = food
    ? { kcal: food.kcal, p: food.p, f: food.f, c: food.c }
    : totals && totals.grams > 0
      ? {
          kcal: (totals.kcal / totals.grams) * 100,
          p: (totals.p / totals.grams) * 100,
          f: (totals.f / totals.grams) * 100,
          c: (totals.c / totals.grams) * 100,
        }
      : { kcal: 0, p: 0, f: 0, c: 0 };

  // подсказка последнего веса → предзаполняем
  const defGrams =
    usage?.grams ?? (food ? (food.unit?.grams ?? 100) : (totals ? totals.grams : 250));
  const [gramsInput, setGramsInput] = useState(String(defGrams));
  const [unitMode, setUnitMode] = useState(false);
  const [pieces, setPieces] = useState("1");

  const presets =
    recipe && totals
      ? [
          { label: "½ порции", g: Math.max(1, Math.round(totals.grams / 2)) },
          { label: "1 порция", g: totals.grams },
          { label: "1½ порции", g: Math.round(totals.grams * 1.5) },
          { label: "2 порции", g: totals.grams * 2 },
        ]
      : [50, 100, 150, 200].map((g) => ({ label: `${g} г`, g }));

  const grams = (() => {
    const raw =
      unitMode && food?.unit
        ? Math.max(0, Math.round(parseNum(pieces) || 0)) * food.unit.grams
        : parseNum(gramsInput);
    if (!Number.isFinite(raw)) return 0;
    return Math.min(2000, Math.max(0, Math.round(raw)));
  })();

  const calc = {
    kcal: Math.round((per100.kcal / 100) * grams),
    p: round1((per100.p / 100) * grams),
    f: round1((per100.f / 100) * grams),
    c: round1((per100.c / 100) * grams),
  };

  const canSave = grams > 0;
  const lastUsedDiffers = usage?.grams != null && usage.grams !== grams;

  return (
    <Modal title="Куда добавить?" subtitle={title} onClose={onClose}>
      {/* шаг 1: приём пищи */}
      <div className="grid grid-cols-2 gap-2">
        {MEALS.map((m) => (
          <button
            key={m.id}
            onClick={() => setMeal(m.id)}
            className={`btn-press relative flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-colors ${
              meal === m.id
                ? "border-leaf bg-leafwash/50"
                : "border-line bg-field hover:border-leaf hover:bg-leafwash/30"
            }`}
          >
            {m.id === def && (
              <span className="absolute right-2 top-2 rounded-full bg-leafwash px-1.5 py-px text-[9px] font-bold text-leafdeep">
                сейчас
              </span>
            )}
            <span className="flex items-center gap-2 font-display text-[13px] font-bold">
              <span className="size-2.5 rounded-full" style={{ background: MEAL_DOT[m.id] }} />
              {m.label}
            </span>
            <span className="text-[10px] text-faint">{m.hint}</span>
          </button>
        ))}
      </div>

      {/* шаг 2: граммовка */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-soft">Вес порции</span>
          {lastUsedDiffers && (
            <button
              onClick={() => setGramsInput(String(usage!.grams))}
              className="text-[11px] font-semibold text-leaf underline-offset-2 hover:underline"
            >
              раньше: {usage!.grams} г
            </button>
          )}
        </div>

        {/* переключатель граммы / штуки (для штучных продуктов) */}
        {food?.unit && (
          <div className="mt-2 grid grid-cols-2 rounded-xl border border-line bg-field p-0.5 text-[11px] font-bold">
            <button
              onClick={() => setUnitMode(false)}
              className={`rounded-lg py-1.5 transition-colors ${!unitMode ? "bg-ink text-paperink" : "text-soft"}`}
            >
              В граммах
            </button>
            <button
              onClick={() => setUnitMode(true)}
              className={`rounded-lg py-1.5 transition-colors ${unitMode ? "bg-ink text-paperink" : "text-soft"}`}
            >
              В штуках ({food.unit.label})
            </button>
          </div>
        )}

        {/* пресеты */}
        {!unitMode && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => setGramsInput(String(p.g))}
                className={`btn-press rounded-full border px-3 py-1.5 text-xs font-bold tabular-nums transition-colors ${
                  grams === p.g
                    ? "border-ink bg-ink text-paperink"
                    : "border-line bg-card text-soft hover:text-ink"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* ручной ввод */}
        <div className="mt-2 flex items-center gap-2">
          {unitMode && food?.unit ? (
            <>
              <input
                className="field h-10 w-24 py-0 text-center text-sm font-bold tabular-nums"
                inputMode="numeric"
                value={pieces}
                onChange={(e) => setPieces(e.target.value)}
              />
              <span className="text-xs text-soft tabular-nums">
                шт × {food.unit.grams} г = {grams} г
              </span>
            </>
          ) : (
            <>
              <input
                className="field h-10 w-28 py-0 text-center text-sm font-bold tabular-nums"
                inputMode="numeric"
                value={gramsInput}
                onChange={(e) => setGramsInput(e.target.value)}
              />
              <span className="text-sm font-semibold text-soft">г</span>
            </>
          )}
        </div>
      </div>

      {/* живой расчёт КБЖУ */}
      <div className="mt-4 flex items-center justify-between rounded-xl bg-paper px-4 py-3">
        <span className="font-display text-lg font-extrabold text-carrot tabular-nums">
          {calc.kcal} <span className="text-[11px] font-bold text-faint">ккал</span>
        </span>
        <span className="text-xs tabular-nums">
          <b className="text-leaf">{calc.p}</b> Б · <b className="text-amber">{calc.f}</b> Ж ·{" "}
          <b className="text-teal">{calc.c}</b> У
        </span>
      </div>

      <button
        onClick={() => canSave && onPick(meal, grams)}
        disabled={!canSave}
        className="btn-press mt-3 w-full rounded-xl bg-leaf py-3 font-display text-sm font-bold text-paperink disabled:cursor-not-allowed disabled:opacity-50"
      >
        Добавить в «{MEALS.find((m) => m.id === meal)?.label}»
      </button>
    </Modal>
  );
}

/* ---------- пустое состояние ---------- */

function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="text-faint">{icon}</span>
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-sm text-xs leading-relaxed text-faint">{text}</p>
    </div>
  );
}
