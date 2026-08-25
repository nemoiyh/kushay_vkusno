/**
 * Интеграция VK ID (low-code).
 *
 * Авторизация полностью делегирована VK ID — Supabase здесь НЕ используется.
 * Flow — классический OAuth 2.1 code flow без зависимости от «капризных»
 * внутренних методов SDK:
 *
 * 1. По клику на «Войти через ВКонтакте» синхронно открывается window.open()
 *    на https://id.vk.com/authorize (если браузер заблокировал попап — делаем
 *    полный redirect в этом окне).
 * 2. После входа VK возвращает нас на redirectUrl с ?code=…&device_id=…
 * 3. consumeVkOAuthCallback() при загрузке приложения чистит URL, обменивает
 *    код на токены через VKID.Auth.exchangeCode и сохраняет их в localStorage
 *    (vk_token / user_profile). В попапе результат отдаётся основному окну
 *    через postMessage, после чего попап закрывается.
 *
 * redirectUrl по умолчанию — адрес, по которому открыто приложение
 * (origin + path), поэтому вход работает и на GitHub Pages, и на Netlify без
 * пересборки. ВАЖНО: адрес должен быть добавлен в «Доверенные Redirect URI»
 * приложения на dev.vk.com.
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
  Auth: {
    exchangeCode: (code: string, deviceId: string) => Promise<VkTokenResponse>;
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
 * redirectUrl для VK ID: переменная окружения VITE_VK_REDIRECT_URL или
 * фактический адрес приложения (origin + path).
 */
const REDIRECT_URL =
  (import.meta.env.VITE_VK_REDIRECT_URL as string | undefined) ??
  (typeof window !== "undefined" ? window.location.origin + window.location.pathname : "");

const TOKEN_KEY = "vk_token";
const PROFILE_KEY = "user_profile";
const STATE_KEY = "vk_oauth_state";

let sdkPromise: Promise<VkSdk | null> | null = null;

/** Подгружаем SDK один раз и кэшируем промис (с жёстким таймаутом). */
function loadSdk(timeoutMs = 8000): Promise<VkSdk | null> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve) => {
    if (window.VKIDSDK) {
      resolve(window.VKIDSDK);
      return;
    }
    let done = false;
    const finish = (sdk: VkSdk | null) => {
      if (!done) {
        done = true;
        resolve(sdk);
      }
    };
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => finish(window.VKIDSDK ?? null);
    s.onerror = () => finish(null);
    document.head.appendChild(s);
    window.setTimeout(() => finish(window.VKIDSDK ?? null), timeoutMs);
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

/** Классический OAuth-адрес авторизации VK ID (code flow). */
export function buildAuthorizeUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: String(APP_ID),
    redirect_uri: REDIRECT_URL,
    response_type: "code",
    state,
    scope: "email",
  });
  return `https://id.vk.com/authorize?${p.toString()}`;
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

/* ---------- вход через окно авторизации ---------- */

/**
 * Предзагрузка SDK в фоне (вызывать при монтировании экрана входа) —
 * к моменту обмена code→токены скрипт уже будет готов.
 */
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
 * Открывает авторизацию VK. ВАЖНО: вызывать синхронно внутри обработчика
 * клика, иначе браузер заблокирует попап.
 *
 * Возвращает ссылку на попап (за ним можно следить) или null — тогда страница
 * уже перенаправляется на VK (полный redirect).
 */
export function startVkOAuth(onRedirect: () => void): Window | null {
  const state = randState();
  try {
    sessionStorage.setItem(STATE_KEY, state);
  } catch { /* ignore */ }

  const url = buildAuthorizeUrl(state);
  const popup = window.open(url, "kv_oauth", "width=680,height=780,menubar=no,toolbar=no");
  if (popup) return popup;

  // попап заблокирован — уходим в полный redirect (навигацию браузер не блокирует)
  onRedirect();
  window.location.assign(url);
  return null;
}

/* ---------- обработка возврата из VK ---------- */

/** Сообщение об ошибке прямо в попапе (если обмен кода не удался). */
function popupFail(message: string) {
  try {
    document.body.style.cssText =
      "margin:0;font-family:system-ui,sans-serif;background:#e9f0f0;color:#13262b";
    document.body.innerHTML =
      `<div style="display:grid;place-items:center;min-height:100vh;padding:24px;text-align:center">` +
      `<div><p style="font-weight:800;font-size:17px;margin:0 0 8px">Не удалось войти через ВКонтакте</p>` +
      `<p style="color:#57675a;font-size:14px;margin:0 0 12px">${message}</p>` +
      `<p style="color:#8a978b;font-size:13px;margin:0">Окно закроется автоматически…</p></div></div>`;
    window.setTimeout(() => window.close(), 2600);
  } catch {
    window.close();
  }
}

/**
 * Вызывается при старте приложения. Если в URL есть code + device_id (возврат
 * из VK), сразу чистит адресную строку (чтобы повторный вход не срабатывал при
 * обновлении страницы) и обменивает код на токены.
 *
 * В попапе — отдаёт токены основному окну через postMessage и закрывается;
 * при полном редиректе — возвращает данные для входа в этом окне.
 */
export async function consumeVkOAuthCallback(): Promise<VkTokenResponse | null> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const deviceId = url.searchParams.get("device_id");
  const state = url.searchParams.get("state") ?? url.searchParams.get("redirect_state");
  if (!code) return null;

  let expected: string | null = null;
  try {
    expected = sessionStorage.getItem(STATE_KEY);
  } catch { /* ignore */ }

  // Сразу убираем ?code=… из адресной строки
  for (const k of ["code", "device_id", "state", "redirect_state"]) url.searchParams.delete(k);
  window.history.replaceState(null, "", url.pathname + (url.searchParams.size ? `?${url.searchParams}` : "") + url.hash);

  // Если state не совпадает — это не наш флоу, игнорируем
  if (expected && state && state !== expected) return null;

  const VKID = await loadSdk();
  if (!VKID) {
    if (window.opener) {
      window.opener.postMessage({ __kvVk: null, __kvVkError: "Не удалось загрузить VK ID SDK" }, "*");
      window.close();
    }
    return null;
  }
  initConfig(VKID);

  try {
    const data = await VKID.Auth.exchangeCode(code, deviceId ?? "");
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
    if (window.opener) popupFail("Код авторизации устарел или неверен.");
    return null;
  }
}
