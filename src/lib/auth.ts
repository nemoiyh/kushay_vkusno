import type { AppData } from "../types";
import { emptyState, defaultStatsVisibility } from "./store";

/**
 * Аутентификация «Кушай вкусно» — только «ник + пароль» (бэкенда нет).
 *
 * Хранение — localStorage:
 *   kv_users        — массив { nick, passHash, createdAt } (пароли — SHA-256)
 *   kv_session      — ник текущего пользователя
 *   kv_data_<nick>  — данные дневника конкретного пользователя
 *
 * Пароли никогда не хранятся в открытом виде: хэшируются через
 * crypto.subtle.digest("SHA-256").
 */

const USERS_KEY = "kv_users";
const SESSION_KEY = "kv_session";
const dataKey = (nick: string) => `kv_data_${nick}`;

export interface StoredUser {
  nick: string;
  passHash: string;
  createdAt: number;
}

export interface User {
  nick: string;
}

export type AuthErrorCode = "nick-taken" | "invalid-credentials" | "bad-input";

export class AuthError extends Error {
  code: AuthErrorCode;
  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

/* ---------- утилиты ---------- */

/** SHA-256(пароль) в hex. Соль не нужна при локальном хранении без бэкенда,
 *  но хэш делает пароль нечитаемым в localStorage. */
async function hashPassword(pw: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function readUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]") as StoredUser[];
  } catch {
    return [];
  }
}
const writeUsers = (list: StoredUser[]) =>
  localStorage.setItem(USERS_KEY, JSON.stringify(list));

function normNick(nick: string): string {
  return nick.trim().toLowerCase();
}

/* ---------- сессия ---------- */

/** Ник из kv_session (если есть) — иначе null. */
export function getSessionUser(): User | null {
  try {
    const nick = localStorage.getItem(SESSION_KEY);
    return nick ? { nick } : null;
  } catch {
    return null;
  }
}

function setSession(nick: string) {
  try {
    localStorage.setItem(SESSION_KEY, nick);
  } catch { /* приватный режим */ }
}

/** Выход: очищаем kv_session. Данные пользователя остаются на устройстве. */
export function signOut(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
}

/* ---------- данные пользователя ---------- */

export function loadUserData(nick: string): AppData | null {
  try {
    const raw = localStorage.getItem(dataKey(nick));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed || !parsed.goals || !parsed.profile) return null;
    return {
      ...parsed,
      days: parsed.days ?? {},
      weights: parsed.weights ?? [],
      customFoods: parsed.customFoods ?? [],
      steps: parsed.steps ?? [],
      activity: parsed.activity ?? [],
      sleep: parsed.sleep ?? [],
      favoriteIds: parsed.favoriteIds ?? [],
      recipes: parsed.recipes ?? [],
      usage: parsed.usage ?? {},
      statsVisibility: { ...defaultStatsVisibility(), ...(parsed.statsVisibility ?? {}) },
    };
  } catch {
    return null;
  }
}

export function saveUserData(nick: string, data: AppData): void {
  try {
    localStorage.setItem(dataKey(nick), JSON.stringify(data));
  } catch { /* ignore */ }
}

/* ---------- регистрация / вход ---------- */

function validate(nick: string, password: string): { nick: string } {
  const n = normNick(nick);
  if (n.length < 3)
    throw new AuthError("bad-input", "Ник — минимум 3 символа");
  if (password.length < 6)
    throw new AuthError("bad-input", "Пароль — минимум 6 символов");
  return { nick: n };
}

/**
 * Регистрация нового ника. Создаёт аккаунт, чистый дневник и открывает сессию.
 * Возвращает данные нового пользователя (пустые).
 */
export async function signup(nick: string, password: string): Promise<AppData> {
  const { nick: n } = validate(nick, password);
  const users = readUsers();
  if (users.some((u) => u.nick === n))
    throw new AuthError("nick-taken", "Этот ник уже занят");
  const passHash = await hashPassword(password);
  writeUsers([...users, { nick: n, passHash, createdAt: Date.now() }]);

  const data = emptyState();
  saveUserData(n, data);
  setSession(n);
  return data;
}

/**
 * Вход по нику и паролю. Возвращает сохранённые данные пользователя
 * (или чистые, если их ещё нет).
 */
export async function signin(nick: string, password: string): Promise<AppData> {
  const { nick: n } = validate(nick, password);
  const user = readUsers().find((u) => u.nick === n);
  // Из соображений безопасности не уточняем, что именно неверно.
  if (!user)
    throw new AuthError("invalid-credentials", "Неверный ник или пароль");
  const passHash = await hashPassword(password);
  if (passHash !== user.passHash)
    throw new AuthError("invalid-credentials", "Неверный ник или пароль");

  setSession(n);
  return loadUserData(n) ?? emptyState();
}
