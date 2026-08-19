import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Food } from "../types";
import { CATS, FOODS, PEREKRESTOK } from "../data/foods";
import { fmt } from "../lib/store";
import { searchProducts, toFood, type OffProduct } from "../lib/openFoodFacts";
import {
  IApple,
  IBarcode,
  ICheck,
  IGlobe,
  IPlus,
  ISearch,
  IStore,
  ITrash,
  IX,
} from "./Icons";

type OffState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "done"; results: OffProduct[] };

export function DatabaseView({
  onPick,
  customFoods,
  onDeleteCustomFood,
  onSaveOffFood,
  onAddCustomFood,
}: {
  onPick: (food: Food) => void;
  customFoods: Food[];
  onDeleteCustomFood: (id: string) => void;
  onSaveOffFood: (food: Food) => void;
  onAddCustomFood: () => void;
}) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  /* ---- поиск в Open Food Facts (дебаунс 400 мс) ---- */
  const [off, setOff] = useState<OffState>({ kind: "idle" });
  const [addedCodes, setAddedCodes] = useState<Set<string>>(new Set());
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
    // перезапуск эффекта через микросмену запроса не нужен — просто сбрасываем и ждём ввода;
    // вместо этого вручную вызываем поиск
    reqId.current++;
    const id = reqId.current;
    setOff({ kind: "loading" });
    searchProducts(trimmed)
      .then((results) => id === reqId.current && setOff({ kind: "done", results }))
      .catch(() => id === reqId.current && setOff({ kind: "error" }));
  }, [trimmed]);

  const handleAdd = (p: OffProduct) => {
    onSaveOffFood(toFood(p));
    setAddedCodes((s) => new Set(s).add(p.code));
  };

  /* ---- локальный список ---- */
  const list = useMemo(() => {
    const q = trimmed.toLowerCase();
    return FOODS.filter(
      (f) =>
        (!cat || f.cat === cat) &&
        (!q || f.name.toLowerCase().includes(q) || f.cat.toLowerCase().includes(q)),
    ).sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [trimmed, cat]);

  const customs = useMemo(() => {
    const q = trimmed.toLowerCase();
    const filtered = customFoods.filter((f) => !q || f.name.toLowerCase().includes(q));
    return [...filtered].sort((a, b) => b.id.localeCompare(a.id) || a.name.localeCompare(b.name, "ru"));
  }, [trimmed, customFoods]);

  const showOff = trimmed.length >= 3;

  return (
    <div className="anim-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold sm:text-2xl">Продукты</h1>
          <p className="mt-1 text-sm text-soft">
            {fmt(FOODS.length + customFoods.length)} продуктов · значения на 100 г · «+» — добавить в дневник
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-xl border border-leaf/35 bg-leafwash px-3 py-2 text-xs font-bold text-leafdeep hard-sm">
          <IStore width={15} height={15} />
          Каталог «Перекрёстка»: {fmt(PEREKRESTOK.length)} товаров
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <div className="relative">
          <ISearch width={18} height={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
          <input
            className={`field field-search${query ? " field-search-with-clear" : ""}`}
            placeholder="Поиск: курица, гречка, «Перекрёсток»…"
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
        <div className="flex flex-wrap gap-1.5">
          <CatChip label="Все" active={cat === null} onClick={() => setCat(null)} />
          {CATS.map((c) => (
            <CatChip
              key={c}
              label={c}
              active={cat === c}
              store={c === "Перекрёсток"}
              onClick={() => setCat(cat === c ? null : c)}
            />
          ))}
        </div>
      </div>

      {/* ---- Open Food Facts ---- */}
      {showOff && (
        <section className="card mt-4 overflow-hidden">
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
                  added={addedCodes.has(p.code)}
                  onAdd={() => handleAdd(p)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ---- мои продукты ---- */}
      {customFoods.length > 0 && !cat && (
        <section className="card mt-4 overflow-hidden">
          <header className="flex items-center gap-2 border-b border-line bg-field/70 px-4 py-2.5">
            <span className="size-2 rounded-full bg-teal" />
            <h2 className="font-display text-xs font-bold">
              Мои продукты <span className="text-faint">({customFoods.length})</span>
            </h2>
            <span className="ml-auto text-[11px] text-faint">созданы вами, в т. ч. из Open Food Facts</span>
          </header>
          <ul>
            {customs.map((f) => (
              <li
                key={f.id}
                className="group grid grid-cols-[1fr_64px_44px_36px] items-center gap-2 border-b border-linesoft px-4 py-2.5 transition-colors last:border-0 hover:bg-field sm:grid-cols-[1fr_72px_56px_56px_56px_44px_36px]"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {f.image ? (
                    <img src={f.image} alt="" loading="lazy" className="size-9 shrink-0 rounded-lg border border-line object-cover" />
                  ) : (
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-paper text-faint">
                      <IApple width={15} height={15} />
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate text-sm font-semibold">
                      {f.name}
                      {f.barcode && <IBarcode width={12} height={12} className="shrink-0 text-faint" />}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-faint">
                      {f.brand ? <span className="truncate">{f.brand}</span> : null}
                      {f.barcode && <span className="tabular-nums">#{f.barcode}</span>}
                    </div>
                  </div>
                </div>
                <span className="text-right font-display text-sm font-bold text-carrot tabular-nums">{f.kcal}</span>
                <span className="hidden text-right text-xs text-leaf tabular-nums sm:block">{f.p}</span>
                <span className="hidden text-right text-xs text-amber tabular-nums sm:block">{f.f}</span>
                <span className="hidden text-right text-xs text-teal tabular-nums sm:block">{f.c}</span>
                <button
                  onClick={() => onPick(f)}
                  aria-label={`Добавить ${f.name} в дневник`}
                  className="btn-press grid size-8 place-items-center rounded-lg border border-leaf/40 bg-leafwash text-leafdeep hover:bg-leaf hover:text-paperink"
                >
                  <IPlus width={15} height={15} />
                </button>
                <button
                  onClick={() => onDeleteCustomFood(f.id)}
                  aria-label={`Удалить ${f.name}`}
                  className="btn-press grid size-8 place-items-center rounded-lg border border-line bg-card text-soft hover:text-danger"
                >
                  <ITrash width={14} height={14} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---- основная база ---- */}
      <div className="card mt-4 overflow-hidden">
        <div className="hidden grid-cols-[1fr_72px_56px_56px_56px_44px] gap-2 border-b border-line bg-field/70 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-faint sm:grid">
          <span>Продукт</span>
          <span className="text-right">ккал</span>
          <span className="text-right text-leaf">Б</span>
          <span className="text-right text-amber">Ж</span>
          <span className="text-right text-teal">У</span>
          <span />
        </div>
        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <IApple width={34} height={34} className="text-faint" />
            <p className="text-sm font-semibold">Ничего не нашлось</p>
            <p className="max-w-xs text-xs text-faint">
              Попробуйте изменить запрос или найдите товар в Open Food Facts выше — он появится в
              «Моих продуктах».
            </p>
          </div>
        ) : (
          <ul>
            {list.map((f, i) => (
              <li
                key={f.id}
                className="anim-in group grid grid-cols-[1fr_64px_44px] items-center gap-2 border-b border-linesoft px-4 py-2.5 transition-colors last:border-0 hover:bg-field sm:grid-cols-[1fr_72px_56px_56px_56px_44px]"
                style={{ animationDelay: `${Math.min(i, 14) * 22}ms` }}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{f.name}</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-faint">
                    <span
                      className={`rounded-full px-1.5 py-px ${
                        f.cat === "Перекрёсток" ? "bg-leafwash font-semibold text-leafdeep" : "bg-paper"
                      }`}
                    >
                      {f.cat === "Перекрёсток" && <IStore width={10} height={10} className="mr-0.5 inline -translate-y-px" />}
                      {f.cat}
                    </span>
                    {f.unit && <span>{f.unit.label} ≈ {f.unit.grams} г</span>}
                  </div>
                </div>
                <span className="text-right font-display text-sm font-bold text-carrot tabular-nums">{f.kcal}</span>
                <span className="hidden text-right text-xs text-leaf tabular-nums sm:block">{f.p}</span>
                <span className="hidden text-right text-xs text-amber tabular-nums sm:block">{f.f}</span>
                <span className="hidden text-right text-xs text-teal tabular-nums sm:block">{f.c}</span>
                <button
                  onClick={() => onPick(f)}
                  aria-label={`Добавить ${f.name} в дневник`}
                  className="btn-press grid size-8 place-items-center rounded-lg border border-leaf/40 bg-leafwash text-leafdeep hover:bg-leaf hover:text-paperink"
                >
                  <IPlus width={15} height={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------- карточка товара из Open Food Facts ---------- */

function OffCard({
  product,
  index,
  added,
  onAdd,
}: {
  product: OffProduct;
  index: number;
  added: boolean;
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
        <div className="line-clamp-2 text-sm font-semibold leading-snug">{product.name}</div>
        {product.brand && <div className="truncate text-[11px] text-faint">{product.brand}</div>}
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="font-display text-base font-extrabold text-carrot tabular-nums">{product.kcal}</span>
          <span className="text-[11px] text-faint">ккал / 100 г</span>
        </div>
        <div className="mt-0.5 text-[10px] text-faint">Источник: Open Food Facts</div>
      </div>
      <button
        onClick={onAdd}
        disabled={added}
        aria-label={added ? "Уже добавлен" : `Добавить ${product.name} в базу`}
        className={`btn-press grid size-9 shrink-0 place-items-center rounded-lg ${
          added
            ? "border border-leaf/40 bg-leafwash text-leafdeep"
            : "bg-teal text-paperink hover:bg-leaf"
        }`}
      >
        {added ? <ICheck width={16} height={16} /> : <IPlus width={17} height={17} />}
      </button>
    </div>
  );
}

function CatChip({
  label,
  active,
  onClick,
  store,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  store?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`btn-press flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold ${
        active
          ? "border-ink bg-ink text-paperink"
          : store
            ? "border-leaf/40 bg-leafwash text-leafdeep hover:border-leaf"
            : "border-line bg-card text-soft hover:text-ink"
      }`}
    >
      {store && <IStore width={12} height={12} />}
      {label}
    </button>
  );
}
