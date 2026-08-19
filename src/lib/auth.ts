import type { AppData } from "../types";

/**
 * Сервис аутентификации «Кушай вкусно».
 *
 * Сейчас работает в автономном (демо) режиме: аккаунты, сессии и «облачные»
 * данные хранятся в localStorage браузера, пароли — SHA-256 + соль (WebCrypto).
 *
 * Для боевого режима подключите Supabase и замените реализации функций на:
 *   signup        → supabase.auth.signUp({ email, password })
 *   signin        → supabase.auth.signInWithPassword({ email, password })
 *   signinWithProvider → supabase.auth.signInWithOAuth({ provider })   (google | vk | apple)
 *   requestReset  → supabase.auth.resetPasswordForEmail(email)
 *   load/saveAccountData → таблица profiles (jsonb) + RLS-политики
 * Сессии Supabase (JWT + refresh) обрабатывает сам SDK — restoreSession/signOut
 * тогда сводятся к getSession()/signOut().
 */

const ACCOUNTS_KEY = "kv:accounts";
const SESSION_KEY = "kv:session";
const DATA_PREFIX = "kv:data:";

export type Provider = "password" | "google" | "vk" | "apple";

export interface Account {
  id: string;
  email: string;
  name?: string;
  provider: Provider;
  passHash?: string;
  salt?: string;
  createdAt: number;
}

export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  provider: Provider;
}

interface StoredSession {
  token: string;
  refresh: string;
  user: SessionUser;
  expiresAt: number;
  refreshExpiresAt: number;
  remember: boolean;
}

export type AuthErrorCode =
  | "email-taken"
  | "invalid-credentials"
  | "network"
  | "no-account"
  | "bad-code";

export class AuthError extends Error {
  code: AuthErrorCode;
  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

/* ---------- утилиты ---------- */

const delay = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

const newId = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function rand(bytes = 24): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(pw: string, salt: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${salt}:${pw}`),
  );
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function readAccounts(): Account[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]") as Account[];
  } catch {
    return [];
  }
}
const writeAccounts = (list: Account[]) =>
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));

const ACCESS_TTL = 2 * 60 * 60 * 1000; // access-токен: 2 часа
const refreshTtl = (remember: boolean) => (remember ? 30 : 1) * 24 * 60 * 60 * 1000;

function storeSession(s: StoredSession) {
  const raw = JSON.stringify(s);
  (s.remember ? localStorage : sessionStorage).setItem(SESSION_KEY, raw);
  (s.remember ? sessionStorage : localStorage).removeItem(SESSION_KEY);
}

function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function makeSession(user: SessionUser, remember: boolean): StoredSession {
  const now = Date.now();
  return {
    token: rand(),
    refresh: rand(),
    user,
    expiresAt: now + ACCESS_TTL,
    refreshExpiresAt: now + refreshTtl(remember),
    remember,
  };
}

/* ---------- сессии ---------- */

/** Восстановление сессии при запуске; access-токен тихо продлевается refresh-токеном. */
export function restoreSession(): SessionUser | null {
  const s = readSession();
  if (!s) return null;
  const now = Date.now();
  if (now < s.expiresAt) return s.user;
  if (now < s.refreshExpiresAt) {
    storeSession({ ...s, token: rand(), expiresAt: now + ACCESS_TTL });
    return s.user; // тихое продление
  }
  signOut(); // обе жизни истекли — на экран входа
  return null;
}

export function signOut() {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
}

/* ---------- регистрация / вход ---------- */

export const isValidEmail = (s: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

export async function signup(email: string, password: string): Promise<SessionUser> {
  await delay(550);
  if (!navigator.onLine) throw new AuthError("network", "Ошибка сети. Проверьте интернет.");
  const em = email.trim().toLowerCase();
  const accounts = readAccounts();
  if (accounts.some((a) => a.email === em))
    throw new AuthError("email-taken", "Этот email уже занят. Попробуйте войти.");
  const salt = rand(8);
  const acc: Account = {
    id: newId(),
    email: em,
    provider: "password",
    salt,
    passHash: await hashPassword(password, salt),
    createdAt: Date.now(),
  };
  writeAccounts([...accounts, acc]);
  storeSession(makeSession({ id: acc.id, email: acc.email, provider: "password" }, true));
  return { id: acc.id, email: acc.email, provider: "password" };
}

export async function signin(
  email: string,
  password: string,
  remember: boolean,
): Promise<SessionUser> {
  await delay(550);
  if (!navigator.onLine) throw new AuthError("network", "Ошибка сети. Проверьте интернет.");
  const em = email.trim().toLowerCase();
  const acc = readAccounts().find((a) => a.email === em && a.provider === "password");
  // из соображений безопасности не уточняем, что именно неверно
  if (!acc || !acc.salt || !acc.passHash)
    throw new AuthError("invalid-credentials", "Неверный email или пароль");
  const h = await hashPassword(password, acc.salt);
  if (h !== acc.passHash)
    throw new AuthError("invalid-credentials", "Неверный email или пароль");
  storeSession(makeSession({ id: acc.id, email: acc.email, provider: "password" }, remember));
  return { id: acc.id, email: acc.email, provider: "password" };
}

/* ---------- вход через соцсети (демо-эмуляция OAuth) ---------- */

const OAUTH_DEMO: Record<Exclude<Provider, "password">, { name: string; email: string }> = {
  google: { name: "Google Demo", email: "demo.google@kv.app" },
  vk: { name: "VK ID Demo", email: "demo.vk@kv.app" },
  apple: { name: "Apple ID Demo", email: "demo.apple@kv.app" },
};

/**
 * В демо-режиме эмулирует редирект к провайдеру: создаёт (или находит) аккаунт
 * провайдера и открывает сессию. В боевом режиме — signInWithOAuth у Supabase;
 * запись пользователя создаётся автоматически при первом входе.
 */
export async function signinWithProvider(p: Exclude<Provider, "password">): Promise<SessionUser> {
  await delay(1200); // «редирект» к провайдеру
  if (!navigator.onLine) throw new AuthError("network", "Ошибка сети. Проверьте интернет.");
  const meta = OAUTH_DEMO[p];
  const accounts = readAccounts();
  let acc = accounts.find((a) => a.provider === p);
  if (!acc) {
    acc = { id: newId(), email: meta.email, name: meta.name, provider: p, createdAt: Date.now() };
    writeAccounts([...accounts, acc]);
  }
  const user: SessionUser = { id: acc.id, email: acc.email, name: acc.name, provider: p };
  storeSession(makeSession(user, true));
  return user;
}

/* ---------- восстановление пароля ---------- */

let pendingReset: { email: string; code: string; expires: number } | null = null;

/** В демо-режиме возвращает код (в бою — отправляется письмом через Supabase). */
export async function requestReset(email: string): Promise<string> {
  await delay(650);
  const em = email.trim().toLowerCase();
  if (!readAccounts().some((a) => a.email === em && a.provider === "password"))
    throw new AuthError("no-account", "Аккаунт с таким email не найден");
  const code = String(Math.floor(100000 + Math.random() * 900000));
  pendingReset = { email: em, code, expires: Date.now() + 10 * 60 * 1000 };
  return code;
}

export async function resetPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  await delay(550);
  const em = email.trim().toLowerCase();
  if (
    !pendingReset ||
    pendingReset.email !== em ||
    pendingReset.code !== code.trim() ||
    Date.now() > pendingReset.expires
  )
    throw new AuthError("bad-code", "Код неверный или истёк");
  const accounts = readAccounts();
  const acc = accounts.find((a) => a.email === em && a.provider === "password");
  if (!acc) throw new AuthError("no-account", "Аккаунт не найден");
  acc.salt = rand(8);
  acc.passHash = await hashPassword(newPassword, acc.salt);
  writeAccounts(accounts);
  pendingReset = null;
}

/* ---------- «облачные» данные аккаунта ---------- */

export function loadAccountData(userId: string): { data: AppData; syncedAt: number } | null {
  try {
    const raw = localStorage.getItem(DATA_PREFIX + userId);
    return raw ? (JSON.parse(raw) as { data: AppData; syncedAt: number }) : null;
  } catch {
    return null;
  }
}

export function saveAccountData(userId: string, data: AppData): number {
  const syncedAt = Date.now();
  try {
    localStorage.setItem(DATA_PREFIX + userId, JSON.stringify({ data, syncedAt }));
  } catch { /* ignore */ }
  return syncedAt;
}

export function accountSyncedAt(userId: string): number | null {
  try {
    const raw = localStorage.getItem(DATA_PREFIX + userId);
    return raw ? ((JSON.parse(raw) as { syncedAt: number }).syncedAt ?? null) : null;
  } catch {
    return null;
  }
}

/* ---------- разное ---------- */

export const PROVIDER_LABEL: Record<Provider, string> = {
  password: "Пароль",
  google: "Google",
  vk: "ВКонтакте",
  apple: "Apple",
};

export function isAppleDevice(): boolean {
  return /iphone|ipad|ipod|macintosh|mac os/i.test(navigator.userAgent);
}

/** индикатор сложности пароля: 0…4 */
export function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-zа-яё]/.test(pw) && /[A-ZА-ЯЁ]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^a-zA-Zа-яА-ЯёЁ0-9]/.test(pw)) s++;
  const score = Math.min(4, s) as 0 | 1 | 2 | 3 | 4;
  const label = ["Очень слабый", "Слабый", "Средний", "Хороший", "Надёжный"][score];
  return { score, label };
}
