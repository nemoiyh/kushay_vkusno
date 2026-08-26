import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import type {
  AppData, Entry, Food, Goals, Meal, MeasureKey, Profile, Recipe, RecipeIngredient,
  SleepEntry, StatsBlockKey, ToastItem, ToastKind, View,
} from "./types";
import {
  STORAGE_KEY, createFreshState, defaultMealByHour, entryFromFood, fmt, loadState, mealLabel,
  recipeTotals, resetModifiedFlag, round1, ru1, saveState, shiftKey, streakDays, todayKey, uid, upsertByDate,
} from "./lib/store";
import {
  PROVIDER_LABEL, loadAccountData, restoreSession, saveAccountData, signOut, type SessionUser,
} from "./lib/auth";
import {
  clearVkSession, consumeVkOAuthCallback, consumeVkOAuthError, getVkProfile, hasVkSession,
  saveVkSession, takeVkCallbackError,
} from "./lib/vkid";
import { cloudLoadData, cloudSaveData } from "./lib/supabase";
import { ErrorBoundary, ToastStack } from "./components/ui";
import { IApple, IBook, IChart, IFlame, ISettings, LogoMark } from "./components/Icons";
import { DiaryView } from "./components/DiaryView";
import { DatabaseView } from "./components/DatabaseView";
import { StatsView } from "./components/StatsView";
import { SettingsView } from "./components/SettingsView";
import { AuthScreen } from "./components/AuthScreen";
import { AddEntryModal, type EntryDraftInput } from "./components/AddEntryModal";

const NAV: { id: View; label: string; icon: typeof IBook }[] = [
  { id: "diary", label: "Дневник", icon: IBook },
  { id: "foods", label: "Продукты", icon: IApple },
  { id: "stats", label: "Статистика", icon: IChart },
  { id: "settings", label: "Настройки", icon: ISettings },
];

export default function App() {
  const [data, setData] = useState<AppData>(loadState);
  const [view, setView] = useState<View>("diary");
  const [dayKey, setDayKey] = useState(todayKey());
  const [draft, setDraft] = useState<(EntryDraftInput & { dateKey: string; ts: number }) | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  /* ------- аккаунт: сессия, «облако», выход ------- */
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [vkBootError, setVkBootError] = useState<string | null>(null);

  // при старте: обрабатываем возврат из VK OAuth, затем проверяем сессию
  useEffect(() => {
    let cancelled = false;
    // если ВК вернул ошибку (Redirect URI не совпал, вход отменён и т.п.) —
    // показываем понятное сообщение вместо белого экрана
    setVkBootError(consumeVkOAuthError());
    (async () => {
      // 0) возврат из VK (в URL есть code) — обмениваем и входим
      const vkData = await consumeVkOAuthCallback();
      if (cancelled) return;
      // если обмен code→токены не удался — показываем сообщение на экране входа
      const cbErr = takeVkCallbackError();
      if (cbErr) setVkBootError(cbErr);
      let u: SessionUser | null = null;
      if (vkData) {
        const p = saveVkSession(vkData);
        u = { id: `vk-${p.user_id}`, email: p.email ?? `id${p.user_id}@vk.ru`, name: p.name, provider: "vk" };
      }
      // 1) активная сессия VK ID
      if (!u && hasVkSession()) {
        const p = getVkProfile();
        if (p) u = { id: `vk-${p.user_id}`, email: p.email ?? `id${p.user_id}@vk.ru`, name: p.name, provider: "vk" };
      }
      // 2) сессия email/пароль
      if (!u) u = restoreSession();

      if (u) {
        const acc = loadAccountData(u.id);
        if (acc) setData(acc.data);
        resetModifiedFlag();
        cloudLoadData(u.id).then((cloud) => {
          if (!cancelled && cloud) setData(cloud);
        });
      }
      setUser(u);
      setBooting(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // автосохранение: локально + в «облако» аккаунта + Supabase (если настроен)
  useEffect(() => {
    saveState(data);
    if (user) {
      saveAccountData(user.id, data);
      cloudSaveData(user.id, data);
    }
  }, [data, user]);

  /** единая функция входа: ВК и email/пароль попадают сюда */
  const handleLoginSuccess = useCallback((u: SessionUser, merged?: AppData) => {
    setUser(u);
    resetModifiedFlag();
    if (merged) setData(merged);
    else {
      const acc = loadAccountData(u.id);
      if (acc) setData(acc.data);
      else setData(createFreshState());
    }
    cloudLoadData(u.id).then((cloud) => {
      if (cloud && !merged) setData(cloud);
    });
  }, []);

  const handleLogout = useCallback(() => {
    if (user) saveAccountData(user.id, data);
    signOut();
    clearVkSession();
    setUser(null);
    setData(createFreshState());
    resetModifiedFlag();
    setView("diary");
  }, [user, data]);

  const toast = useCallback((text: string, kind: ToastKind = "success") => {
    const id = uid();
    setToasts((t) => [...t.slice(-2), { id, text, kind }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  /* ------- PWA ------- */
  const [pwaEvent, setPwaEvent] = useState<Event | null>(null);
  const [installed, setInstalled] = useState(
    () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true,
  );
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setPwaEvent(e); };
    window.addEventListener("beforeinstallprompt", h);
    const inst = () => setInstalled(true);
    window.addEventListener("appinstalled", inst);
    return () => {
      window.removeEventListener("beforeinstallprompt", h);
      window.removeEventListener("appinstalled", inst);
    };
  }, []);
  const promptInstall = () => {
    (pwaEvent as unknown as { prompt?: () => void })?.prompt?.();
    setPwaEvent(null);
  };

  /* ------- дневник ------- */
  const upsertDay = (key: string, fn: (d: { entries: Entry[]; water: number }) => { entries: Entry[]; water: number }) => {
    setData((prev) => {
      const day = prev.days[key] ?? { entries: [], water: 0 };
      return { ...prev, days: { ...prev.days, [key]: fn(day) } };
    });
  };

  const saveEntry = (key: string, entry: Entry, replaceId?: string) => {
    upsertDay(key, (d) => ({
      ...d,
      entries: replaceId ? d.entries.map((e) => (e.id === replaceId ? entry : e)) : [...d.entries, entry],
    }));
  };

  const openAdd = (meal: Meal) => setDraft({ dateKey: dayKey, meal, ts: Date.now() });

  const handleSave = (entry: Entry) => {
    if (!draft) return;
    const editing = draft.entry;
    saveEntry(draft.dateKey, entry, editing?.id);
    setDraft(null);
    const fid = entry.foodId;
    if (!editing && fid) {
      setData((p) => ({
        ...p,
        usage: {
          ...p.usage,
          [fid]: { count: (p.usage[fid]?.count ?? 0) + 1, lastUsed: Date.now(), grams: Math.round(entry.grams) },
        },
      }));
    }
    toast(editing ? `Обновлено: ${entry.name} · ${fmt(entry.kcal)} ккал` : `${mealLabel(entry.meal)}: ${entry.name} · ${fmt(entry.kcal)} ккал`);
  };

  const handleDelete = (entry: Entry) => {
    upsertDay(dayKey, (d) => ({ ...d, entries: d.entries.filter((e) => e.id !== entry.id) }));
    toast(`Удалено: ${entry.name}`, "info");
  };

  const saveCustomFood = useCallback((f: Omit<Food, "id">): Food => {
    const food: Food = { ...f, id: uid(), createdAt: Date.now() };
    setData((prev) => {
      const rest = prev.customFoods.filter((x) => !(f.barcode && x.barcode === f.barcode));
      return { ...prev, customFoods: [food, ...rest] };
    });
    return food;
  }, []);

  const deleteCustomFood = useCallback((id: string) => {
    setData((p) => ({ ...p, customFoods: p.customFoods.filter((f) => f.id !== id), favoriteIds: p.favoriteIds.filter((x) => x !== id) }));
    toast("Продукт удалён", "info");
  }, [toast]);

  const addOffFood = useCallback((food: Food): Food => {
    const withTs: Food = food.createdAt ? food : { ...food, createdAt: Date.now() };
    setData((prev) => {
      const rest = prev.customFoods.filter((x) => !(food.barcode && x.barcode === food.barcode));
      return { ...prev, customFoods: [withTs, ...rest] };
    });
    return withTs;
  }, []);

  const toggleFavorite = useCallback((id: string, name: string) => {
    const has = data.favoriteIds.includes(id);
    setData((p) => ({ ...p, favoriteIds: has ? p.favoriteIds.filter((x) => x !== id) : [...p.favoriteIds, id] }));
    toast(has ? `«${name}» убран из избранного` : `«${name}» — в избранном`, has ? "info" : "success");
  }, [data.favoriteIds, toast]);

  const pickFoodToMeal = useCallback((food: Food, meal: Meal, grams: number) => {
    const entry = entryFromFood(food, grams, meal);
    upsertDay(todayKey(), (d) => ({ ...d, entries: [...d.entries, entry] }));
    setData((p) => ({
      ...p,
      usage: { ...p.usage, [food.id]: { count: (p.usage[food.id]?.count ?? 0) + 1, lastUsed: Date.now(), grams } },
    }));
    toast(`${mealLabel(meal)}: ${food.name} · ${fmt(entry.kcal)} ккал`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  const pickRecipeToMeal = useCallback((recipe: Recipe, meal: Meal, grams: number) => {
    const t = recipeTotals(recipe);
    const scale = t.grams > 0 ? grams / t.grams : 1;
    const entry: Entry = {
      id: uid(), foodId: recipe.id, name: recipe.name, grams, meal,
      kcal: Math.round(t.kcal * scale), p: round1(t.p * scale), f: round1(t.f * scale), c: round1(t.c * scale),
      addedAt: Date.now(),
    };
    upsertDay(todayKey(), (d) => ({ ...d, entries: [...d.entries, entry] }));
    toast(`${mealLabel(meal)}: ${recipe.name} · ${fmt(entry.kcal)} ккал`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  const addRecipe = useCallback((r: { name: string; ingredients: RecipeIngredient[] }) => {
    setData((p) => ({ ...p, recipes: [{ ...r, id: uid(), createdAt: Date.now() }, ...p.recipes] }));
    toast(`Блюдо «${r.name}» создано`);
  }, [toast]);

  const deleteRecipe = useCallback((id: string) => {
    setData((p) => ({ ...p, recipes: p.recipes.filter((r) => r.id !== id) }));
    toast("Блюдо удалено", "info");
  }, [toast]);

  /* ------- статистика ------- */
  const addSteps = useCallback((value: number) => {
    setData((p) => ({ ...p, steps: upsertByDate(p.steps, { date: todayKey(), value }) }));
    toast(`Шаги за сегодня: ${fmt(value)}`);
  }, [toast]);

  const addSleep = useCallback((hours: number, quality?: SleepEntry["quality"]) => {
    setData((p) => ({ ...p, sleep: upsertByDate(p.sleep, { date: todayKey(), hours, quality }) }));
    toast(`Сон за сегодня: ${ru1(hours)} ч`);
  }, [toast]);

  const addActivity = useCallback((minutes: number, kcal: number) => {
    setData((p) => ({ ...p, activity: upsertByDate(p.activity, { date: todayKey(), minutes, kcal }) }));
    toast(`Тренировка: ${minutes} мин · ${fmt(kcal)} ккал`);
  }, [toast]);

  const addMeasures = useCallback((vals: Partial<Record<MeasureKey, number>>) => {
    setData((p) => {
      const m = { ...p.measures };
      (Object.entries(vals) as [MeasureKey, number][]).forEach(([k, v]) => {
        m[k] = upsertByDate(m[k] ?? [], { date: todayKey(), value: v });
      });
      return { ...p, measures: m };
    });
    toast("Замеры сохранены");
  }, [toast]);

  const addWeight = useCallback((value: number) => {
    setData((p) => ({ ...p, weights: upsertByDate(p.weights, { date: todayKey(), value }) }));
    toast(`Вес записан: ${ru1(value)} кг`);
  }, [toast]);

  const toggleStatBlock = useCallback((id: StatsBlockKey) => {
    setData((p) => ({ ...p, statsVisibility: { ...p.statsVisibility, [id]: !p.statsVisibility[id] } }));
  }, []);

  const openCustomFood = useCallback(
    () => setDraft({ dateKey: dayKey, meal: defaultMealByHour(), custom: true, ts: Date.now() }),
    [dayKey],
  );

  /* ------- рендер ------- */

  if (booting) return <Splash />;
  if (!user) return <AuthScreen localData={data} onDone={handleLoginSuccess} vkError={vkBootError} />;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="px-safe mx-auto flex w-full max-w-6xl items-center justify-center gap-3 py-2.5">
          <LogoMark size={38} />
          <div className="leading-none">
            <div className="font-display text-[15px] font-extrabold tracking-wide">КУШАЙ ВКУСНО</div>
            <div className="mt-0.5 text-[10px] font-medium tracking-[0.22em] text-soft">НЕ БУДЕТ ГРУСТНО</div>
          </div>
        </div>
      </header>

      <div className="px-safe mx-auto flex w-full max-w-6xl gap-6">
        {/* сайдбар (десктоп) */}
        <aside className="sticky top-16 hidden h-[calc(100dvh-5rem)] w-48 shrink-0 flex-col gap-1.5 py-6 lg:flex">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className={`btn-press flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-colors ${
                view === n.id ? "bg-ink text-paperink" : "text-soft hover:bg-card hover:text-ink"
              }`}
            >
              <n.icon width={18} height={18} />
              {n.label}
            </button>
          ))}
          <div className="mt-auto rounded-xl border border-line bg-card p-3 text-[11px] leading-relaxed text-faint">
            {user.name ?? user.email} · вход через {PROVIDER_LABEL[user.provider]}
          </div>
        </aside>

        <main className="min-w-0 flex-1 py-6 pb-28 lg:pb-12">
          <ErrorBoundary onReset={() => setView("diary")}>
            <div key={view}>
              {view === "diary" && (
                <DiaryView
                  dayKey={dayKey}
                  day={data.days[dayKey]}
                  goals={data.goals}
                  onNav={(d) => setDayKey((k) => {
                    const next = d === 0 ? todayKey() : shiftKey(k, d);
                    return next > todayKey() ? todayKey() : next;
                  })}
                  onAdd={(meal) => openAdd(meal)}
                  onEdit={(entry) => setDraft({ dateKey: dayKey, meal: entry.meal, entry, ts: Date.now() })}
                  onDelete={handleDelete}
                  onWater={(n) => upsertDay(dayKey, (d) => ({ ...d, water: n }))}
                />
              )}
              {view === "foods" && (
                <DatabaseView
                  days={data.days}
                  customFoods={data.customFoods}
                  recipes={data.recipes}
                  favorites={data.favoriteIds}
                  usage={data.usage}
                  onPickToMeal={pickFoodToMeal}
                  onPickRecipe={pickRecipeToMeal}
                  onDeleteCustomFood={deleteCustomFood}
                  onToggleFavorite={toggleFavorite}
                  onSaveOffFood={addOffFood}
                  onAddRecipe={addRecipe}
                  onDeleteRecipe={deleteRecipe}
                  onAddCustomFood={openCustomFood}
                />
              )}
              {view === "stats" && (
                <StatsView
                  data={data}
                  visibility={data.statsVisibility}
                  onSteps={addSteps}
                  onSleep={addSleep}
                  onActivity={addActivity}
                  onMeasures={addMeasures}
                  onWeight={addWeight}
                  onOpenSettings={() => setView("settings")}
                />
              )}
              {view === "settings" && (
                <SettingsView
                  data={data}
                  onUpdateGoals={(g: Goals) => setData((p) => ({ ...p, goals: g }))}
                  onUpdateProfile={(pr: Profile) => setData((p) => ({ ...p, profile: pr }))}
                  pwa={{ canInstall: !!pwaEvent, installed, promptInstall }}
                  onExport={() => {
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = "kushai-vkusno-data.json";
                    a.click();
                    URL.revokeObjectURL(a.href);
                    toast("Данные выгружены в JSON");
                  }}
                  onReset={() => {
                    setData(createFreshState());
                    resetModifiedFlag();
                    toast("Все данные стёрты", "info");
                  }}
                  statsVisibility={data.statsVisibility}
                  onToggleStat={toggleStatBlock}
                  account={{ user, providerLabel: PROVIDER_LABEL[user.provider], onLogout: handleLogout }}
                />
              )}
            </div>
          </ErrorBoundary>
        </main>
      </div>

      {/* нижняя навигация (планшет/мобильный) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/90 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 px-2">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-bold transition-colors ${
                view === n.id ? "text-leaf" : "text-faint hover:text-soft"
              }`}
            >
              <n.icon width={20} height={20} />
              {n.label}
            </button>
          ))}
        </div>
      </nav>

      {draft && (
        <AddEntryModal
          key={draft.ts}
          input={draft}
          onClose={() => setDraft(null)}
          onSave={handleSave}
          customFoods={data.customFoods}
          onSaveCustomFood={saveCustomFood}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-4">
        <LogoMark size={64} />
        <div className="font-display text-lg font-extrabold tracking-wide">КУШАЙ ВКУСНО</div>
        <span className="spinner" style={{ borderTopColor: "var(--color-leaf)" }} />
      </div>
    </div>
  );
}
