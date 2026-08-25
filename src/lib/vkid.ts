/**
 * Интеграция VK ID (low-code).
 *
 * Авторизация делегирована VK ID. После успеха обмениваем authorization code на
 * токены через VKID.Auth.exchangeCode и храним их в localStorage
 * (vk_token / user_profile).
 *
 * ВАЖНО: redirectUrl зафиксирован побайтово и должен совпадать с «Доверенными
 * Redirect URI» приложения на dev.vk.com — иначе VK вернёт «Ошибка загрузки».
 */

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
 * redirectUrl — ТОЧНО как в «Доверенных Redirect URI» на dev.vk.com
 * (со слэшем на конце). Можно переопределить через VITE_VK_REDIRECT_URL.
 */
const REDIRECT_URL =
  (import.meta.env.VITE_VK_REDIRECT_URL as string | undefined) ??
  "https://nemoiyh.github.io/kushay_vkusno/";

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

/** Адрес авторизации VK ID (low-code / callback). Только штатные параметры —
 *  лишние (например дублирующий state) VK может отклонить ошибкой загрузки. */
export function buildAuthorizeUrl(state: string): string {
  const p = new URLSearchParams({
    app_id: String(APP_ID),
    redirect_uri: REDIRECT_URL,
    redirect_state: state,
    response_mode: "callback",
    scope: "email",
  });
  return `https://id.vk.com/authorize?${p.toString()}`;
}

/**
 * Синхронный адрес входа ВКонтакте — для использования в обычной ссылке
 * `<a href={vkLoginUrl()}>`. Генерирует anti-CSRF state и сохраняет его,
 * чтобы при возврате consumeVkOAuthCallback() мог сверить его.
 */
export function vkLoginUrl(): string {
  const state = randState();
  try {
    sessionStorage.setItem(STATE_KEY, state);
  } catch {
    /* приватный режим */
  }
  return buildAuthorizeUrl(state);
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

export const hasVkSession = (): boolean => Boolean(getVkToken() && getVkProfile());

/* ---------- вход через окно авторизации ---------- */

/** Предзагрузка SDK в фоне — к моменту обмена code→токены скрипт уже готов. */
export function preloadVkSdk(): void {
  void loadSdk();
}

/** Подписка на результат входа из попапа (postMessage). Возвращает отписку. */
export function onVkOAuthResult(cb: (data: VkTokenResponse) => void): () => void {
  const h = (ev: MessageEvent) => {
    const d = ev.data as { __kvVk?: VkTokenResponse } | null;
    if (d && d.__kvVk) cb(d.__kvVk);
  };
  window.addEventListener("message", h);
  return () => window.removeEventListener("message", h);
}

/**
 * Перехватывает ошибки от ВК. Если ВКонтакте вернул нас с ?error=... (например,
 * не совпал Redirect URI или вход отменён), чистит URL и возвращает понятный
 * текст для пользователя. Иначе — null.
 */
export function consumeVkOAuthError(): string | null {
  const url = new URL(window.location.href);
  const err = url.searchParams.get("error");
  const desc = url.searchParams.get("error_description");
  if (!err && !desc) return null;

  // Чистим адресную строку, чтобы ошибка не «прилипала» при обновлении
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  window.history.replaceState(null, "", url.toString());

  if (err === "access_denied") return "Вход через ВКонтакте отменён.";
  if (desc) return decodeURIComponent(desc.replace(/\+/g, " "));
  return "Разрешите всплывающие окна для этого сайта и попробуйте ещё раз.";
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
  if (!code) return null;

  let expected: string | null = null;
  try {
    expected = sessionStorage.getItem(STATE_KEY);
  } catch { /* ignore */ }

  // Чистим URL, чтобы параметры не мешали приложению и не срабатывали повторно
  url.searchParams.delete("code");
  url.searchParams.delete("device_id");
  url.searchParams.delete("state");
  url.searchParams.delete("redirect_state");
  window.history.replaceState(null, "", url.toString());

  if (expected && state && state !== expected) return null;

  const VKID = await loadSdk();
  if (!VKID || !deviceId) return null;
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
