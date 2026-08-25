import { useMemo, useState, type ReactNode } from "react";
import type { ActivityEntry, AppData, MeasureEntry, MeasureKey, SleepEntry } from "../types";
import { MEASURE_KEYS, WD, dayTotals, fmt, ru1, shiftKey, streakDays, todayKey } from "../lib/store";
import { MacroBar } from "./ui";
import {
  IActivity, IApple, IChart, IDrop, IFlame, IFoot, IMoon, IPlus, IRuler, IScale, ISettings, ITrendDown, ITrendUp,
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
  visibility,
  onSteps,
  onSleep,
  onActivity,
  onMeasures,
  onWeight,
  onOpenSettings,
}: {
  data: AppData;
  visibility: AppData["statsVisibility"];
  onSteps: (value: number) => void;
  onSleep: (hours: number, quality?: SleepEntry["quality"]) => void;
  onActivity: (minutes: number, kcal: number) => void;
  onMeasures: (vals: Partial<Record<MeasureKey, number>>) => void;
  onWeight: (value: number) => void;
  onOpenSettings: () => void;
}) {
  const today = todayKey();
  const [period, setPeriod] = useState<Period>(7);
  const keys = useMemo(() => Array.from({ length: period }, (_, i) => shiftKey(today, i - (period - 1))), [period, today]);
  const dayVals = useMemo(() => keys.map((k) => dayTotals(data.days[k])), [keys, data.days]);
  const logged = dayVals.filter((v) => v.count > 0);
  const avgKcal = logged.length ? Math.round(logged.reduce((s, v) => s + v.kcal, 0) / logged.length) : 0;
  const avgP = logged.length ? Math.round(logged.reduce((s, v) => s + v.p, 0) / logged.length) : 0;
  const avgF = logged.length ? Math.round(logged.reduce((s, v) => s + v.f, 0) / logged.length) : 0;
  const avgC = logged.length ? Math.round(logged.reduce((s, v) => s + v.c, 0) / logged.length) : 0;
  const onGoal = logged.filter((v) => v.kcal <= data.goals.kcal).length;
  const streak = streakDays(data.days, data.goals.kcal);

  const waterVals = useMemo(() => keys.map((k) => (data.days[k]?.water ?? 0) * 250), [keys, data.days]);
  const stepsVals = useMemo(() => keys.map((k) => data.steps.find((s) => s.date === k)?.value ?? 0), [keys, data.steps]);
  const sleepVals = useMemo(() => keys.map((k) => data.sleep.find((s) => s.date === k)?.hours ?? 0), [keys, data.sleep]);
  const actVals = useMemo(() => keys.map((k) => data.activity.find((a) => a.date === k)), [keys, data.activity]);
  const avgOf = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
  const weights = useMemo(() => [...data.weights].sort((a, b) => a.date.localeCompare(b.date)), [data.weights]);

  const visibleCount = Object.values(visibility).filter(Boolean).length;

  return (
    <div className="anim-in">
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
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${period === p ? "bg-ink text-paperink" : "text-soft hover:text-ink"}`}
            >
              {p} дней
            </button>
          ))}
        </div>
      </div>

      {visibleCount === 0 ? (
        <div className="card mt-6 flex flex-col items-center gap-3 p-10 text-center">
          <IChart width={32} height={32} className="text-faint" />
          <p className="text-sm font-semibold">Все блоки статистики скрыты</p>
          <p className="max-w-xs text-xs text-faint">Включите нужные виджеты в настройках.</p>
          <button onClick={onOpenSettings} className="btn-press flex items-center gap-2 rounded-xl bg-leaf px-4 py-2.5 text-sm font-bold text-paperink">
            <ISettings width={15} height={15} /> Открыть настройки
          </button>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibility.weight && <WeightZone weights={weights} onWeight={onWeight} />}
          {visibility.measures && <MeasuresZone measures={data.measures} onSave={onMeasures} />}
          {visibility.calories && (
            <Card icon={<IFlame width={16} height={16} />} tint="bg-carrotwash text-carrot" title="Калории по дням"
              right={<span className="text-[11px] text-faint">ср. <b className="font-display text-base text-carrot tabular-nums">{fmt(avgKcal)}</b> · цель {fmt(data.goals.kcal)}</span>}>
              <CaloriesChart keys={keys} vals={dayVals} goal={data.goals.kcal} showWeekdays={period === 7} />
              <p className="mt-3 text-[11px] text-faint">в цели {onGoal} из {logged.length} дней · серия {streak}</p>
            </Card>
          )}
          {visibility.macros && (
            <Card icon={<IApple width={16} height={16} />} tint="bg-tealwash text-teal" title="БЖУ · среднее в день">
              <div className="mt-4 space-y-3">
                <MacroBar label={`Белки · ${avgP} г`} value={avgP} goal={data.goals.p} color="var(--color-leaf)" wash="var(--color-leafwash)" />
                <MacroBar label={`Жиры · ${avgF} г`} value={avgF} goal={data.goals.f} color="var(--color-amber)" wash="var(--color-amberwash)" />
                <MacroBar label={`Углеводы · ${avgC} г`} value={avgC} goal={data.goals.c} color="var(--color-teal)" wash="var(--color-tealwash)" />
              </div>
            </Card>
          )}
          {visibility.activity && <ActivityZone vals={actVals} today={data.activity.find((a) => a.date === today)} onSave={onActivity} />}
          {visibility.steps && <StepsZone vals={stepsVals} avg={Math.round(avgOf(stepsVals))} onSave={onSteps} />}
          {visibility.sleep && <SleepZone vals={sleepVals} avg={avgOf(sleepVals)} today={data.sleep.find((s) => s.date === today)} onSave={onSleep} />}
          {visibility.water && (
            <Card icon={<IDrop width={16} height={16} />} tint="bg-waterwash text-water" title="Вода"
              right={<span className="text-[11px] text-faint">ср. <b className="font-display text-base text-water tabular-nums">{fmt(Math.round(avgOf(waterVals)))}</b> мл</span>}>
              <Bars values={waterVals} color="var(--color-water)" refLine={2000} unit=" мл" />
              <p className="mt-1.5 text-[11px] text-faint">пунктир — 2000 мл · отметки в дневнике</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- каркас карточки ---------- */
function Card({ icon, tint, title, right, children }: { icon: ReactNode; tint: string; title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="card p-5">
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
function Bars({ values, color, refLine, unit, height = 88 }: { values: number[]; color: string; refLine?: number; unit?: string; height?: number }) {
  const max = Math.max(...values, refLine ?? 0, 1) * 1.12;
  return (
    <div className="relative mt-3" style={{ height }}>
      {refLine !== undefined && (
        <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line" style={{ bottom: `${(refLine / max) * 100}%` }} />
      )}
      <div className="relative flex h-full items-end gap-[3px]">
        {values.map((v, i) => (
          <div key={i} className="group relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t-[3px] transition-all duration-200 group-hover:opacity-75"
              style={{ height: `${Math.max(v > 0 ? 5 : 2.5, (v / max) * 100)}%`, background: v > 0 ? color : "var(--color-linesoft)" }}
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
function CaloriesChart({ keys, vals, goal, showWeekdays }: { keys: string[]; vals: ReturnType<typeof dayTotals>[]; goal: number; showWeekdays: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(goal * 1.25, ...vals.map((v) => v.kcal), 1);
  const goalPct = (goal / max) * 100;
  const today = todayKey();
  return (
    <div className="relative mt-5 h-44">
      <div className="pointer-events-none absolute inset-x-1 z-0 border-t-2 border-dashed border-carrot/60" style={{ bottom: `${goalPct}%` }} />
      <div className="relative z-10 mx-1 flex h-full items-end gap-[3px] sm:gap-1.5">
        {vals.map((v, i) => {
          const h = Math.max(v.kcal > 0 ? 4 : 2, (v.kcal / max) * 100);
          const over = v.kcal > goal;
          const empty = v.count === 0;
          return (
            <div key={keys[i]} className="flex h-full flex-1 cursor-pointer flex-col items-center justify-end gap-1" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <div
                className="bar-grow w-full rounded-t-md"
                style={{ height: `${h}%`, animationDelay: `${i * 24}ms`, background: empty ? "var(--color-linesoft)" : over ? "var(--color-carrot)" : "var(--color-leaf)", opacity: hover === null || hover === i ? 1 : 0.5 }}
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
          <span className="block font-normal opacity-75">Б {Math.round(vals[hover].p)} · Ж {Math.round(vals[hover].f)} · У {Math.round(vals[hover].c)}</span>
        </div>
      )}
    </div>
  );
}

/* ---------- вес ---------- */
function WeightZone({ weights, onWeight }: { weights: { date: string; value: number }[]; onWeight: (v: number) => void }) {
  const [input, setInput] = useState("");
  const [err, setErr] = useState("");
  const last = weights[weights.length - 1];
  const prev = weights[weights.length - 2];
  const delta = last && prev ? Math.round((last.value - prev.value) * 10) / 10 : null;
  const min = weights.length ? Math.min(...weights.map((w) => w.value)) : 0;
  const max = weights.length ? Math.max(...weights.map((w) => w.value)) : 1;
  const span = max - min || 1;
  const PAD = 14;
  const yPct = (v: number) => PAD + (1 - (v - min) / span) * (100 - PAD * 2);
  const pts = weights.map((w, i) => ({ x: weights.length > 1 ? 2.5 + (i / (weights.length - 1)) * 95 : 50, y: yPct(w.value) }));

  const save = () => {
    const v = parseFloat(input.replace(",", "."));
    if (!Number.isFinite(v) || v < 30 || v > 400) return setErr("Введите вес от 30 до 400 кг");
    setErr("");
    setInput("");
    onWeight(Math.round(v * 10) / 10);
  };

  return (
    <Card icon={<IScale width={16} height={16} />} tint="bg-leafwash text-leafdeep" title="Вес"
      right={last ? (
        <span className="flex items-center gap-1.5">
          <b className="font-display text-base tabular-nums">{ru1(last.value)} кг</b>
          {delta !== null && (
            <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${delta <= 0 ? "bg-leafwash text-leafdeep" : "bg-carrotwash text-carrot"}`}>
              {delta <= 0 ? <ITrendDown width={10} height={10} /> : <ITrendUp width={10} height={10} />}
              {delta > 0 ? "+" : ""}{ru1(delta)}
            </span>
          )}
        </span>
      ) : null}>
      {weights.length >= 2 ? (
        <svg viewBox="0 0 100 40" className="mt-4 h-20 w-full" preserveAspectRatio="none" aria-hidden>
          <polyline
            points={pts.map((p) => `${p.x},${p.y * 0.4}`).join(" ")}
            fill="none"
            stroke="var(--color-leaf)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y * 0.4} r="2" fill="var(--color-card)" stroke="var(--color-leaf)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
      ) : (
        <p className="mt-4 rounded-xl bg-paper px-3 py-4 text-center text-xs text-faint">Замеров пока нет — введите вес ниже</p>
      )}
      <div className="mt-4 flex items-center gap-2">
        <input
          className={`field h-9 min-w-0 flex-1 py-0 text-center text-[13px] tabular-nums ${err ? "field-invalid" : ""}`}
          placeholder="Вес, напр. 80,5"
          inputMode="decimal"
          value={input}
          onChange={(e) => { setInput(e.target.value); setErr(""); }}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <button onClick={save} className="btn-press h-9 shrink-0 rounded-xl bg-leaf px-3.5 text-xs font-bold text-paperink">Записать</button>
      </div>
      {err && <p className="mt-1 text-[11px] font-medium text-danger">{err}</p>}
    </Card>
  );
}

/* ---------- замеры тела ---------- */
function MeasuresZone({ measures, onSave }: { measures: Record<MeasureKey, MeasureEntry[]>; onSave: (v: Partial<Record<MeasureKey, number>>) => void }) {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");
  const save = () => {
    const out: Partial<Record<MeasureKey, number>> = {};
    for (const { id } of MEASURE_KEYS) {
      const raw = (vals[id] ?? "").trim();
      if (!raw) continue;
      const n = num(raw);
      if (!Number.isFinite(n) || n < 20 || n > 250) return setErr("Значения — от 20 до 250 см");
      out[id] = Math.round(n * 10) / 10;
    }
    if (!Object.keys(out).length) return setErr("Заполните хотя бы одно поле");
    setErr(""); setVals({}); setOpen(false);
    onSave(out);
  };
  const rows = MEASURE_KEYS.map(({ id, label }) => {
    const list = [...(measures[id] ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    const last = list[list.length - 1];
    const prev = list[list.length - 2];
    const delta = last && prev ? Math.round((last.value - prev.value) * 10) / 10 : null;
    return { id, label, last, delta };
  });
  return (
    <Card icon={<IRuler width={16} height={16} />} tint="bg-amberwash text-amber" title="Замеры тела"
      right={
        <button onClick={() => setOpen((o) => !o)} aria-label="Добавить замер" className="btn-press grid size-8 place-items-center rounded-lg border border-leaf/40 bg-leafwash text-leafdeep hover:bg-leaf hover:text-paperink">
          <IPlus width={15} height={15} />
        </button>
      }>
      {open && (
        <div className="anim-in mt-3 rounded-xl border border-line bg-field/70 p-3">
          <div className="grid grid-cols-2 gap-2">
            {MEASURE_KEYS.map(({ id, label }) => (
              <label key={id} className="block">
                <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-faint">{label}</span>
                <input className="field h-9 py-0 text-sm tabular-nums" inputMode="decimal" placeholder="см" value={vals[id] ?? ""} onChange={(e) => setVals((v) => ({ ...v, [id]: e.target.value }))} />
              </label>
            ))}
          </div>
          {err && <p className="mt-1.5 text-[11px] font-medium text-danger">{err}</p>}
          <button onClick={save} className="btn-press mt-2.5 w-full rounded-xl bg-leaf py-2 text-sm font-bold text-paperink">Сохранить замер за сегодня</button>
        </div>
      )}
      <ul className="mt-3 space-y-1">
        {rows.map(({ id, label, last, delta }) => (
          <li key={id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-field">
            <span className="text-soft">{label}</span>
            <span className="flex items-center gap-2 tabular-nums">
              {last ? (
                <>
                  {delta !== null && delta !== 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${delta < 0 ? "bg-leafwash text-leafdeep" : "bg-carrotwash text-carrot"}`}>
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
    </Card>
  );
}

/* ---------- активность ---------- */
function ActivityZone({ vals, today, onSave }: { vals: (ActivityEntry | undefined)[]; today?: ActivityEntry; onSave: (m: number, k: number) => void }) {
  const [min, setMin] = useState(today ? String(today.minutes) : "");
  const [kcal, setKcal] = useState(today ? String(today.kcal) : "");
  const [err, setErr] = useState("");
  const minutes = vals.reduce((s, v) => s + (v?.minutes ?? 0), 0);
  const kcalSum = vals.reduce((s, v) => s + (v?.kcal ?? 0), 0);
  const count = vals.filter(Boolean).length;
  const save = () => {
    const m = Math.round(num(min));
    const k = Math.round(num(kcal));
    if (!Number.isFinite(m) || m < 1 || m > 900 || !Number.isFinite(k) || k < 1 || k > 6000) return setErr("Минуты 1–900, ккал 1–6000");
    setErr("");
    onSave(m, k);
  };
  return (
    <Card icon={<IActivity width={16} height={16} />} tint="bg-carrotwash text-carrot" title="Активность" right={<span className="text-[11px] text-faint">{count} трен.</span>}>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-paper px-3 py-2.5">
          <div className="font-display text-lg font-extrabold tabular-nums">{fmt(minutes)}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-faint">мин</div>
        </div>
        <div className="rounded-xl bg-paper px-3 py-2.5">
          <div className="font-display text-lg font-extrabold tabular-nums">{fmt(kcalSum)}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-faint">акт. ккал</div>
        </div>
      </div>
      <Bars values={vals.map((v) => v?.kcal ?? 0)} color="var(--color-carrot)" unit=" ккал" height={56} />
      <div className="mt-2.5 flex gap-1.5">
        <input className="field h-9 w-0 min-w-0 flex-1 py-0 text-[13px] tabular-nums" placeholder="Мин" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} />
        <input className="field h-9 w-0 min-w-0 flex-1 py-0 text-[13px] tabular-nums" placeholder="Ккал" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
        <button onClick={save} className="btn-press h-9 shrink-0 rounded-xl bg-ink px-3 text-xs font-bold text-paperink">ОК</button>
      </div>
      {err && <p className="mt-1 text-[11px] font-medium text-danger">{err}</p>}
    </Card>
  );
}

/* ---------- шаги ---------- */
function StepsZone({ vals, avg, onSave }: { vals: number[]; avg: number; onSave: (v: number) => void }) {
  const [input, setInput] = useState("");
  const [err, setErr] = useState("");
  const best = Math.max(...vals, 0);
  const save = () => {
    const n = Math.round(num(input));
    if (!Number.isFinite(n) || n < 0 || n > 200000) return setErr("Шаги — от 0 до 200 000");
    setErr("");
    onSave(n);
  };
  return (
    <Card icon={<IFoot width={16} height={16} />} tint="bg-leafwash text-leafdeep" title="Шаги"
      right={<span className="text-[11px] text-faint">ср. <b className="font-display text-base tabular-nums">{fmt(avg)}</b></span>}>
      <Bars values={vals} color="var(--color-leaf)" refLine={10000} height={88} />
      <p className="mt-1.5 text-[11px] text-faint">пунктир — 10 000 · рекорд {fmt(best)}</p>
      <div className="mt-2.5 flex gap-1.5">
        <input className="field h-9 w-0 min-w-0 flex-1 py-0 text-[13px] tabular-nums" placeholder="Шаги" inputMode="numeric" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
        <button onClick={save} className="btn-press h-9 shrink-0 rounded-xl bg-ink px-3 text-xs font-bold text-paperink">ОК</button>
      </div>
      {err && <p className="mt-1 text-[11px] font-medium text-danger">{err}</p>}
    </Card>
  );
}

/* ---------- сон ---------- */
function SleepZone({ vals, avg, today, onSave }: { vals: number[]; avg: number; today?: SleepEntry; onSave: (h: number, q?: SleepEntry["quality"]) => void }) {
  const [hours, setHours] = useState(today ? String(today.hours) : "");
  const [quality, setQuality] = useState<SleepEntry["quality"]>(today?.quality ?? "ok");
  const [err, setErr] = useState("");
  const save = () => {
    const h = num(hours);
    if (!Number.isFinite(h) || h <= 0 || h > 24) return setErr("Часы — от 0 до 24");
    setErr("");
    onSave(Math.round(h * 10) / 10, quality);
  };
  return (
    <Card icon={<IMoon width={16} height={16} />} tint="bg-tealwash text-teal" title="Сон"
      right={<span className="text-[11px] text-faint">ср. <b className="font-display text-base tabular-nums">{ru1(avg)}</b> ч</span>}>
      <Bars values={vals} color="var(--color-teal)" refLine={8} unit=" ч" height={88} />
      <p className="mt-1.5 flex items-center justify-between text-[11px] text-faint">
        <span>пунктир — 8 ч</span>
        {today?.quality && (
          <span className="flex items-center gap-1 font-semibold" style={{ color: QUALITY[today.quality].color }}>
            <span className="size-1.5 rounded-full" style={{ background: QUALITY[today.quality].color }} />
            прошлая ночь: {QUALITY[today.quality].label.toLowerCase()}
          </span>
        )}
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <div className="flex rounded-xl border border-line bg-field p-0.5">
          {(["bad", "ok", "good"] as const).map((q) => (
            <button key={q} onClick={() => setQuality(q)} title={QUALITY[q].label}
              className={`flex-1 whitespace-nowrap rounded-lg px-0.5 py-1.5 text-[10px] font-bold transition-colors sm:text-[11px] ${quality === q ? "bg-ink text-paperink" : "text-faint hover:text-soft"}`}>
              {QUALITY[q].label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input className="field h-9 w-0 min-w-0 flex-1 py-0 text-center text-[13px] tabular-nums" placeholder="часов, напр. 7,5" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
          <button onClick={save} className="btn-press h-9 min-w-[48px] shrink-0 rounded-xl bg-ink px-3.5 text-xs font-bold text-paperink">ОК</button>
        </div>
        {err && <p className="text-[11px] font-medium text-danger">{err}</p>}
      </div>
    </Card>
  );
}
