import { useMemo, useState, type ReactNode } from "react";
import type {
  ActivityEntry,
  AppData,
  MeasureEntry,
  MeasureKey,
  SleepEntry,
} from "../types";
import {
  MEASURE_KEYS,
  WD,
  dayTotals,
  fmt,
  ru1,
  shiftKey,
  streakDays,
  todayKey,
} from "../lib/store";
import { MacroBar } from "./ui";
import {
  IActivity,
  IApple,
  IClock,
  IDrop,
  IFlame,
  IFoot,
  IMoon,
  IPlus,
  IRuler,
  IScale,
  ITrendDown,
  ITrendUp,
} from "./Icons";

type Period = 7 | 14 | 30;
const PERIODS: Period[] = [7, 14, 30];

const QUALITY: Record<NonNullable<SleepEntry["quality"]>, { label: string; color: string }> = {
  good: { label: "Хорошо", color: "var(--color-leaf)" },
  ok: { label: "Нормально", color: "var(--color-amber)" },
  bad: { label: "Плохо", color: "var(--color-carrot)" },
};

const num = (s: string) => parseFloat(s.replace(",", "."));

export function StatsView({
  data,
  onSteps,
  onSleep,
  onActivity,
  onMeasures,
}: {
  data: AppData;
  onSteps: (value: number) => void;
  onSleep: (hours: number, quality?: SleepEntry["quality"]) => void;
  onActivity: (minutes: number, kcal: number) => void;
  onMeasures: (vals: Partial<Record<MeasureKey, number>>) => void;
}) {
  const today = todayKey();
  const [period, setPeriod] = useState<Period>(7);

  const keys = useMemo(
    () => Array.from({ length: period }, (_, i) => shiftKey(today, i - (period - 1))),
    [period, today],
  );

  const dayVals = useMemo(() => keys.map((k) => dayTotals(data.days[k])), [keys, data.days]);
  const logged = dayVals.filter((v) => v.count > 0);
  const avg = (get: (v: ReturnType<typeof dayTotals>) => number) =>
    logged.length ? get(logged.reduce((a, v) => ({ ...a, kcal: a.kcal + v.kcal, p: a.p + v.p, f: a.f + v.f, c: a.c + v.c, count: a.count }), { kcal: 0, p: 0, f: 0, c: 0, count: 0 })) / logged.length : 0;

  const avgKcal = Math.round(avg((v) => v.kcal));
  const avgP = Math.round(avg((v) => v.p));
  const avgF = Math.round(avg((v) => v.f));
  const avgC = Math.round(avg((v) => v.c));
  const onGoal = logged.filter((v) => v.kcal <= data.goals.kcal).length;
  const streak = streakDays(data.days, data.goals.kcal);

  const waterVals = useMemo(() => keys.map((k) => (data.days[k]?.water ?? 0) * 250), [keys, data.days]);
  const stepsVals = useMemo(() => keys.map((k) => data.steps.find((s) => s.date === k)?.value ?? 0), [keys, data.steps]);
  const sleepVals = useMemo(() => keys.map((k) => data.sleep.find((s) => s.date === k)?.hours ?? 0), [keys, data.sleep]);
  const actVals = useMemo(() => keys.map((k) => data.activity.find((a) => a.date === k)), [keys, data.activity]);

  const avgOf = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);

  const weights = useMemo(
    () => [...data.weights].sort((a, b) => a.date.localeCompare(b.date)),
    [data.weights],
  );
  const wDelta = weights.length >= 2 ? weights[weights.length - 1].value - weights[0].value : null;

  const todaySleep = data.sleep.find((s) => s.date === today);
  const todayAct = data.activity.find((a) => a.date === today);
  const todaySteps = data.steps.find((s) => s.date === today);

  return (
    <div className="anim-in">
      {/* заголовок + период */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold sm:text-2xl">Статистика</h1>
          <p className="mt-1 text-sm text-soft">Тело, питание, активность и сон</p>
        </div>
        <div className="flex rounded-xl border border-line bg-card p-1 hard-sm">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                period === p ? "bg-ink text-paperink" : "text-soft hover:text-ink"
              }`}
            >
              {p} дней
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-12">
        {/* ВЕС */}
        <Card
          className="lg:col-span-8"
          icon={<IScale width={16} height={16} />}
          tint="bg-leafwash text-leafdeep"
          title="Вес"
          right={
            weights.length ? (
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-extrabold tabular-nums">
                  {ru1(weights[weights.length - 1].value)} кг
                </span>
                {wDelta !== null && (
                  <span
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                      wDelta <= 0 ? "bg-leafwash text-leafdeep" : "bg-carrotwash text-carrot"
                    }`}
                  >
                    {wDelta <= 0 ? <ITrendDown width={12} height={12} /> : <ITrendUp width={12} height={12} />}
                    {wDelta > 0 ? "+" : ""}{ru1(wDelta)} кг
                  </span>
                )}
              </div>
            ) : null
          }
        >
          {weights.length >= 2 ? (
            <>
              <WeightSpark values={weights.map((w) => w.value)} />
              <p className="mt-1.5 text-[11px] text-faint tabular-nums">
                {weights.length} замеров · динамика за всё время
              </p>
            </>
          ) : (
            <p className="mt-3 rounded-xl bg-paper px-3 py-3 text-xs text-faint">
              Замеров пока нет. Добавьте вес в «Настройках» — здесь появится график.
            </p>
          )}
        </Card>

        {/* ЗАМЕРЫ ТЕЛА */}
        <MeasuresCard
          measures={data.measures}
          onSave={onMeasures}
        />

        {/* КАЛОРИИ */}
        <Card
          className="lg:col-span-8"
          icon={<IFlame width={16} height={16} />}
          tint="bg-carrotwash text-carrot"
          title="Калории по дням"
          right={
            <div className="text-right">
              <span className="text-[11px] text-faint">среднее </span>
              <span className="font-display text-lg font-extrabold text-carrot tabular-nums">{fmt(avgKcal)}</span>
              <span className="ml-2 rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold text-faint">
                в цели {onGoal} из {logged.length} · серия {streak}
              </span>
            </div>
          }
        >
          <CaloriesChart keys={keys} vals={dayVals} goal={data.goals.kcal} showWeekdays={period === 7} />
          {logged.length === 0 && (
            <p className="mt-2 rounded-xl bg-paper px-3 py-2.5 text-center text-xs text-faint">
              За период нет записей в дневнике.
            </p>
          )}
        </Card>

        {/* БЖУ */}
        <Card
          className="lg:col-span-4"
          icon={<IApple width={16} height={16} />}
          tint="bg-tealwash text-teal"
          title="БЖУ · среднее в день"
          right={<span className="text-[11px] text-faint">за {period} дней</span>}
        >
          <div className="mt-4 space-y-3">
            <MacroBar label={`Белки · ${avgP} г`} value={avgP} goal={data.goals.p} color="var(--color-leaf)" wash="var(--color-leafwash)" />
            <MacroBar label={`Жиры · ${avgF} г`} value={avgF} goal={data.goals.f} color="var(--color-amber)" wash="var(--color-amberwash)" />
            <MacroBar label={`Углеводы · ${avgC} г`} value={avgC} goal={data.goals.c} color="var(--color-teal)" wash="var(--color-tealwash)" />
          </div>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full">
            {(() => {
              const tot = avgP * 4 + avgF * 9 + avgC * 4 || 1;
              return (
                <>
                  <div style={{ width: `${(avgP * 4 / tot) * 100}%`, background: "var(--color-leaf)" }} title="Белки" />
                  <div style={{ width: `${(avgF * 9 / tot) * 100}%`, background: "var(--color-amber)" }} title="Жиры" />
                  <div style={{ width: `${(avgC * 4 / tot) * 100}%`, background: "var(--color-teal)" }} title="Углеводы" />
                </>
              );
            })()}
          </div>
          <p className="mt-1.5 text-[11px] text-faint">соотношение калорий из белков, жиров и углеводов</p>
        </Card>

        {/* АКТИВНОСТЬ */}
        <ActivityCard
          className="lg:col-span-3 md:col-span-1"
          vals={actVals}
          today={todayAct}
          onSave={onActivity}
        />

        {/* ШАГИ */}
        <StepsCard
          className="lg:col-span-3 md:col-span-1"
          vals={stepsVals}
          avg={Math.round(avgOf(stepsVals))}
          today={todaySteps?.value}
          onSave={onSteps}
        />

        {/* СОН */}
        <SleepCard
          className="lg:col-span-3 md:col-span-1"
          vals={sleepVals}
          avg={avgOf(sleepVals)}
          today={todaySleep}
          onSave={onSleep}
        />

        {/* ВОДА */}
        <Card
          className="lg:col-span-3 md:col-span-1"
          icon={<IDrop width={16} height={16} />}
          tint="bg-waterwash text-water"
          title="Вода"
          right={
            <div className="text-right">
              <span className="text-[11px] text-faint">среднее </span>
              <span className="font-display text-lg font-extrabold text-water tabular-nums">{fmt(Math.round(avgOf(waterVals)))}</span>
              <span className="text-[11px] text-faint"> мл</span>
            </div>
          }
        >
          <Bars values={waterVals} color="var(--color-water)" refLine={2000} unit=" мл" />
          <p className="mt-1.5 text-[11px] text-faint">пунктир — 2000 мл · отметки в дневнике</p>
        </Card>
      </div>
    </div>
  );
}

/* ---------- каркас карточки ---------- */

function Card({
  className,
  icon,
  tint,
  title,
  right,
  children,
}: {
  className?: string;
  icon: ReactNode;
  tint: string;
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`card p-5 ${className ?? ""}`}>
      <div className="flex items-center gap-2.5">
        <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${tint}`}>{icon}</span>
        <h2 className="font-display text-[13px] font-bold">{title}</h2>
        <div className="ml-auto min-w-0 text-right">{right}</div>
      </div>
      {children}
    </section>
  );
}

/* ---------- мини-столбики ---------- */

function Bars({
  values,
  color,
  refLine,
  unit,
  height = 88,
}: {
  values: number[];
  color: string;
  refLine?: number;
  unit?: string;
  height?: number;
}) {
  const max = Math.max(...values, refLine ?? 0, 1) * 1.12;
  return (
    <div className="relative mt-3" style={{ height }}>
      {refLine !== undefined && (
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line"
          style={{ bottom: `${(refLine / max) * 100}%` }}
        />
      )}
      <div className="relative flex h-full items-end gap-[3px]">
        {values.map((v, i) => (
          <div key={i} className="group relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t-[3px] transition-all duration-200 group-hover:opacity-75"
              style={{
                height: `${Math.max(v > 0 ? 5 : 2.5, (v / max) * 100)}%`,
                background: v > 0 ? color : "var(--color-linesoft)",
              }}
            />
            <span className="pointer-events-none absolute -top-6 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-paperink group-hover:block">
              {fmt(Math.round(v))}{unit ?? ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- график калорий ---------- */

function CaloriesChart({
  keys,
  vals,
  goal,
  showWeekdays,
}: {
  keys: string[];
  vals: ReturnType<typeof dayTotals>[];
  goal: number;
  showWeekdays: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(goal * 1.25, ...vals.map((v) => v.kcal), 1);
  const goalPct = (goal / max) * 100;
  const today = todayKey();

  return (
    <div className="relative mt-5 h-48">
      <div
        className="pointer-events-none absolute inset-x-0 z-0 border-t-2 border-dashed border-carrot/60"
        style={{ bottom: `${goalPct}%` }}
      >
        <span className="absolute right-0 -top-5 rounded-md bg-carrotwash px-1.5 py-0.5 text-[10px] font-bold text-carrot">
          цель {fmt(goal)}
        </span>
      </div>
      <div className="relative z-10 flex h-full items-end gap-[3px] sm:gap-1.5">
        {vals.map((v, i) => {
          const h = Math.max(v.kcal > 0 ? 4 : 2, (v.kcal / max) * 100);
          const over = v.kcal > goal;
          const empty = v.count === 0;
          return (
            <div
              key={keys[i]}
              className="flex h-full flex-1 cursor-pointer flex-col items-center justify-end gap-1"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div
                className="bar-grow w-full rounded-t-md"
                style={{
                  height: `${h}%`,
                  animationDelay: `${i * 24}ms`,
                  background: empty ? "var(--color-linesoft)" : over ? "var(--color-carrot)" : "var(--color-leaf)",
                  opacity: hover === null || hover === i ? 1 : 0.5,
                }}
              />
              {showWeekdays && (
                <span className={`text-[10px] font-semibold ${keys[i] === today ? "text-carrot" : "text-faint"}`}>
                  {WD[new Date(keys[i] + "T12:00:00").getDay()]}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {hover !== null && vals[hover].count > 0 && (
        <div className="pointer-events-none absolute -top-2 left-1/2 z-20 -translate-x-1/2 rounded-lg bg-ink px-3 py-1.5 text-center text-[11px] font-semibold text-paperink hard-sm">
          {fmt(vals[hover].kcal)} ккал
          <span className="block font-normal opacity-75">
            Б {Math.round(vals[hover].p)} · Ж {Math.round(vals[hover].f)} · У {Math.round(vals[hover].c)}
          </span>
        </div>
      )}
    </div>
  );
}

/* ---------- спарклайн веса ---------- */

function WeightSpark({ values }: { values: number[] }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const y = (v: number) => 34 - ((v - min) / span) * 28;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${y(v)}`).join(" ");
  const area = `0,40 ${pts} 100,40`;
  return (
    <svg viewBox="0 0 100 40" className="mt-4 h-24 w-full" preserveAspectRatio="none" aria-hidden>
      <polygon points={area} fill="rgba(15,125,138,0.12)" />
      <polyline points={pts} fill="none" stroke="var(--color-leaf)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle
          key={i}
          cx={(i / (values.length - 1)) * 100}
          cy={y(v)}
          r="2.4"
          fill="var(--color-card)"
          stroke="var(--color-leaf)"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}

/* ---------- замеры тела ---------- */

function MeasuresCard({
  measures,
  onSave,
}: {
  measures: Record<MeasureKey, MeasureEntry[]>;
  onSave: (vals: Partial<Record<MeasureKey, number>>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");

  const save = () => {
    const out: Partial<Record<MeasureKey, number>> = {};
    for (const { id } of MEASURE_KEYS) {
      const raw = (vals[id] ?? "").trim();
      if (!raw) continue;
      const n = num(raw);
      if (!Number.isFinite(n) || n < 20 || n > 250) {
        setErr("Значения — от 20 до 250 см");
        return;
      }
      out[id] = Math.round(n * 10) / 10;
    }
    if (Object.keys(out).length === 0) {
      setErr("Заполните хотя бы одно поле");
      return;
    }
    setErr("");
    setVals({});
    setOpen(false);
    onSave(out);
  };

  const rows = MEASURE_KEYS.map(({ id, label }) => {
    const list = [...(measures[id] ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    const last = list[list.length - 1];
    const prev = list[list.length - 2];
    const delta = last && prev ? Math.round((last.value - prev.value) * 10) / 10 : null;
    return { id, label, last, delta };
  });
  const hasAny = rows.some((r) => r.last);

  return (
    <Card
      className="lg:col-span-4"
      icon={<IRuler width={16} height={16} />}
      tint="bg-amberwash text-amber"
      title="Замеры тела"
      right={
        <button
          onClick={() => setOpen((o) => !o)}
          className="btn-press flex items-center gap-1 rounded-lg border border-leaf/40 bg-leafwash px-2.5 py-1 text-[11px] font-bold text-leafdeep"
        >
          <IPlus width={12} height={12} /> замер
        </button>
      }
    >
      {open && (
        <div className="anim-in mt-3 rounded-xl border border-line bg-field/70 p-3">
          <div className="grid grid-cols-2 gap-2">
            {MEASURE_KEYS.map(({ id, label }) => (
              <label key={id} className="block">
                <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-faint">{label}</span>
                <input
                  className="field h-9 py-0 text-sm tabular-nums"
                  inputMode="decimal"
                  placeholder="см"
                  value={vals[id] ?? ""}
                  onChange={(e) => setVals((v) => ({ ...v, [id]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          {err && <p className="mt-1.5 text-[11px] font-medium text-danger">{err}</p>}
          <button
            onClick={save}
            className="btn-press mt-2.5 w-full rounded-xl bg-leaf py-2 text-sm font-bold text-paperink"
          >
            Сохранить замер за сегодня
          </button>
        </div>
      )}

      {!hasAny && !open ? (
        <p className="mt-3 rounded-xl bg-paper px-3 py-3 text-xs text-faint">
          Замеров пока нет. Добавьте первый — покажем динамику по каждому параметру.
        </p>
      ) : (
        <ul className="mt-3 space-y-1">
          {rows.map(({ id, label, last, delta }) => (
            <li
              key={id}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-field"
            >
              <span className="text-soft">{label}</span>
              <span className="flex items-center gap-2 tabular-nums">
                {last ? (
                  <>
                    {delta !== null && delta !== 0 && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          delta < 0 ? "bg-leafwash text-leafdeep" : "bg-carrotwash text-carrot"
                        }`}
                      >
                        {delta > 0 ? "+" : ""}{ru1(delta)}
                      </span>
                    )}
                    <b>{ru1(last.value)} см</b>
                  </>
                ) : (
                  <span className="text-[11px] text-faint">—</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ---------- активность ---------- */

function ActivityCard({
  className,
  vals,
  today,
  onSave,
}: {
  className?: string;
  vals: (ActivityEntry | undefined)[];
  today?: ActivityEntry;
  onSave: (minutes: number, kcal: number) => void;
}) {
  const [min, setMin] = useState(today ? String(today.minutes) : "");
  const [kcal, setKcal] = useState(today ? String(today.kcal) : "");
  const [err, setErr] = useState("");

  const minutes = vals.reduce((s, v) => s + (v?.minutes ?? 0), 0);
  const kcalSum = vals.reduce((s, v) => s + (v?.kcal ?? 0), 0);
  const count = vals.filter(Boolean).length;

  const save = () => {
    const m = Math.round(num(min));
    const k = Math.round(num(kcal));
    if (!Number.isFinite(m) || m < 1 || m > 900 || !Number.isFinite(k) || k < 1 || k > 6000) {
      setErr("Минуты 1–900, ккал 1–6000");
      return;
    }
    setErr("");
    onSave(m, k);
  };

  return (
    <Card
      className={className}
      icon={<IActivity width={16} height={16} />}
      tint="bg-carrotwash text-carrot"
      title="Активность"
      right={<span className="text-[11px] text-faint">{count} трен.</span>}
    >
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-paper px-3 py-2.5">
          <div className="flex items-center gap-1.5 font-display text-lg font-extrabold tabular-nums">
            <IClock width={14} height={14} className="text-faint" />
            {fmt(minutes)}
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-faint">минут</div>
        </div>
        <div className="rounded-xl bg-paper px-3 py-2.5">
          <div className="flex items-center gap-1.5 font-display text-lg font-extrabold tabular-nums">
            <IFlame width={14} height={14} className="text-carrot" />
            {fmt(kcalSum)}
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-faint">акт. ккал</div>
        </div>
      </div>
      <Bars values={vals.map((v) => v?.kcal ?? 0)} color="var(--color-carrot)" unit=" ккал" height={56} />
      <div className="mt-2.5 flex gap-1.5">
        <input className="field h-9 w-0 flex-1 py-0 text-sm tabular-nums" placeholder="мин" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} />
        <input className="field h-9 w-0 flex-1 py-0 text-sm tabular-nums" placeholder="ккал" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} />
        <button onClick={save} className="btn-press shrink-0 rounded-xl bg-ink px-3 text-xs font-bold text-paperink">
          ОК
        </button>
      </div>
      {err && <p className="mt-1 text-[11px] font-medium text-danger">{err}</p>}
      <p className="mt-1.5 text-[11px] text-faint">тренировка за сегодня</p>
    </Card>
  );
}

/* ---------- шаги ---------- */

function StepsCard({
  className,
  vals,
  avg,
  today,
  onSave,
}: {
  className?: string;
  vals: number[];
  avg: number;
  today?: number;
  onSave: (v: number) => void;
}) {
  const [input, setInput] = useState(today ? String(today) : "");
  const [err, setErr] = useState("");
  const best = Math.max(...vals, 0);

  const save = () => {
    const n = Math.round(num(input));
    if (!Number.isFinite(n) || n < 0 || n > 200000) {
      setErr("Шаги — от 0 до 200 000");
      return;
    }
    setErr("");
    onSave(n);
  };

  return (
    <Card
      className={className}
      icon={<IFoot width={16} height={16} />}
      tint="bg-leafwash text-leafdeep"
      title="Шаги"
      right={
        <div className="text-right">
          <span className="text-[11px] text-faint">среднее </span>
          <span className="font-display text-lg font-extrabold tabular-nums">{fmt(avg)}</span>
        </div>
      }
    >
      <Bars values={vals} color="var(--color-leaf)" refLine={10000} height={88} />
      <p className="mt-1.5 text-[11px] text-faint">пунктир — 10 000 · рекорд {fmt(best)}</p>
      <div className="mt-2.5 flex gap-1.5">
        <input
          className="field h-9 flex-1 py-0 text-sm tabular-nums"
          placeholder="шагов сегодня"
          inputMode="numeric"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <button onClick={save} className="btn-press shrink-0 rounded-xl bg-ink px-3 text-xs font-bold text-paperink">
          ОК
        </button>
      </div>
      {err && <p className="mt-1 text-[11px] font-medium text-danger">{err}</p>}
    </Card>
  );
}

/* ---------- сон ---------- */

function SleepCard({
  className,
  vals,
  avg,
  today,
  onSave,
}: {
  className?: string;
  vals: number[];
  avg: number;
  today?: SleepEntry;
  onSave: (hours: number, quality?: SleepEntry["quality"]) => void;
}) {
  const [hours, setHours] = useState(today ? String(today.hours) : "");
  const [quality, setQuality] = useState<SleepEntry["quality"]>(today?.quality ?? "ok");
  const [err, setErr] = useState("");

  const latest = today;

  const save = () => {
    const h = num(hours);
    if (!Number.isFinite(h) || h <= 0 || h > 24) {
      setErr("Часы — от 0 до 24");
      return;
    }
    setErr("");
    onSave(Math.round(h * 10) / 10, quality);
  };

  return (
    <Card
      className={className}
      icon={<IMoon width={16} height={16} />}
      tint="bg-tealwash text-teal"
      title="Сон"
      right={
        <div className="text-right">
          <span className="text-[11px] text-faint">среднее </span>
          <span className="font-display text-lg font-extrabold tabular-nums">{ru1(avg)}</span>
          <span className="text-[11px] text-faint"> ч</span>
        </div>
      }
    >
      <Bars values={vals} color="var(--color-teal)" refLine={8} unit=" ч" height={88} />
      <p className="mt-1.5 flex items-center justify-between text-[11px] text-faint">
        <span>пунктир — 8 ч</span>
        {latest?.quality && (
          <span className="flex items-center gap-1 font-semibold" style={{ color: QUALITY[latest.quality].color }}>
            <span className="size-1.5 rounded-full" style={{ background: QUALITY[latest.quality].color }} />
            прошлая ночь: {QUALITY[latest.quality].label.toLowerCase()}
          </span>
        )}
      </p>
      <div className="mt-2.5 flex gap-1.5">
        <input
          className="field h-9 w-20 py-0 text-sm tabular-nums"
          placeholder="часов"
          inputMode="decimal"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
        />
        <div className="flex flex-1 rounded-xl border border-line bg-field p-0.5">
          {(["bad", "ok", "good"] as const).map((q) => (
            <button
              key={q}
              onClick={() => setQuality(q)}
              className={`flex-1 rounded-lg text-[10px] font-bold transition-colors ${
                quality === q ? "bg-ink text-paperink" : "text-faint hover:text-soft"
              }`}
            >
              {QUALITY[q].label}
            </button>
          ))}
        </div>
        <button onClick={save} className="btn-press shrink-0 rounded-xl bg-ink px-3 text-xs font-bold text-paperink">
          ОК
        </button>
      </div>
      {err && <p className="mt-1 text-[11px] font-medium text-danger">{err}</p>}
    </Card>
  );
}
