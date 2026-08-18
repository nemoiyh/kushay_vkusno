import { useMemo, useState } from "react";
import type { AppData } from "../types";
import { WD, dayTotals, fmt, humanDate, shiftKey, streakDays, todayKey } from "../lib/store";
import { AnimatedNumber } from "./ui";
import { IFlame, IScale, ITrendDown, ITrendUp } from "./Icons";

export function StatsView({ data }: { data: AppData }) {
  const today = todayKey();
  const keys = useMemo(() => Array.from({ length: 7 }, (_, i) => shiftKey(today, i - 6)), [today]);
  const vals = useMemo(() => keys.map((k) => dayTotals(data.days[k])), [keys, data.days]);

  const logged = vals.filter((v) => v.count > 0);
  const avgKcal = logged.length ? Math.round(logged.reduce((s, v) => s + v.kcal, 0) / logged.length) : 0;
  const avgP = logged.length ? Math.round(logged.reduce((s, v) => s + v.p, 0) / logged.length) : 0;
  const avgF = logged.length ? Math.round(logged.reduce((s, v) => s + v.f, 0) / logged.length) : 0;
  const avgC = logged.length ? Math.round(logged.reduce((s, v) => s + v.c, 0) / logged.length) : 0;
  const onGoal = logged.filter((v) => v.kcal <= data.goals.kcal).length;
  const hitPct = logged.length ? Math.round((onGoal / logged.length) * 100) : 0;
  const streak = streakDays(data.days, data.goals.kcal);

  const max = Math.max(data.goals.kcal * 1.25, ...vals.map((v) => v.kcal), 1);
  const goalPct = (data.goals.kcal / max) * 100;
  const [hover, setHover] = useState<number | null>(null);

  const weights = useMemo(() => [...data.weights].sort((a, b) => a.date.localeCompare(b.date)), [data.weights]);
  const wDelta = weights.length >= 2 ? weights[weights.length - 1].value - weights[0].value : null;

  return (
    <div className="anim-in">
      <h1 className="font-display text-xl font-extrabold sm:text-2xl">Статистика</h1>
      <p className="mt-1 text-sm text-soft">Последние 7 дней · цель {fmt(data.goals.kcal)} ккал</p>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* график недели */}
        <section className="card p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-[13px] font-bold">Калории по дням</h2>
            <span className="text-xs text-faint tabular-nums">
              среднее <b className="text-carrot">{fmt(avgKcal)}</b> ккал
            </span>
          </div>

          <div className="relative mt-6 h-52">
            {/* линия цели */}
            <div
              className="pointer-events-none absolute inset-x-0 z-0 border-t-2 border-dashed border-carrot/60"
              style={{ bottom: `${goalPct}%` }}
            >
              <span className="absolute right-0 -top-5 rounded-md bg-carrotwash px-1.5 py-0.5 text-[10px] font-bold text-carrot">
                цель {fmt(data.goals.kcal)}
              </span>
            </div>
            <div className="relative z-10 flex h-full items-end gap-2 sm:gap-3">
              {vals.map((v, i) => {
                const h = Math.max(v.kcal > 0 ? 4 : 2, (v.kcal / max) * 100);
                const over = v.kcal > data.goals.kcal;
                const empty = v.count === 0;
                return (
                  <div
                    key={keys[i]}
                    className="flex h-full flex-1 cursor-pointer flex-col items-center justify-end gap-1.5"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <span
                      className={`text-[10px] font-bold tabular-nums transition-opacity sm:text-[11px] ${
                        hover === i ? "opacity-100" : "opacity-0 sm:opacity-60"
                      } ${empty ? "text-faint" : over ? "text-carrot" : "text-leafdeep"}`}
                    >
                      {empty ? "—" : fmt(v.kcal)}
                    </span>
                    <div
                      className="bar-grow w-full max-w-11 rounded-t-lg border border-b-0 transition-colors"
                      style={{
                        height: `${h}%`,
                        animationDelay: `${i * 55}ms`,
                        background: empty
                          ? "var(--color-linesoft)"
                          : over
                            ? "var(--color-carrot)"
                            : "var(--color-leaf)",
                        borderColor: empty ? "var(--color-line)" : "transparent",
                        opacity: hover === null || hover === i ? 1 : 0.55,
                      }}
                    />
                    <span className={`text-[11px] font-semibold ${keys[i] === today ? "text-carrot" : "text-faint"}`}>
                      {WD[new Date(keys[i] + "T12:00:00").getDay()]}
                    </span>
                  </div>
                );
              })}
            </div>
            {hover !== null && vals[hover].count > 0 && (
              <div className="pointer-events-none absolute -top-2 left-1/2 z-20 -translate-x-1/2 rounded-lg bg-ink px-3 py-1.5 text-center text-[11px] font-semibold text-paperink hard-sm">
                {humanDate(keys[hover])} · {fmt(vals[hover].kcal)} ккал
                <span className="block font-normal opacity-75">
                  Б {Math.round(vals[hover].p)} · Ж {Math.round(vals[hover].f)} · У {Math.round(vals[hover].c)}
                </span>
              </div>
            )}
          </div>
          {logged.length === 0 && (
            <p className="mt-3 rounded-xl bg-paper px-4 py-3 text-center text-xs text-faint">
              За неделю пока нет записей — добавьте что-нибудь в дневник, и график оживёт.
            </p>
          )}
        </section>

        {/* боковая колонка */}
        <div className="flex flex-col gap-5">
          <section className="card flex items-center gap-4 p-5">
            <div className={`grid size-12 shrink-0 place-items-center rounded-xl ${streak > 0 ? "bg-carrotwash text-carrot" : "bg-paper text-faint"}`}>
              <IFlame width={24} height={24} />
            </div>
            <div>
              <div className="font-display text-2xl font-extrabold tabular-nums">
                <AnimatedNumber value={streak} />{" "}
                <span className="text-sm font-bold text-soft">{plural(streak, "день", "дня", "дней")}</span>
              </div>
              <p className="text-xs text-soft">
                {streak > 0 ? "подряд в пределах цели" : "серия начнётся с первого дня в цели"}
              </p>
            </div>
          </section>

          <section className="card p-5">
            <h3 className="font-display text-[13px] font-bold">Итоги недели</h3>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label="Дней с записями" value={`${logged.length} из 7`} />
              <Row label="Дней в цели" value={`${onGoal} · ${hitPct}%`} tone={hitPct >= 70 ? "var(--color-leaf)" : hitPct >= 40 ? "var(--color-amber)" : "var(--color-carrot)"} />
              <Row label="Средние белки" value={`${avgP} г`} tone="var(--color-leaf)" />
              <Row label="Средние жиры" value={`${avgF} г`} tone="var(--color-amber)" />
              <Row label="Средние углеводы" value={`${avgC} г`} tone="var(--color-teal)" />
            </dl>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 font-display text-[13px] font-bold">
                <IScale width={15} height={15} className="text-soft" /> Вес
              </h3>
              {wDelta !== null && (
                <span
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                    wDelta <= 0 ? "bg-leafwash text-leafdeep" : "bg-carrotwash text-carrot"
                  }`}
                >
                  {wDelta <= 0 ? <ITrendDown width={12} height={12} /> : <ITrendUp width={12} height={12} />}
                  {wDelta > 0 ? "+" : ""}{wDelta.toFixed(1)} кг
                </span>
              )}
            </div>
            {weights.length >= 2 ? (
              <>
                <WeightSpark values={weights.map((w) => w.value)} />
                <p className="mt-1.5 text-[11px] text-faint tabular-nums">
                  {weights[weights.length - 1].value.toFixed(1)} кг · замеров: {weights.length}
                </p>
              </>
            ) : (
              <p className="mt-3 rounded-xl bg-paper px-3 py-2.5 text-xs text-faint">
                Добавляйте вес в разделе «Цели» — здесь появится динамика.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-linesoft pb-2 last:border-0 last:pb-0">
      <dt className="text-soft">{label}</dt>
      <dd className="font-bold tabular-nums" style={tone ? { color: tone } : undefined}>{value}</dd>
    </div>
  );
}

function WeightSpark({ values }: { values: number[] }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${30 - ((v - min) / span) * 26 + 2}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 34" className="mt-3 h-16 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline points={pts} fill="none" stroke="var(--color-leaf)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle
          key={i}
          cx={(i / (values.length - 1)) * 100}
          cy={30 - ((v - min) / span) * 26 + 2}
          r="2.6"
          fill="var(--color-card)"
          stroke="var(--color-leaf)"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}
