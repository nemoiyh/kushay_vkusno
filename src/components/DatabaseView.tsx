import { useMemo, useState } from "react";
import type { Food } from "../types";
import { CATS, FOODS } from "../data/foods";
import { fmt } from "../lib/store";
import { IApple, IPlus, ISearch } from "./Icons";

export function DatabaseView({ onPick }: { onPick: (food: Food) => void }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FOODS.filter(
      (f) =>
        (!cat || f.cat === cat) &&
        (!q || f.name.toLowerCase().includes(q) || f.cat.toLowerCase().includes(q)),
    ).sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [query, cat]);

  return (
    <div className="anim-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold sm:text-2xl">База продуктов</h1>
          <p className="mt-1 text-sm text-soft">
            {fmt(FOODS.length)} продуктов · значения на 100 г · нажмите «+», чтобы добавить в дневник
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <div className="relative">
          <ISearch width={16} height={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input
            className="field pl-10"
            placeholder="Поиск: курица, гречка, творог…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <CatChip label="Все" active={cat === null} onClick={() => setCat(null)} />
          {CATS.map((c) => (
            <CatChip key={c} label={c} active={cat === c} onClick={() => setCat(cat === c ? null : c)} />
          ))}
        </div>
      </div>

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
              Попробуйте изменить запрос. Свой продукт можно добавить прямо при записи в дневник — вкладка «Свой продукт».
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
                    <span className="rounded-full bg-paper px-1.5 py-px">{f.cat}</span>
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

function CatChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`btn-press rounded-full border px-3 py-1.5 text-xs font-semibold ${
        active ? "border-ink bg-ink text-paperink" : "border-line bg-card text-soft hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
