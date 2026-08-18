export type Meal = "breakfast" | "lunch" | "dinner" | "snack";
export type Sex = "male" | "female";
export type View = "diary" | "foods" | "settings";

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

export interface AppData {
  days: Record<string, DayLog>;
  goals: Goals;
  profile: Profile;
  weights: WeightEntry[];
  /** продукты пользователя (в т. ч. созданные по штрихкоду) */
  customFoods: Food[];
}

export type ToastKind = "success" | "error" | "info";
export interface ToastItem {
  id: string;
  text: string;
  kind: ToastKind;
}
