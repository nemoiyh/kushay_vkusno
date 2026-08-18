import type { Food } from "../types";
import { round1 } from "./store";

/**
 * Поиск продукта по штрихкоду в открытой базе Open Food Facts
 * (2,5 млн+ товаров, включая российские бренды). API публичный, с CORS.
 * Возвращает продукт с КБЖУ на 100 г или null.
 */
export async function fetchOffProduct(code: string): Promise<Food | null> {
  try {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 9000);
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=status,product_name,product_name_ru,generic_name,nutriments`,
      { signal: ctrl.signal },
    );
    window.clearTimeout(timer);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        product_name_ru?: string;
        generic_name?: string;
        nutriments?: Record<string, number | string | undefined>;
      };
    };
    if (json.status !== 1 || !json.product) return null;
    const p = json.product;
    const n = p.nutriments ?? {};
    const name =
      (typeof p.product_name_ru === "string" && p.product_name_ru.trim()) ||
      (typeof p.product_name === "string" && p.product_name.trim()) ||
      (typeof p.generic_name === "string" && p.generic_name.trim());
    if (!name) return null;

    const num = (v: number | string | undefined) => {
      const x = typeof v === "string" ? parseFloat(v) : v;
      return typeof x === "number" && Number.isFinite(x) ? x : undefined;
    };

    const eKcal = num(n["energy-kcal_100g"]);
    const eKj = num(n.energy_100g);
    let kcal = eKcal;
    if (kcal === undefined && eKj !== undefined) kcal = eKj / 4.184;
    if (kcal === undefined) kcal = 0;

    return {
      id: `off-${code}`,
      name: name.slice(0, 80),
      cat: "Из сканирования",
      kcal: Math.round(kcal),
      p: round1(num(n.proteins_100g) ?? 0),
      f: round1(num(n.fat_100g) ?? 0),
      c: round1(num(n.carbohydrates_100g) ?? 0),
      barcode: code,
    };
  } catch {
    return null; // офлайн или товар не найден — обработает вызывающий код
  }
}
