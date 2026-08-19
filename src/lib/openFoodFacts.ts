import type { Food } from "../types";
import { decodeEntities, round1 } from "./store";

/**
 * Сервис для работы с открытым API Open Food Facts (world.openfoodfacts.org).
 * API публичный, отдаёт CORS-заголовки, данные КБЖУ — на 100 г.
 */

/** Нормализованный товар из Open Food Facts */
export interface OffProduct {
  /** штрихкод (code) */
  code: string;
  name: string;
  brand?: string;
  categories?: string;
  /** ккал на 100 г */
  kcal: number;
  /** белки, г на 100 г */
  p: number;
  /** жиры, г на 100 г */
  f: number;
  /** углеводы, г на 100 г */
  c: number;
  imageUrl?: string;
  url: string;
}

interface RawProduct {
  code?: string;
  _id?: string;
  product_name?: string;
  product_name_ru?: string;
  generic_name?: string;
  brands?: string;
  categories?: string;
  image_url?: string;
  image_small_url?: string;
  nutriments?: Record<string, number | string | undefined>;
}

const FIELDS =
  "code,product_name,product_name_ru,generic_name,brands,categories,image_url,image_small_url,nutriments";

function num(v: number | string | undefined): number | undefined {
  const x = typeof v === "string" ? parseFloat(v) : v;
  return typeof x === "number" && Number.isFinite(x) ? x : undefined;
}

function normalize(raw: RawProduct): OffProduct | null {
  const code = raw.code ?? raw._id ?? "";
  const name =
    (typeof raw.product_name_ru === "string" && raw.product_name_ru.trim()) ||
    (typeof raw.product_name === "string" && raw.product_name.trim()) ||
    (typeof raw.generic_name === "string" && raw.generic_name.trim());
  if (!code || !name) return null;

  const n = raw.nutriments ?? {};
  let kcal = num(n["energy-kcal_100g"]);
  if (kcal === undefined) {
    const kj = num(n.energy_100g);
    if (kj !== undefined) kcal = kj / 4.184;
  }

  return {
    code,
    name: decodeEntities(name).slice(0, 90),
    brand: raw.brands ? decodeEntities(raw.brands.trim()) : undefined,
    categories: raw.categories?.trim() || undefined,
    kcal: Math.round(kcal ?? 0),
    p: round1(num(n.proteins_100g) ?? 0),
    f: round1(num(n["fat_100g"] ?? n.fat_100g) ?? 0),
    c: round1(num(n.carbohydrates_100g) ?? 0),
    imageUrl: raw.image_small_url || raw.image_url || undefined,
    url: `https://world.openfoodfacts.org/product/${code}`,
  };
}

async function getJson(url: string, timeout = 9000): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Поиск товаров по названию. Дебаунс — на стороне вызывающего кода.
 * Возвращает массив нормализованных продуктов (до ~24 штук).
 */
export async function searchProducts(
  query: string,
  opts: { signal?: AbortSignal } = {},
): Promise<OffProduct[]> {
  const q = query.trim();
  if (!q) return [];
  const terms = encodeURIComponent(q);

  // основной эндпоинт (search.pl) + запасной (api/v2/search) для надёжности
  const primary = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${terms}&search_simple=1&action=process&json=true&fields=${FIELDS}&page_size=24`;
  const fallback = `https://world.openfoodfacts.org/api/v2/search?search_terms=${terms}&fields=${FIELDS}&page_size=24`;

  for (const url of [primary, fallback]) {
    try {
      const json = (await getJson(url)) as { products?: RawProduct[] };
      const items = Array.isArray(json.products) ? json.products : [];
      return items.map(normalize).filter((p): p is OffProduct => p !== null);
    } catch (e) {
      if ((e as Error).name === "AbortError" || opts.signal?.aborted) return [];
      // пробуем запасной эндпоинт
    }
  }
  throw new Error("offline");
}

/**
 * Поиск одного товара по штрихкоду.
 */
export async function getProductByBarcode(barcode: string): Promise<OffProduct | null> {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
      barcode,
    )}.json?fields=status,${FIELDS}`;
    const json = (await getJson(url)) as { status?: number; product?: RawProduct };
    if (json.status !== 1 || !json.product) return null;
    return normalize(json.product);
  } catch {
    return null;
  }
}

/** Приводит товар OFF к внутреннему формату Food (для сохранения в базу). */
export function toFood(p: OffProduct): Food {
  return {
    id: `off-${p.code}`,
    name: p.name,
    cat: "Open Food Facts",
    kcal: p.kcal,
    p: p.p,
    f: p.f,
    c: p.c,
    barcode: p.code,
    brand: p.brand,
    image: p.imageUrl,
    source: { type: "open_food_facts", original_id: p.code, url: p.url },
  };
}
