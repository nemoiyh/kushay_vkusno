import type { Food } from "../types";
import { getProductByBarcode, toFood } from "./openFoodFacts";

/**
 * Поиск продукта по штрихкоду в открытой базе Open Food Facts.
 * Возвращает продукт с КБЖУ на 100 г или null (офлайн / не найден).
 */
export async function fetchOffProduct(code: string): Promise<Food | null> {
  const p = await getProductByBarcode(code);
  return p ? toFood(p) : null;
}
