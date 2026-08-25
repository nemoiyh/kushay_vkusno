/**
 * Supabase используется ТОЛЬКО как база данных (CRUD), не для авторизации.
 * Клиент создаётся лениво и только при наличии переменных окружения —
 * иначе приложение работает на localStorage.
 *
 *   VITE_SUPABASE_URL=https://<проект>.supabase.co
 *   VITE_SUPABASE_ANON_KEY=<anon-ключ>
 *
 * Таблица kv_data: user_id text, payload jsonb, updated_at timestamptz.
 */
import type { AppData } from "../types";

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const TABLE = "kv_data";

type SupaClient = {
  from: (table: string) => any;
};

let clientPromise: Promise<SupaClient | null> | null = null;

function getClient(): Promise<SupaClient | null> {
  if (!URL || !KEY) return Promise.resolve(null);
  if (clientPromise) return clientPromise;
  clientPromise = import("@supabase/supabase-js")
    .then(({ createClient }) => createClient(URL!, KEY!) as SupaClient)
    .catch(() => null);
  return clientPromise;
}

/** Загрузить данные пользователя из облака (или null). */
export async function cloudLoadData(userId: string): Promise<AppData | null> {
  const c = await getClient();
  if (!c) return null;
  try {
    const { data } = await c
      .from(TABLE)
      .select("payload")
      .eq("user_id", userId)
      .maybeSingle();
    return (data?.payload as AppData) ?? null;
  } catch {
    return null;
  }
}

/** Сохранить данные пользователя в облако (fire-and-forget). */
export async function cloudSaveData(userId: string, data: AppData): Promise<void> {
  const c = await getClient();
  if (!c) return;
  try {
    await c
      .from(TABLE)
      .upsert(
        { user_id: userId, payload: data, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
  } catch {
    /* офлайн или RLS — молча пропускаем, локальные данные остаются */
  }
}
