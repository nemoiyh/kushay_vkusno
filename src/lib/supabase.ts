/**
 * Supabase используется ТОЛЬКО как база данных (CRUD): дневник, продукты, вес.
 * Авторизация — через VK ID (см. lib/vkid.ts). Supabase.auth здесь не вызывается.
 *
 * Клиент создаётся лениво и только если заданы переменные окружения
 * VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY — так сам SDK не попадает в основной
 * бандл, пока не нужен. Иначе приложение работает на локальном хранилище (демо).
 *
 * RLS: для записи анонимным пользователям настройте политику
 *   create policy "allow all for public" on kv_data for all using (true) with check (true);
 * либо временно отключите RLS на время тестов:
 *   alter table kv_data disable row level security;
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppData } from "../types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

let clientPromise: Promise<SupabaseClient | null> | null = null;

/** Ленивая инициализация клиента (SDK подгружается отдельным чанком). */
function getClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(url!, anonKey!, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    );
  }
  return clientPromise;
}

/** Сохранить данные пользователя в облако (таблица kv_data, колонка payload jsonb). */
export async function cloudSaveData(userId: string, data: AppData): Promise<boolean> {
  const supabase = await getClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("kv_data")
      .upsert({ user_id: userId, payload: data, updated_at: new Date().toISOString() });
    return !error;
  } catch {
    return false;
  }
}

/** Загрузить данные пользователя из облака. */
export async function cloudLoadData(userId: string): Promise<AppData | null> {
  const supabase = await getClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("kv_data")
      .select("payload")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data?.payload) return null;
    return data.payload as AppData;
  } catch {
    return null;
  }
}
