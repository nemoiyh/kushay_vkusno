/**
 * Интеграция VK ID (low-code).
 *
 * Авторизация полностью делегирована VK ID — Supabase здесь НЕ используется.
 * Вместо OneTap-шторки используется полноценное окно авторизации: метод
 * VKID.Auth.openOAuthPopup() (SDK 2.x), а если он недоступен — полный
 * redirect на id.vk.com/authorize. В обоих случаях после входа VK возвращает
 * нас на redirectUrl с параметрами code + device_id, которые мы обмениваем на
 * токены через VKID.Auth.exchangeCode и храним в localStorage
 * (vk_token / user_profile).
 */

/* Типизация минимального API VK ID SDK */
declare global {
  interface Window {
    VKIDSDK?: VkSdk;
  }
}

interface VkSdk {
  Config: {
    init: (cfg: Record<string, unknown>) => void;
  };
  ConfigResponseMode: { Callback: string; [k: string]: string };
  ConfigSource: { LOWCODE: string; [k: string]: string };
  OneTap: new () => unknown;
  Auth: {
    exchangeCode: (code: string, deviceId: string) => Promise<VkTokenResponse>;
    openOAuthPopup?: (opts?: { state?: string; redirectUrl?: string }) => unknown;
  };
}

export interface VkTokenResponse {
  access_token: string;
  access_token_expires?: number;
  refresh_token?: string;
  refresh_token_expires?: number;
  user_id: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
}

export interface VkProfile {
  user_id: number;
  email?: string;
  name?: string;
  avatar?: string;
}

const SDK_URL = "https://unpkg.com/@vkid/sdk@2.1.0/dist-sdk/umd/index.js";
export const APP_ID = 54728657;

/**
 * redirectUrl для VK ID. По умолчанию — адрес, по которому открыто приложение
 * (origin + path, например https://username.github.io/repo-name/) — так вход
 * работает на любом домене деплоя без пересборки. Точное значение можно
 * зафиксировать переменной окружения VITE_VK_REDIRECT_URL. ВАЖНО: итоговый URL
 * должен быть добавлен в «Доверенные Redirect URI» приложения на dev.vk.com.
 */
const REDIRECT_URL =
  (import.meta.env.VITE_VK_REDIRECT_URL as string | undefined) ??
  (typeof window !== "undefined" ? window.location.origin + window.location.pathname : "");

const TOKEN_KEY = "vk_token";
const PROFILE_KEY = "user_profile";
const STATE_KEY = "vk_oauth_state";

let sdkPromise: Promise<VkSdk | null> | null = null;

/** Подгружаем SDK один раз и кэшируем промис. */
function loadSdk(): Promise<VkSdk | null> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve) => {
    if (window.VKIDSDK) {
      resolve(window.VKIDSDK);
      return;
    }
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => resolve(window.VKIDSDK ?? null);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return sdkPromise;
}

function initConfig(VKID: VkSdk) {
  VKID.Config.init({
    app: APP_ID,
    redirectUrl: REDIRECT_URL,
    responseMode: VKID.ConfigResponseMode.Callback,
    source: VKID.ConfigSource.LOWCODE,
    scope: "email",
  });
}

function randState(): string {
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Прямой OAuth-адрес (используется как fallback, если openOAuthPopup нет). */
export function buildAuthorizeUrl(state: string): string {
  return (
    "https://id.vk.com/authorize" +
    `?app_id=${APP_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URL)}` +
    `&redirect_state=${encodeURIComponent(state)}` +
    "&response_mode=callback" +
    "&scope=email"
  );
}

/* ---------- сессия VK ID ---------- */

export const getVkToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const getVkProfile = (): VkProfile | null => {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as VkProfile) : null;
  } catch {
    return null;
  }
};

export function saveVkSession(data: VkTokenResponse): VkProfile {
  const name =
    [data.first_name, data.last_name].filter(Boolean).join(" ").trim() || undefined;
  const profile: VkProfile = {
    user_id: data.user_id,
    email: data.email,
    name,
    avatar: data.avatar,
  };
  try {
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* приватный режим — работаем в памяти */
  }
  return profile;
}

export function clearVkSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    /* ignore */
  }
}

/** Есть ли активная сессия VK ID. */
export const hasVkSession = (): boolean => Boolean(getVkToken() && getVkProfile());

/* ---------- вход через полноценное окно авторизации ---------- */

/**
 * Открывает полноценное окно авторизации VK (не OneTap-шторку).
 *
 * Сначала пробуем нативный VKID.Auth.openOAuthPopup() — результат придёт через
 * postMessage из попапа (попап редиректит на наш redirectUrl с code в URL,
 * загружает приложение, а оно отдаёт токены основному окну и закрывается).
 * Если метода нет — делаем полный redirect в этом окне: после входа VK вернёт
 * нас сюда с code в URL, и его обработает consumeVkOAuthCallback() при загрузке.
 */
export async function startVkOAuth(
  onSuccess: (data: VkTokenResponse) => void,
  onError: (error: unknown) => void,
): Promise<void> {
  const VKID = await loadSdk();
  if (!VKID) {
    onError(new Error("Не удалось загрузить VK ID SDK. Проверьте интернет."));
    return;
  }
  initConfig(VKID);

  const state = randState();
  try {
    sessionStorage.setItem(STATE_KEY, state);
  } catch { /* ignore */ }

  // Слушаем ответ из попапа (он пришлёт токены через postMessage)
  const onMessage = (ev: MessageEvent) => {
    const d = ev.data as { __kvVk?: VkTokenResponse } | null;
    if (d && d.__kvVk) {
      window.removeEventListener("message", onMessage);
      onSuccess(d.__kvVk);
    }
  };
  window.addEventListener("message", onMessage);

  if (typeof VKID.Auth.openOAuthPopup === "function") {
    try {
      VKID.Auth.openOAuthPopup({ state, redirectUrl: REDIRECT_URL });
      return; // результат придёт через postMessage
    } catch {
      /* метод бросил исключение — падаем на redirect ниже */
    }
  }

  // Фолбэк: полный redirect в этом окне (самый надёжный вариант)
  window.location.assign(buildAuthorizeUrl(state));
}

/**
 * Вызывается при старте приложения. Если в URL есть code + device_id (возврат
 * из VK), обменивает их на токены. В попапе — отдаёт результат основному окну
 * и закрывается; при полном редиректе — возвращает данные для входа здесь.
 */
export async function consumeVkOAuthCallback(): Promise<VkTokenResponse | null> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const deviceId = url.searchParams.get("device_id");
  const state =
    url.searchParams.get("state") ?? url.searchParams.get("redirect_state");
  if (!code || !deviceId) return null;

  let expected: string | null = null;
  try {
    expected = sessionStorage.getItem(STATE_KEY);
  } catch { /* ignore */ }

  // Чистим URL, чтобы параметры не мешали приложению
  url.searchParams.delete("code");
  url.searchParams.delete("device_id");
  url.searchParams.delete("state");
  url.searchParams.delete("redirect_state");
  window.history.replaceState(null, "", url.toString());

  // Если state не совпадает — это не наш флоу, игнорируем
  if (expected && state && state !== expected) return null;

  const VKID = await loadSdk();
  if (!VKID) return null;
  initConfig(VKID);

  try {
    const data = await VKID.Auth.exchangeCode(code, deviceId);
    try {
      sessionStorage.removeItem(STATE_KEY);
    } catch { /* ignore */ }

    // Мы в попапе — отдаём токены основному окну и закрываемся
    if (window.opener) {
      window.opener.postMessage({ __kvVk: data }, "*");
      window.close();
      return null;
    }
    // Полный редирект — входим прямо в этом окне
    return data;
  } catch {
    return null;
  }
}
