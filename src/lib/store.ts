import type { AppData, DayLog, Entry, Food, Meal } from "../types";
import { findFood } from "../data/foods";

export const STORAGE_KEY = "seyedeno:v1";

export const MEALS: { id: Meal; label: string; hint: string }[] = [
  { id: "breakfast", label: "Завтрак", hint: "07:00–11:00" },
  { id: "lunch", label: "Обед", hint: "12:00–16:00" },
  { id: "dinner", label: "Ужин", hint: "17:00–21:00" },
  { id: "snack", label: "Перекус", hint: "в любое время" },
];

export const mealLabel = (m: Meal) => MEALS.find((x) => x.id === m)?.label ?? m;

export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

export const round1 = (n: number) => Math.round(n * 10) / 10;

export function dateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const todayKey = () => dateKey(new Date());

export function shiftKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return dateKey(new Date(y, m - 1, d + days));
}

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];
export const WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

export function humanDate(key: string): string {
  const t = todayKey();
  if (key === t) return "Сегодня";
  if (key === shiftKey(t, -1)) return "Вчера";
  if (key === shiftKey(t, 1)) return "Завтра";
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${d} ${MONTHS[m - 1]}, ${WD[dt.getDay()]}`;
}

export function entryFromFood(food: Food, grams: number, meal: Meal): Entry {
  const k = grams / 100;
  return {
    id: uid(),
    foodId: food.id,
    name: food.name,
    grams: Math.round(grams),
    meal,
    kcal: Math.round(food.kcal * k),
    p: round1(food.p * k),
    f: round1(food.f * k),
    c: round1(food.c * k),
    addedAt: Date.now(),
  };
}

export function dayTotals(day?: DayLog) {
  const t = { kcal: 0, p: 0, f: 0, c: 0, count: 0 };
  if (!day) return t;
  for (const e of day.entries) {
    t.kcal += e.kcal;
    t.p += e.p;
    t.f += e.f;
    t.c += e.c;
    t.count++;
  }
  t.kcal = Math.round(t.kcal);
  t.p = round1(t.p);
  t.f = round1(t.f);
  t.c = round1(t.c);
  return t;
}

export function defaultMealByHour(): Meal {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

export function streakDays(days: Record<string, DayLog>, goalKcal: number): number {
  let n = 0;
  let key = todayKey();
  // сегодняшний день засчитываем, только если в нём уже есть записи
  let first = true;
  for (;;) {
    const d = days[key];
    const t = dayTotals(d);
    if (t.count === 0) {
      if (first && key === todayKey()) {
        key = shiftKey(key, -1);
        first = false;
        continue;
      }
      break;
    }
    if (t.kcal <= goalKcal) n++;
    else break;
    key = shiftKey(key, -1);
  }
  return n;
}

/* ---------------- demo data on first launch ---------------- */

type SeedRow = [foodId: string, grams: number, meal: Meal];

const SEED_PLAN: SeedRow[][] = [
  [
    ["ovsyanka", 250, "breakfast"], ["yaico", 110, "breakfast"],
    ["kur-grudka", 150, "lunch"], ["grechka", 180, "lunch"],
    ["losos", 140, "dinner"], ["salat-ovosh", 200, "dinner"],
    ["yabloko", 180, "snack"],
  ],
  [
    ["omlet", 220, "breakfast"], ["hleb-ch", 70, "breakfast"],
    ["borsch", 300, "lunch"], ["kotleta", 150, "lunch"],
    ["pelmeni", 250, "dinner"],
    ["banan", 120, "snack"], ["mindal", 30, "snack"],
  ],
  [
    ["syrniki", 180, "breakfast"], ["yogurt", 150, "breakfast"],
    ["plov", 300, "lunch"], ["ogurec", 100, "lunch"],
    ["treska", 180, "dinner"], ["ris", 150, "dinner"],
    ["kefir", 250, "snack"],
  ],
  [
    ["granola", 100, "breakfast"], ["moloko", 200, "breakfast"],
    ["makarony", 250, "lunch"], ["govyadina", 130, "lunch"],
    ["indeyka", 150, "dinner"], ["salat-ovosh", 200, "dinner"],
    ["shokolad", 30, "snack"],
  ],
  [
    ["ovsyanka", 250, "breakfast"], ["med", 20, "breakfast"],
    ["borsch", 300, "lunch"], ["hleb-ch", 35, "lunch"],
    ["shaurma", 350, "dinner"],
    ["tvorog-5", 150, "snack"], ["klubnika", 100, "snack"],
  ],
  [
    ["omlet", 180, "breakfast"], ["syr", 25, "breakfast"],
    ["grechka", 200, "lunch"], ["kur-grudka", 140, "lunch"],
    ["krevetki", 150, "dinner"], ["brokkoli", 150, "dinner"],
    ["vinograd", 150, "snack"],
  ],
];

const SEED_WATER = [6, 4, 7, 5, 8, 3];

function seedState(): AppData {
  const days: Record<string, DayLog> = {};
  const t = todayKey();
  SEED_PLAN.forEach((plan, i) => {
    const key = shiftKey(t, -(i + 1));
    const entries = plan
      .map(([fid, grams, meal]) => {
        const food = findFood(fid);
        return food ? entryFromFood(food, grams, meal) : null;
      })
      .filter((e): e is Entry => e !== null)
      .map((e, j) => ({ ...e, addedAt: Date.now() - (i + 1) * 86400000 + j * 60000 }));
    days[key] = { entries, water: SEED_WATER[i] ?? 4 };
  });
  const w = (offset: number, value: number) => ({ date: shiftKey(t, offset), value });
  return {
    days,
    goals: { kcal: 2000, p: 100, f: 67, c: 200 },
    profile: { sex: "male", age: 28, height: 178, weight: 81.5, activity: 1.375 },
    weights: [w(-6, 82.3), w(-4, 81.9), w(-2, 81.6), w(-1, 81.4)],
  };
}

export function loadState(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed && parsed.days && parsed.goals && parsed.profile) return parsed;
    }
  } catch {
    /* повреждённые данные — начнём заново */
  }
  const fresh = seedState();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  } catch { /* приватный режим — работаем в памяти */ }
  return fresh;
}

export function saveState(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

export const fmt = (n: number) => n.toLocaleString("ru-RU");
