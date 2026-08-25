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
  brand?: string;
  image?: string;
  createdAt?: number;
  source?: {
    type: "open_food_facts" | "manual";
    original_id?: string;
    url?: string;
  };
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
  value: number;
}

export interface StepsEntry {
  date: string;
  value: number;
}

export interface ActivityEntry {
  date: string;
  minutes: number;
  kcal: number;
}

export interface SleepEntry {
  date: string;
  hours: number;
  quality?: "good" | "ok" | "bad";
}

export interface RecipeIngredient {
  foodId?: string;
  name: string;
  grams: number;
  kcal: number;
  p: number;
  f: number;
  c: number;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  createdAt: number;
}

export interface UsageInfo {
  count: number;
  lastUsed: number;
  grams: number;
}

export type StatsBlockKey =
  | "weight"
  | "measures"
  | "calories"
  | "macros"
  | "water"
  | "activity"
  | "steps"
  | "sleep";

export interface AppData {
  days: Record<string, DayLog>;
  goals: Goals;
  profile: Profile;
  weights: WeightEntry[];
  customFoods: Food[];
  measures: Record<MeasureKey, MeasureEntry[]>;
  steps: StepsEntry[];
  activity: ActivityEntry[];
  sleep: SleepEntry[];
  statsVisibility: Record<StatsBlockKey, boolean>;
  favoriteIds: string[];
  recipes: Recipe[];
  usage: Record<string, UsageInfo>;
}

export type ToastKind = "success" | "error" | "info";
export interface ToastItem {
  id: string;
  text: string;
  kind: ToastKind;
}
