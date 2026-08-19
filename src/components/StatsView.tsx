import { useMemo, useState, type ReactNode } from "react";
import type {
  ActivityEntry,
  AppData,
  MeasureEntry,
  MeasureKey,
  SleepEntry,
  WeightEntry,
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

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

export function StatsView({
  data,
  onSteps,
  onSleep,
  onActivity,
  onMeasures,
  onWeight,
}: {
  data: AppData;
  onSteps: (value: number) => void;
  onSleep: (hours: number, quality?: SleepEntry["quality"]) => void;
  onActivity: (minutes: number, kcal: number) => void;
  onMeasures: (vals: Partial<Record<MeasureKey, number>>) => void;
  onWeight: (value: number) => void;
}) {
  const today = todayKey();
  const [period, setPeriod] = useState<Period>(7);

  const keys = useMemo(
    () => Array.from({ length: period }, (_, i) => shiftKey(today, i - (period - 1))),
    [period, today],
  );

  const dayVals = useMemo(() => keys.map((k) => dayTotals(data.days[k])), [keys, data.days]);
  const logged = dayVals.filter((v) => v.count > 0);

  const sum = logged.reduce(
    (a, v) => ({ kcal: a.kcal + v.kcal, p: a.p + v.p, f: a.f + v.f, c: a.c + v.c }),
    { kcal: 0, p: 0, f: 0, c: 0 },
  );
  const avgKcal = logged.length ? Math.round(sum.kcal / logged.length) : 0;
  const avgP = logged.length ? Math.round(sum.p / logged.length) : 0;
  const avgF = logged.length ? Math.round(sum.f / logged.length) : 0;
  const avgC = logged.length ? Math.round(sum.c / logged.length) : 0;
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

      <div className="mt-5 flex flex-col gap-5">
        {/* РЯД 1 · Вес + Замеры тела */}
        <section className="card p-5 sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:gap-0">
            <WeightZone weights={weights} onWeight={onWeight} />
            <div className="border-t border-dashed border-line pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <MeasuresZone measures={data.measures} onSave={onMeasures} />
            </div>
          </div>
        </section>

        {/* РЯД 2 · Калории + БЖУ */}
        <section className="card p-5 sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:gap-0">
            <CaloriesZone
              keys={keys}
              vals={dayVals}
              goal={data.goals.kcal}
              avgKcal={avgKcal}
              onGoal={onGoal}
              loggedCount={logged.length}
              streak={streak}
              showWeekdays={period === 7}
            />
            <div className="border-t border-dashed border-line pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <MacrosZone
                avgP={avgP}
                avgF={avgF}
                avgC={avgC}
                goals={data.goals}
                period={period}
              />
            </div>
          </div>
        </section>

        {/* РЯД 3 · Активность + Шаги — широкая карточка на всю ширину (50/50) */}
        <section className="card p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-0">
            <ActivityZone
              vals={actVals}
              today={todayAct}
              onSave={onActivity}
              className="md:pr-6"
            />
            <StepsZone
              vals={stepsVals}
              avg={Math.round(avgOf(stepsVals))}
              today={todaySteps?.value}
              onSave={onSteps}
              className="border-t border-dashed border-line pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0"
            />
          </div>
        </section>

        {/* РЯД 4 · Сон и Вода — рядом, по 50% */}
        <div className="grid gap-5 md:grid-cols-2">
          <SleepZone
            vals={sleepVals}
            avg={avgOf(sleepVals)}
            today={todaySleep}
            onSave={onSleep}
          />

          <WaterZone
            vals={waterVals}
            avg={avgOf(waterVals)}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------- заголовок зоны ---------- */

function ZoneTitle({
  icon,
  tint,
  title,
  right,
}: {
  icon: ReactNode;
  tint: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${tint}`}>{icon}</span>
      <h2 className="font-display text-[13px] font-bold">{title}</h2>
      <div className="ml-auto min-w-0 text-right">{right}</div>
    </div>
  );
}

/* ---------- РЯД 1: вес ---------- */

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function WeightZone({ weights, onWeight }: { weights: WeightEntry[]; onWeight: (value: number) => void }) {
  const [input, setInput] = useState("");
  const [err, setErr] = useState("");

  const last = weights[weights.length - 1];
  const prev = weights[weights.length - 2];
  const delta = last && prev ? Math.round((last.value - prev.value) * 10) / 10 : null;

  const min = weights.length ? Math.min(...weights.map((w) => w.value)) : 0;
  const max = weights.length ? Math.max(...weights.map((w) => w.value)) : 1;
  const span = max - min || 1;
  const PAD = 14;
  const X0 = 2.5;
  const X1 = 97.5;
  const yPct = (v: number) => PAD + (1 - (v - min) / span) * (100 - PAD * 2);
  const pts = weights.map((w, i) => ({
    x: weights.length > 1 ? X0 + (i / (weights.length - 1)) * (X1 - X0) : 50,
    y: yPct(w.value),
  }));
  const line = smoothPath(pts);
  const area = weights.length > 1 ? `${line} L ${X1} 100 L ${X0} 100 Z` : "";

  const save = () => {
    const v = parseFloat(input.replace(",", "."));
    if (!Number.isFinite(v) || v < 30 || v > 400) {
      setErr("Введите вес от 30 до 400 кг");
      return;
    }
    setErr("");
    setInput("");
    onWeight(Math.round(v * 10) / 10);
  };

  return (
    <div className="lg:pr-6">
      <ZoneTitle
        icon={<IScale width={16} height={16} />}
        tint="bg-leafwash text-leafdeep"
        title="Вес"
        right={
          last && (
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-extrabold leading-none tabular-nums">
                {ru1(last.value)} <span className="text-xs font-bold text-faint">кг</span>
              </span>
              {delta !== null && (
                <span
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                    delta <= 0 ? "bg-leafwash text-leafdeep" : "bg-carrotwash text-carrot"
                  }`}
                >
                  {delta <= 0 ? <ITrendDown width={12} height={12} /> : <ITrendUp width={12} height={12} />}
                  {delta > 0 ? "+" : ""}{ru1(delta)} кг
                </span>
              )}
            </div>
          )
        }
      />

      {weights.length === 0 ? (
        <p className="mt-4 rounded-xl bg-paper px-3 py-4 text-center text-xs text-faint">
          Замеров пока нет — введите вес ниже, и здесь появится график
        </p>
      ) : (
        <>
          <div className="relative mt-4 h-20">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
              {area && <path d={area} fill="rgba(15,125,138,0.12)" />}
              {weights.length > 1 && (
                <path
                  d={line}
                  fill="none"
                  stroke="var(--color-leaf)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>
            {pts.map((p, i) => (
              <span
                key={i}
                className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-leaf bg-card"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                title={`${ru1(weights[i].value)} кг`}
              />
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-faint tabular-nums">
            {weights.length} {plural(weights.length, "замер", "замера", "замеров")} · динамика за всё время
          </p>
        </>
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
        <button
          onClick={save}
          className="btn-press h-9 shrink-0 rounded-xl bg-leaf px-3.5 text-xs font-bold text-paperink"
        >
          Записать
        </button>
      </div>
      {err && <p className="mt-1 text-[11px] font-medium text-danger">{err}</p>}
    </div>
  );
}

/* ---------- РЯД 1: замеры тела ---------- */

function MeasuresZone({
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

  return (
    <div>
      <ZoneTitle
        icon={<IRuler width={16} height={16} />}
        tint="bg-amberwash text-amber"
        title="Замеры тела"
        right={
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Добавить замер"
            title="Добавить замер"
            className={`btn-press grid size-8 place-items-center rounded-full text-paperink ${
              open ? "bg-ink" : "bg-leaf"
            }`}
          >
            {open ? (
              <span className="font-display text-base leading-none">×</span>
            ) : (
              <IPlus width={15} height={15} />
            )}
          </button>
        }
      />

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

      <ul className="mt-3">
        {rows.map(({ id, label, last, delta }) => (
          <li
            key={id}
            className="flex items-center justify-between gap-3 border-b border-dashed border-linesoft py-[7px] text-sm last:border-0"
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
                  <b className="font-display text-[13px]">{ru1(last.value)} см</b>
                </>
              ) : (
                <span className="text-faint">—</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- РЯД 2: калории ---------- */

function CaloriesZone({
  keys,
  vals,
  goal,
  avgKcal,
  onGoal,
  loggedCount,
  streak,
  showWeekdays,
}: {
  keys: string[];
  vals: ReturnType<typeof dayTotals>[];
  goal: number;
  avgKcal: number;
  onGoal: number;
  loggedCount: number;
  streak: number;
  showWeekdays: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(goal * 1.25, ...vals.map((v) => v.kcal), 1);
  const goalPct = (goal / max) * 100;
  const today = todayKey();

  return (
    <div className="lg:pr-6">
      <ZoneTitle
        icon={<IFlame width={16} height={16} />}
        tint="bg-carrotwash text-carrot"
        title="Калории по дням"
        right={
          <div className="flex items-center gap-2">
            <span className="text-right">
              <span className="text-[10px] tracking-wide text-faint">среднее </span>
              <span className="font-display text-xl font-extrabold leading-none text-carrot tabular-nums">
                {fmt(avgKcal)}
              </span>
            </span>
            <span className="rounded-full bg-paper px-2 py-1 text-[10px] font-bold text-faint tabular-nums">
              цель {fmt(goal)}
            </span>
          </div>
        }
      />

      <div className="relative mt-5 h-44">
        <div
          className="pointer-events-none absolute inset-x-1 z-0 border-t-2 border-dashed border-carrot/60"
          style={{ bottom: `${goalPct}%` }}
        />
        <div className="relative z-10 mx-1 flex h-full items-end gap-[3px] sm:gap-1.5">
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

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pb-1 text-[11px] text-faint">
        <span>пунктир — дневная цель</span>
        {loggedCount > 0 && (
          <span className="tabular-nums">
            в цели <b className="text-leafdeep">{onGoal}</b> из {loggedCount} дней · серия{" "}
            <b className="text-carrot">{streak}</b>
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------- РЯД 2: БЖУ ---------- */

function MacrosZone({
  avgP,
  avgF,
  avgC,
  goals,
  period,
}: {
  avgP: number;
  avgF: number;
  avgC: number;
  goals: AppData["goals"];
  period: number;
}) {
  const pKcal = avgP * 4;
  const fKcal = avgF * 9;
  const cKcal = avgC * 4;
  const tot = pKcal + fKcal + cKcal || 1;

  return (
    <div className="flex h-full flex-col">
      <ZoneTitle
        icon={<IApple width={16} height={16} />}
        tint="bg-tealwash text-teal"
        title="БЖУ · среднее в день"
        right={<span className="text-[11px] text-faint">за {period} дней</span>}
      />

      <div className="mt-4 space-y-3">
        <MacroBar label="Белки" value={avgP} goal={goals.p} color="var(--color-leaf)" wash="var(--color-leafwash)" />
        <MacroBar label="Жиры" value={avgF} goal={goals.f} color="var(--color-amber)" wash="var(--color-amberwash)" />
        <MacroBar label="Углеводы" value={avgC} goal={goals.c} color="var(--color-teal)" wash="var(--color-tealwash)" />
      </div>

      <div className="mt-auto pt-4">
        <div className="flex h-3 overflow-hidden rounded-full">
          <div style={{ width: `${(pKcal / tot) * 100}%`, background: "var(--color-leaf)" }} />
          <div style={{ width: `${(fKcal / tot) * 100}%`, background: "var(--color-amber)" }} />
          <div style={{ width: `${(cKcal / tot) * 100}%`, background: "var(--color-teal)" }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-soft">
          <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-leaf" /> белки {Math.round((pKcal / tot) * 100)}%</span>
          <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-amber" /> жиры {Math.round((fKcal / tot) * 100)}%</span>
          <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-teal" /> углеводы {Math.round((cKcal / tot) * 100)}%</span>
        </div>
        <p className="mt-1.5 text-[11px] text-faint">соотношение калорий из макронутриентов</p>
      </div>
    </div>
  );
}

/* ---------- РЯД 3: активность ---------- */

function ActivityZone({
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
    <div className={className}>
      <ZoneTitle
        icon={<IActivity width={16} height={16} />}
        tint="bg-carrotwash text-carrot"
        title="Активность"
      />
      <div className="mt-3">
        <span className="font-display text-3xl font-extrabold leading-none tabular-nums">{count}</span>
        <span className="ml-1.5 text-xs font-semibold text-faint">
          {plural(count, "тренировка", "тренировки", "тренировок")}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-soft tabular-nums">
        <span>{fmt(minutes)} мин</span>
        <span className="text-line">·</span>
        <span className="text-carrot">{fmt(kcalSum)} ккал</span>
      </div>

      <div className="mt-3 flex gap-1.5">
        <input
          className="field h-9 w-0 min-w-0 flex-1 py-0 text-[13px] tabular-nums"
          placeholder="Мин"
          inputMode="numeric"
          value={min}
          onChange={(e) => setMin(e.target.value)}
        />
        <input
          className="field h-9 w-0 min-w-0 flex-1 py-0 text-[13px] tabular-nums"
          placeholder="Ккал"
          inputMode="numeric"
          value={kcal}
          onChange={(e) => setKcal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <button onClick={save} className="btn-press shrink-0 rounded-xl bg-ink px-3 text-xs font-bold text-paperink">
          ОК
        </button>
      </div>
      {err ? (
        <p className="mt-1 text-[11px] font-medium text-danger">{err}</p>
      ) : (
        <p className="mt-1.5 text-[11px] text-faint">записать тренировку за сегодня</p>
      )}
    </div>
  );
}

/* ---------- РЯД 3: шаги ---------- */

function StepsZone({
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
    <div className={className}>
      <ZoneTitle icon={<IFoot width={16} height={16} />} tint="bg-leafwash text-leafdeep" title="Шаги" />
      <div className="mt-3">
        <span className="font-display text-3xl font-extrabold leading-none tabular-nums">{fmt(avg)}</span>
        <span className="ml-1.5 text-xs font-semibold text-faint">в день</span>
      </div>
      <p className="mt-2 text-xs font-semibold text-soft tabular-nums">
        рекорд: <span className="text-leafdeep">{fmt(best)}</span>
      </p>

      <div className="mt-3 flex gap-1.5">
        <input
          className="field h-9 w-0 min-w-0 flex-1 py-0 text-[13px] tabular-nums"
          placeholder="Шаги"
          inputMode="numeric"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <button onClick={save} className="btn-press shrink-0 rounded-xl bg-ink px-3 text-xs font-bold text-paperink">
          ОК
        </button>
      </div>
      {err ? (
        <p className="mt-1 text-[11px] font-medium text-danger">{err}</p>
      ) : (
        <p className="mt-1.5 text-[11px] text-faint">записать шаги за сегодня</p>
      )}
    </div>
  );
}

/* ---------- мини-столбики ---------- */

function Bars({
  values,
  color,
  refLine,
  height = 64,
}: {
  values: number[];
  color: string;
  refLine?: number;
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
          <div
            key={i}
            className="w-full flex-1 rounded-t-[3px] transition-all duration-200 hover:opacity-70"
            style={{
              height: `${Math.max(v > 0 ? 5 : 2.5, (v / max) * 100)}%`,
              background: v > 0 ? color : "var(--color-linesoft)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- РЯД 3: сон ---------- */

function SleepZone({
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
    <section className={`card flex flex-col p-5 ${className ?? ""}`}>
      <ZoneTitle icon={<IMoon width={16} height={16} />} tint="bg-tealwash text-teal" title="Сон" />
      <div className="mt-3">
        <span className="font-display text-3xl font-extrabold leading-none tabular-nums">{ru1(avg)}</span>
        <span className="ml-1.5 text-xs font-semibold text-faint">ч в среднем</span>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold">
        {latest?.quality ? (
          <span className="flex items-center gap-1.5" style={{ color: QUALITY[latest.quality].color }}>
            <span className="size-2 rounded-full" style={{ background: QUALITY[latest.quality].color }} />
            прошлая ночь: {QUALITY[latest.quality].label.toLowerCase()}
          </span>
        ) : (
          <span className="text-faint">качество пока не отмечено</span>
        )}
      </div>

      <div className="flex-1">
        <Bars values={vals} color="var(--color-teal)" refLine={8} height={64} />
        <p className="mt-1.5 text-[11px] text-faint">пунктир — цель 8 ч</p>
      </div>

      {/* форма: качество — отдельной строкой, ниже инпут + «ОК» */}
      <div className="mt-4 flex flex-col gap-2">
        <div className="flex rounded-xl border border-line bg-field p-0.5">
          {(["bad", "ok", "good"] as const).map((q) => (
            <button
              key={q}
              onClick={() => setQuality(q)}
              title={QUALITY[q].label}
              className={`flex-1 whitespace-nowrap rounded-lg px-0.5 py-1.5 text-[10px] font-bold transition-colors sm:text-[11px] ${
                quality === q ? "bg-ink text-paperink" : "text-faint hover:text-soft"
              }`}
            >
              {QUALITY[q].label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            className="field h-9 min-w-0 flex-1 py-0 text-center text-[13px] tabular-nums"
            placeholder="часов, напр. 7,5"
            inputMode="decimal"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
          <button
            onClick={save}
            className="btn-press h-9 min-w-[48px] shrink-0 rounded-xl bg-ink px-3.5 text-xs font-bold text-paperink"
          >
            ОК
          </button>
        </div>
        {err && <p className="text-[11px] font-medium text-danger">{err}</p>}
      </div>
    </section>
  );
}

/* ---------- РЯД 3: вода ---------- */

function WaterZone({ className, vals, avg }: { className?: string; vals: number[]; avg: number }) {
  return (
    <section className={`card flex flex-col p-5 ${className ?? ""}`}>
      <ZoneTitle icon={<IDrop width={16} height={16} />} tint="bg-waterwash text-water" title="Вода" />
      <div className="mt-3">
        <span className="font-display text-3xl font-extrabold leading-none tabular-nums">{fmt(Math.round(avg))}</span>
        <span className="ml-1.5 text-xs font-semibold text-faint">мл в среднем</span>
      </div>
      <p className="mt-2 text-[11px] font-semibold text-faint">стаканы отмечаются в дневнике</p>

      <div className="flex-1">
        <Bars values={vals} color="var(--color-water)" refLine={2000} height={64} />
        <p className="mt-1.5 text-[11px] text-faint">пунктир — цель 2000 мл</p>
      </div>
    </section>
  );
}
