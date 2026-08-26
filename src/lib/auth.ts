import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "../firebase";

/**
 * Аутентификация «Кушай вкусно» — только «ник + пароль», поверх Firebase Auth.
 *
 * Пользователь видит лишь поля «Ник» и «Пароль». Email для Firebase мы
 * генерируем сами: `<ник>@kushay-vkusno.app`, поэтому он никогда не показывается.
 * Сессией управляет Firebase (onAuthStateChanged), данные дневника — в Firestore.
 */

/** Домен, который мы подставляем в email, — пользователь его не видит. */
const EMAIL_DOMAIN = "kushay-vkusno.app";

export interface User {
  /** Внутренний id Firebase — ключ документа в Firestore. */
  uid: string;
  /** Публичный ник пользователя. */
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

/** `<ник>@kushay-vkusno.app` — единое правило генерации email из ника. */
export function nickToEmail(nick: string): string {
  return `${nick.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
}

function normNick(nick: string): string {
  return nick.trim().toLowerCase();
}

/** Ник из displayName Firebase-пользователя (или префикс email). */
function nickOf(displayName: string | null | undefined, email: string | null | undefined): string {
  if (displayName && displayName.trim()) return displayName.trim();
  if (email && email.includes("@")) return email.split("@")[0];
  return "user";
}

/* ---------- валидация и маппинг ошибок ---------- */

function validate(nick: string, password: string): string {
  const n = normNick(nick);
  if (n.length < 3) throw new AuthError("bad-input", "Ник — минимум 3 символа");
  if (password.length < 6) throw new AuthError("bad-input", "Пароль — минимум 6 символов");
  return n;
}

/** Превращаем коды Firebase в понятные пользователю сообщения. */
function mapAuthError(e: unknown): AuthError {
  const code = (e as { code?: string })?.code ?? "";
  if (code === "auth/email-already-in-use")
    return new AuthError("nick-taken", "Этот ник уже занят");
  if (
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found" ||
    code === "auth/invalid-email"
  )
    // Из соображений безопасности не уточняем, что именно неверно.
    return new AuthError("invalid-credentials", "Неверный ник или пароль");
  if (code === "auth/network-request-failed")
    return new AuthError("bad-input", "Ошибка сети. Проверьте интернет.");
  if (code === "auth/too-many-requests")
    return new AuthError("bad-input", "Слишком много попыток. Подождите немного и попробуйте снова.");
  if (code === "auth/weak-password")
    return new AuthError("bad-input", "Пароль слишком простой — минимум 6 символов");
  return new AuthError("bad-input", "Что-то пошло не так. Попробуйте ещё раз.");
}

/* ---------- сессия ---------- */

/**
 * Подписка на состояние авторизации Firebase.
 * Вызывается при старте и при каждом входе/выходе. Возвращает функцию отписки.
 */
export function watchAuth(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, (fbUser) => {
    if (fbUser) {
      cb({ uid: fbUser.uid, nick: nickOf(fbUser.displayName, fbUser.email) });
    } else {
      cb(null);
    }
  });
}

/** Выход из аккаунта. */
export function logout(): Promise<void> {
  return fbSignOut(auth);
}

/* ---------- регистрация / вход ---------- */

/**
 * Регистрация нового ника. Создаёт аккаунт в Firebase и сохраняет ник как
 * displayName. Возвращает пользователя (данные дневника подтянет синхронизация).
 */
export async function signup(nick: string, password: string): Promise<User> {
  const n = validate(nick, password);
  try {
    const cred = await createUserWithEmailAndPassword(auth, nickToEmail(n), password);
    await updateProfile(cred.user, { displayName: n });
    return { uid: cred.user.uid, nick: n };
  } catch (e) {
    throw mapAuthError(e);
  }
}

/**
 * Вход по нику и паролю. Возвращает пользователя
 * (данные дневника подтянет синхронизация из Firestore).
 */
export async function signin(nick: string, password: string): Promise<User> {
  const n = validate(nick, password);
  try {
    const cred = await signInWithEmailAndPassword(auth, nickToEmail(n), password);
    return { uid: cred.user.uid, nick: nickOf(cred.user.displayName, cred.user.email) };
  } catch (e) {
    throw mapAuthError(e);
  }
}
