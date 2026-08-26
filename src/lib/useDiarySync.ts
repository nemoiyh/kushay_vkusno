import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { AppData } from "../types";
import type { User } from "./auth";
import { STORAGE_KEY, defaultStatsVisibility, emptyState } from "./store";

/**
 * Синхронизация дневника с Firestore.
 *
 * Схема: коллекция `users`, документ = uid пользователя, поле `data` — всё
 * состояние дневника (вес, замеры, калории/БЖУ, шаги, сон, вода) в структуре
 * приложения.
 *
 *  - при входе: getDoc (начальная загрузка) + onSnapshot (живая синхронизация);
 *  - запись: setDoc(merge) с дебаунсом 1.5 с после изменений;
 *  - миграция: при первом входе, если в Firestore данных нет, а в localStorage
 *    есть (старые ключи) — заливаем их один раз.
 */

const SAVE_DEBOUNCE_MS = 1500;

/** Доводит прочитанный объект до полной структуры AppData (старые версии). */
function normalize(parsed: Partial<AppData>): AppData {
  return {
    days: parsed.days ?? {},
    goals: parsed.goals ?? emptyState().goals,
    profile: parsed.profile ?? emptyState().profile,
    weights: parsed.weights ?? [],
    customFoods: parsed.customFoods ?? [],
    measures: parsed.measures ?? emptyState().measures,
    steps: parsed.steps ?? [],
    activity: parsed.activity ?? [],
    sleep: parsed.sleep ?? [],
    statsVisibility: { ...defaultStatsVisibility(), ...(parsed.statsVisibility ?? {}) },
    favoriteIds: parsed.favoriteIds ?? [],
    recipes: parsed.recipes ?? [],
    usage: parsed.usage ?? {},
  };
}

/**
 * Миграция: ищем локальные данные по старым ключам — `kv_data_<ник>`
 * (предыдущая localStorage-версия) и `kushai:diary` (ещё более ранняя).
 */
function readLocalMigration(nick: string): AppData | null {
  for (const key of [`kv_data_${nick}`, STORAGE_KEY]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Partial<AppData>;
      if (parsed && parsed.goals && parsed.profile) return normalize(parsed);
    } catch {
      /* повреждено — пробуем следующий ключ */
    }
  }
  return null;
}

export function useDiarySync(user: User | null): [AppData, Dispatch<SetStateAction<AppData>>] {
  const [data, setData] = useState<AppData>(emptyState);
  const hydrated = useRef(false);
  const lastWritten = useRef("");
  const saveTimer = useRef<number | null>(null);
  const uid = user?.uid ?? null;
  const nick = user?.nick ?? "";

  /* ------- загрузка + живая подписка + миграция ------- */
  useEffect(() => {
    if (!uid) {
      // не вошли — данные не показываем, синхронизации нет
      hydrated.current = false;
      lastWritten.current = "";
      setData(emptyState());
      return;
    }

    let cancelled = false;
    const ref = doc(db, "users", uid);
    hydrated.current = false;

    // начальная загрузка + миграция локальных данных при первом входе
    getDoc(ref)
      .then(async (snap) => {
        if (cancelled) return;
        const remote = snap.exists()
          ? ((snap.data().data as AppData | undefined) ?? undefined)
          : undefined;

        if (remote) return; // данные уже в облаке — их подхватит onSnapshot

        // в Firestore пусто — пробуем перенести локальные данные
        const local = readLocalMigration(nick);
        if (local) {
          const str = JSON.stringify(local);
          lastWritten.current = str;
          hydrated.current = true;
          setData(local);
          try {
            await setDoc(ref, { data: local }, { merge: true });
          } catch {
            /* офлайн — данные останутся локально до следующей записи */
          }
        } else {
          // ни облака, ни локальных данных — чистый дневник
          lastWritten.current = "";
          hydrated.current = true;
          setData(emptyState());
        }
      })
      .catch(() => {
        /* сеть недоступна — ждём onSnapshot / следующую попытку */
      });

    // живая синхронизация: любые изменения документа (в т.ч. с других устройств)
    const unsub = onSnapshot(ref, (snap) => {
      if (cancelled) return;
      const remote = snap.exists()
        ? ((snap.data().data as AppData | undefined) ?? undefined)
        : undefined;
      if (remote) {
        const str = JSON.stringify(remote);
        if (str !== lastWritten.current) setData(remote);
        lastWritten.current = str;
        hydrated.current = true;
      }
    });

    return () => {
      cancelled = true;
      unsub();
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [uid, nick]);

  /* ------- дебаунс-запись в Firestore ------- */
  useEffect(() => {
    if (!uid || !hydrated.current) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const str = JSON.stringify(data);
      if (str === lastWritten.current) return; // ничего не изменилось
      lastWritten.current = str;
      setDoc(doc(db, "users", uid), { data }, { merge: true }).catch(() => {
        /* офлайн — Firestore допишет при появлении сети */
      });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [data, uid]);

  return [data, setData];
}
