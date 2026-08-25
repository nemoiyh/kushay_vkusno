import type { Food } from "../types";
import { decodeEntities, round1 } from "./store";

/** Нормализованный товар из Open Food Facts. */
export interface OffProduct {
  code: string;
  name: string;
  brand?: string;
  categories?: string;
  image?: string;
  kcal: number;
  p: number;
  f: number;
  c: number;
}

export type OffSearchState = "idle" | "loading" | "error" | "done";

const num = (v: number | string | undefined) => {
  const x = typeof v === "string" ? parseFloat(v) : v;
  return typeof x === "number" && Number.isFinite(x) ? x : undefined;
};

function toProduct(code: string, raw: Record<string, any>): OffProduct | null {
  const n = raw.nutriments ?? {};
  const name =
    (typeof raw.product_name_ru === "string" && raw.product_name_ru.trim()) ||
    (typeof raw.product_name === "string" && raw.product_name.trim()) ||
    (typeof raw.generic_name === "string" && raw.generic_name.trim());
  if (!name) return null;

  const eKcal = num(n["energy-kcal_100g"]);
  const eKj = num(n.energy_100g);
  let kcal = eKcal;
  if (kcal === undefined && eKj !== undefined) kcal = eKj / 4.184;
  if (kcal === undefined) kcal = 0;

  return {
    code,
    name: decodeEntities(name).slice(0, 90),
    brand: raw.brands ? decodeEntities(String(raw.brands).trim()) : undefined,
    categories: raw.categories ? String(raw.categories).trim() : undefined,
    image: raw.image_small_url || raw.image_url || undefined,
    kcal: Math.round(kcal),
    p: round1(num(n.proteins_100g) ?? 0),
    f: round1(num(n.fat_100g) ?? 0),
    c: round1(num(n.carbohydrates_100g) ?? 0),
  };
}

/** Поиск товаров по названию. Возвращает до 15 результатов. */
export async function searchOffProducts(query: string): Promise<OffProduct[]> {
  const url =
    "https://world.openfoodfacts.org/cgi/search.pl?" +
    new URLSearchParams({
      search_terms: query,
      search_simple: "1",
      action: "process",
      json: "1",
      page_size: "15",
      fields: "code,product_name,product_name_ru,generic_name,brands,categories,nutriments,image_small_url,image_url",
    });
  const res = await fetch(url);
  if (!res.ok) throw new Error("network");
  const json = (await res.json()) as { products?: Record<string, any>[] };
  return (json.products ?? [])
    .map((p) => toProduct(String(p.code ?? ""), p))
    .filter((p): p is OffProduct => p !== null);
}

/** Поиск одного товара по штрихкоду. */
export async function getOffProductByBarcode(code: string): Promise<OffProduct | null> {
  try {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 9000);
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=status,code,product_name,product_name_ru,generic_name,brands,categories,nutriments,image_small_url,image_url`,
      { signal: ctrl.signal },
    );
    window.clearTimeout(timer);
    if (!res.ok) return null;
    const json = (await res.json()) as { status?: number; product?: Record<string, any> };
    if (json.status !== 1 || !json.product) return null;
    return toProduct(code, json.product);
  } catch {
    return null;
  }
}

/** Алиасы для совместимости со старым модулем lib/off.ts */
export const getProductByBarcode = getOffProductByBarcode;
export const toFood = (p: OffProduct): Food => offToFood(p);

/** Приведение товара OFF к локальному формату Food. */
export function offToFood(p: OffProduct): Food {
  return {
    id: `off-${p.code}`,
    name: p.name,
    cat: p.brand ? p.brand : "Из сканирования",
    kcal: p.kcal,
    p: p.p,
    f: p.f,
    c: p.c,
    brand: p.brand,
    image: p.image,
    barcode: p.code,
    source: {
      type: "open_food_facts",
      original_id: p.code,
      url: `https://world.openfoodfacts.org/product/${p.code}`,
    },
  };
}
