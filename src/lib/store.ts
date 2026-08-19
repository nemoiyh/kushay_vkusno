import type {
  AppData,
  DayLog,
  Entry,
  Food,
  Meal,
  MeasureEntry,
  MeasureKey,
  Recipe,
  RecipeIngredient,
  SleepEntry,
} from "../types";
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

  // демо-блюдо «Омлет с сыром» из ингредиентов базы
  const ing = (id: string, grams: number): RecipeIngredient | null => {
    const f = findFood(id);
    if (!f) return null;
    const k = grams / 100;
    return {
      foodId: f.id,
      name: f.name,
      grams,
      kcal: Math.round(f.kcal * k),
      p: round1(f.p * k),
      f: round1(f.f * k),
      c: round1(f.c * k),
    };
  };
  const omelet = [ing("yaico", 110), ing("moloko", 50), ing("syr", 30)].filter(
    (x): x is RecipeIngredient => x !== null,
  );
  const demoRecipes: Recipe[] = omelet.length
    ? [{ id: uid(), name: "Омлет с сыром", ingredients: omelet, createdAt: Date.now() - 86400000 }]
    : [];

  // демо-счётчики «частых» продуктов (согласованы с демо-неделей дневника)
  const usage: AppData["usage"] = {};
  const u = (id: string, count: number, grams: number, daysAgo: number) => {
    usage[id] = { count, lastUsed: Date.now() - daysAgo * 86400000 - 3600000, grams };
  };
  u("grechka", 12, 200, 1);
  u("kur-grudka", 10, 150, 1);
  u("yabloko", 9, 180, 2);
  u("ovsyanka", 8, 250, 2);
  u("yaico", 7, 110, 3);
  u("tvorog-5", 6, 150, 3);
  u("borsch", 5, 300, 4);
  u("banan", 5, 120, 5);
  u("kefir", 4, 250, 5);
  u("losos", 3, 140, 6);
  u("omlet", 3, 200, 6);
  u("shaurma", 2, 350, 7);
  if (demoRecipes[0]) u(demoRecipes[0].id, 4, demoRecipes[0].ingredients.reduce((s, i) => s + i.grams, 0), 4);

  return {
    days,
    goals: { kcal: 2000, p: 100, f: 67, c: 200 },
    profile: { sex: "male", age: 28, height: 178, weight: 81.5, activity: 1.375 },
    weights: [w(-6, 82.3), w(-4, 81.9), w(-2, 81.6), w(-1, 81.4)],
    customFoods: [],
    favoriteIds: ["grechka", "kur-grudka", "yabloko"],
    recipes: demoRecipes,
    usage,
    measures: {
      chest: [w(-24, 97.2), w(-8, 96.4)],
      shoulders: [w(-8, 118.5)],
      waist: [w(-24, 88.6), w(-8, 86.9)],
      belly: [w(-24, 91.8), w(-8, 89.9)],
      hips: [w(-24, 102.4), w(-8, 101.6)],
      leg: [w(-8, 54.6)],
      arm: [w(-8, 35.4)],
    },
    steps: [
      w(-6, 8420), w(-5, 10650), w(-4, 6180), w(-3, 9340), w(-2, 12100), w(-1, 7450),
    ],
    activity: [
      { date: shiftKey(t, -5), minutes: 45, kcal: 390 },
      { date: shiftKey(t, -3), minutes: 30, kcal: 255 },
      { date: shiftKey(t, -1), minutes: 55, kcal: 470 },
    ],
    sleep: [
      { date: shiftKey(t, -6), hours: 7.2, quality: "good" },
      { date: shiftKey(t, -5), hours: 6.4, quality: "bad" },
      { date: shiftKey(t, -4), hours: 7.9, quality: "good" },
      { date: shiftKey(t, -3), hours: 7.0, quality: "ok" },
      { date: shiftKey(t, -2), hours: 6.7, quality: "ok" },
      { date: shiftKey(t, -1), hours: 8.1, quality: "good" },
    ] as SleepEntry[],
    statsVisibility: defaultStatsVisibility(),
  };
}

export function loadState(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed && parsed.days && parsed.goals && parsed.profile) {
        // миграция со старых версий данных
        return {
          ...parsed,
          customFoods: parsed.customFoods ?? [],
          measures: parsed.measures ?? emptyMeasures(),
          steps: parsed.steps ?? [],
          activity: parsed.activity ?? [],
          sleep: parsed.sleep ?? [],
          statsVisibility: { ...defaultStatsVisibility(), ...(parsed.statsVisibility ?? {}) },
          favoriteIds: parsed.favoriteIds ?? [],
          recipes: parsed.recipes ?? [],
          usage: parsed.usage ?? {},
        };
      }
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

/** число с одним знаком, через запятую (для «7,5 ч», «81,4 кг») */
export const ru1 = (n: number) => n.toFixed(1).replace(".", ",");

/* ---------------- замеры тела, шаги, активность, сон ---------------- */

export const MEASURE_KEYS: { id: MeasureKey; label: string }[] = [
  { id: "chest", label: "Грудь" },
  { id: "shoulders", label: "Плечи" },
  { id: "waist", label: "Талия" },
  { id: "belly", label: "Живот" },
  { id: "hips", label: "Бёдра" },
  { id: "leg", label: "Нога" },
  { id: "arm", label: "Рука" },
];

export const emptyMeasures = (): Record<MeasureKey, MeasureEntry[]> => ({
  chest: [],
  shoulders: [],
  waist: [],
  belly: [],
  hips: [],
  leg: [],
  arm: [],
});

export const defaultStatsVisibility = (): AppData["statsVisibility"] => ({
  weight: true,
  measures: true,
  calories: true,
  macros: true,
  water: true,
  activity: true,
  steps: true,
  sleep: true,
});

/** заменить запись за дату или добавить новую */
export function upsertByDate<T extends { date: string }>(list: T[], entry: T): T[] {
  return [...list.filter((x) => x.date !== entry.date), entry];
}

/** расшифровать HTML-сущности («&quot;» → «"») в названиях из внешних API */
export function decodeEntities(s: string): string {
  if (!/&[a-zA-Z#0-9]+;/.test(s)) return s;
  const el = document.createElement("textarea");
  el.innerHTML = s;
  return el.value;
}

/** суммарные КБЖУ и вес составного блюда */
export function recipeTotals(r: Recipe) {
  const t = r.ingredients.reduce(
    (a, i) => ({
      grams: a.grams + i.grams,
      kcal: a.kcal + i.kcal,
      p: a.p + i.p,
      f: a.f + i.f,
      c: a.c + i.c,
    }),
    { grams: 0, kcal: 0, p: 0, f: 0, c: 0 },
  );
  return {
    grams: Math.round(t.grams),
    kcal: Math.round(t.kcal),
    p: round1(t.p),
    f: round1(t.f),
    c: round1(t.c),
  };
}
