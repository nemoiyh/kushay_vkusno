export type Meal = "breakfast" | "lunch" | "dinner" | "snack";
export type Sex = "male" | "female";
export type View = "diary" | "foods" | "stats" | "settings";

export interface Food {
  id: string;
  name: string;
  cat: string;
  /** на 100 г */
  kcal: number;
  p: number;
  f: number;
  c: number;
  unit?: { label: string; grams: number };
  /** штрихкод EAN-13 / EAN-8, если известен */
  barcode?: string;
  /** бренд / производитель (из Open Food Facts) */
  brand?: string;
  /** миниатюра товара (из Open Food Facts) */
  image?: string;
  /** откуда продукт импортирован */
  source?: { type: string; original_id: string; url: string };
}

export interface Entry {
  id: string;
  foodId?: string;
  name: string;
  grams: number;
  meal: Meal;
  kcal: number;
  p: number;
  f: number;
  c: number;
  addedAt: number;
}

export interface DayLog {
  entries: Entry[];
  water: number; // стаканов
}

export interface Goals {
  kcal: number;
  p: number;
  f: number;
  c: number;
}

export interface Profile {
  sex: Sex;
  age: number;
  height: number;
  weight: number;
  activity: number;
}

export interface WeightEntry {
  date: string;
  value: number;
}

/** блоки страницы «Статистика», видимостью которых можно управлять */
export type StatsBlockKey =
  | "weight"
  | "measures"
  | "calories"
  | "macros"
  | "water"
  | "activity"
  | "steps"
  | "sleep";

/** ключи замеров тела */
export type MeasureKey =
  | "chest"
  | "shoulders"
  | "waist"
  | "belly"
  | "hips"
  | "leg"
  | "arm";

export interface MeasureEntry {
  date: string;
  value: number; // см
}

export interface StepsEntry {
  date: string;
  value: number;
}

export interface ActivityEntry {
  date: string;
  minutes: number;
  kcal: number; // активные ккал
}

export interface SleepEntry {
  date: string;
  hours: number;
  quality?: "good" | "ok" | "bad";
}

export interface AppData {
  days: Record<string, DayLog>;
  goals: Goals;
  profile: Profile;
  weights: WeightEntry[];
  /** продукты пользователя (в т. ч. созданные по штрихкоду) */
  customFoods: Food[];
  /** замеры тела по параметрам */
  measures: Record<MeasureKey, MeasureEntry[]>;
  steps: StepsEntry[];
  activity: ActivityEntry[];
  sleep: SleepEntry[];
  /** какие блоки показывать на странице «Статистика» */
  statsVisibility: Record<StatsBlockKey, boolean>;
}

export type ToastKind = "success" | "error" | "info";
export interface ToastItem {
  id: string;
  text: string;
  kind: ToastKind;
}
