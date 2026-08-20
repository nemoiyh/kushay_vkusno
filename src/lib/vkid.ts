/**
 * Интеграция VK ID (low-code, OneTap-виджет).
 *
 * Авторизация полностью делегирована VK ID — Supabase здесь НЕ используется.
 * После успеха мы сами обмениваем authorization code на токены через
 * VKID.Auth.exchangeCode и храним их в localStorage (vk_token / user_profile).
 */

/* Типизация минимального API VK ID SDK */
declare global {
  interface Window {
    VKIDSDK?: VkSdk;
    vkidOnSuccess?: (data: VkTokenResponse) => void;
    vkidOnError?: (error: unknown) => void;
  }
}

interface VkSdk {
  Config: {
    init: (cfg: Record<string, unknown>) => void;
  };
  ConfigResponseMode: { Callback: string; [k: string]: string };
  ConfigSource: { LOWCODE: string; [k: string]: string };
  WidgetEvents: { ERROR: string; [k: string]: string };
  OneTapInternalEvents: { LOGIN_SUCCESS: string; [k: string]: string };
  OneTap: new () => VkOneTap;
  Auth: {
    exchangeCode: (code: string, deviceId: string) => Promise<VkTokenResponse>;
  };
}

interface VkOneTap {
  render: (opts: { container: HTMLElement; showAlternativeLogin?: boolean }) => VkOneTap;
  on: (event: string, handler: (payload: unknown) => void) => VkOneTap;
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
const APP_ID = 54728657;
const REDIRECT_URL = "https://kushayvkusno.netlify.app/";

const TOKEN_KEY = "vk_token";
const PROFILE_KEY = "user_profile";

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

/* ---------- рендер OneTap-виджета ---------- */

/**
 * Рендерит OneTap-виджет VK ID в контейнер.
 * Возвращает функцию очистки (виджет сам управляет попапом).
 */
export async function renderVkOneTap(
  container: HTMLElement,
  onSuccess: (data: VkTokenResponse) => void,
  onError: (error: unknown) => void,
): Promise<(() => void) | null> {
  const VKID = await loadSdk();
  if (!VKID) {
    onError(new Error("Не удалось загрузить VK ID SDK"));
    return null;
  }

  VKID.Config.init({
    app: APP_ID,
    redirectUrl: REDIRECT_URL,
    responseMode: VKID.ConfigResponseMode.Callback,
    source: VKID.ConfigSource.LOWCODE,
    scope: "",
  });

  const oneTap = new VKID.OneTap();

  oneTap
    .render({
      container,
      showAlternativeLogin: true,
    })
    .on(VKID.WidgetEvents.ERROR, (err) => onError(err))
    .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, (payload) => {
      const p = payload as { code: string; device_id: string };
      VKID.Auth.exchangeCode(p.code, p.device_id).then(onSuccess).catch(onError);
    });

  // Глобальные обработчики (на случай, если SDK ожидает их в window)
  window.vkidOnSuccess = onSuccess;
  window.vkidOnError = onError;

  return () => {
    container.innerHTML = "";
  };
}
