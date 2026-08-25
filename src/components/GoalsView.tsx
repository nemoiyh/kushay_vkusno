import { useMemo } from "react";
import type { AppData, Goals, Profile, Sex } from "../types";
import { fmt } from "../lib/store";
import { IAlert } from "./Icons";

const ACTIVITIES = [
  { v: 1.2, label: "Минимум движения" },
  { v: 1.375, label: "1–3 тренировки в неделю" },
  { v: 1.55, label: "3–5 тренировок в неделю" },
  { v: 1.725, label: "6–7 тренировок в неделю" },
  { v: 1.9, label: "Тяжёлый физический труд" },
];

export function GoalsView({
  data,
  onUpdateGoals,
  onUpdateProfile,
}: {
  data: AppData;
  onUpdateGoals: (g: Goals) => void;
  onUpdateProfile: (p: Profile) => void;
}) {
  const { goals, profile } = data;

  /** расчёт БЖУ под калории: 30/30/40 */
  const applySplit = (kcal: number) => {
    const k = Math.round(kcal);
    onUpdateGoals({
      kcal: k,
      p: Math.round((k * 0.3) / 4),
      f: Math.round((k * 0.3) / 9),
      c: Math.round((k * 0.4) / 4),
    });
  };

  const bmr = useMemo(() => {
    const base = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age;
    return profile.sex === "male" ? base + 5 : base - 161;
  }, [profile]);
  const tdee = Math.round(bmr * profile.activity);

  return (
    <div className="anim-in">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* дневная цель */}
        <section className="card p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-[13px] font-bold">Дневная цель</h2>
            <span className="font-display text-2xl font-extrabold text-carrot tabular-nums">
              {fmt(goals.kcal)} <span className="text-xs font-bold text-faint">ккал</span>
            </span>
          </div>
          <input
            type="range"
            min={1200}
            max={3500}
            step={10}
            value={goals.kcal}
            onChange={(e) => onUpdateGoals({ ...goals, kcal: Number(e.target.value) })}
            className="mt-4 w-full"
          />
          <div className="mt-1 flex justify-between text-[10px] font-semibold text-faint tabular-nums">
            <span>1200</span><span>3500</span>
          </div>
          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-semibold text-soft">Точное значение, ккал</span>
            <input
              className="field tabular-nums"
              inputMode="numeric"
              value={goals.kcal}
              onChange={(e) => {
                const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                if (Number.isFinite(n)) onUpdateGoals({ ...goals, kcal: Math.min(6000, n) });
              }}
            />
          </label>

          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {(
              [
                ["Белки", "p", "var(--color-leaf)", "var(--color-leafwash)"],
                ["Жиры", "f", "var(--color-amber)", "var(--color-amberwash)"],
                ["Углеводы", "c", "var(--color-teal)", "var(--color-tealwash)"],
              ] as const
            ).map(([label, key, color, wash]) => (
              <div key={key} className="rounded-xl px-2 py-2.5 text-center" style={{ background: wash }}>
                <input
                  className="w-full bg-transparent text-center font-display text-base font-bold tabular-nums focus:outline-none"
                  style={{ color }}
                  inputMode="numeric"
                  value={goals[key]}
                  onChange={(e) => {
                    const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                    if (Number.isFinite(n)) onUpdateGoals({ ...goals, [key]: Math.min(999, n) });
                  }}
                />
                <div className="text-[10px] font-semibold" style={{ color }}>{label}, г</div>
              </div>
            ))}
          </div>
        </section>

        {/* калькулятор нормы + профиль */}
        <section className="card p-5">
          <h2 className="font-display text-[13px] font-bold">Калькулятор нормы</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-faint">
            Формула Миффлина — Сан-Жеора. Ваша норма поддержания ≈ <b className="text-ink">{fmt(tdee)} ккал</b>.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <div>
              <span className="mb-1 block text-xs font-semibold text-soft">Пол</span>
              <div className="flex rounded-xl border border-line bg-field p-0.5">
                {(["male", "female"] as Sex[]).map((s) => (
                  <button key={s} onClick={() => onUpdateProfile({ ...profile, sex: s })}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors ${profile.sex === s ? "bg-ink text-paperink" : "text-faint hover:text-soft"}`}>
                    {s === "male" ? "М" : "Ж"}
                  </button>
                ))}
              </div>
            </div>
            {(
              [["Возраст", "age", 10, 120], ["Рост, см", "height", 100, 250], ["Вес, кг", "weight", 30, 400]] as const
            ).map(([label, key, mn, mx]) => (
              <label key={key} className="block">
                <span className="mb-1 block text-xs font-semibold text-soft">{label}</span>
                <input
                  className="field tabular-nums"
                  inputMode="decimal"
                  value={profile[key]}
                  onChange={(e) => {
                    const n = parseFloat(e.target.value.replace(",", "."));
                    if (Number.isFinite(n)) onUpdateProfile({ ...profile, [key]: Math.min(mx, Math.max(mn, n)) });
                  }}
                />
              </label>
            ))}
            <label className="col-span-2 block">
              <span className="mb-1 block text-xs font-semibold text-soft">Активность</span>
              <select
                className="field"
                value={profile.activity}
                onChange={(e) => onUpdateProfile({ ...profile, activity: Number(e.target.value) })}
              >
                {ACTIVITIES.map((a) => (
                  <option key={a.v} value={a.v}>{a.label}</option>
                ))}
              </select>
            </label>
            <label className="col-span-2 block">
              <span className="mb-1 block text-xs font-semibold text-soft">
                Целевой вес, кг <span className="font-normal text-faint">(необязательно — линия на графике)</span>
              </span>
              <input
                className="field tabular-nums"
                inputMode="decimal"
                placeholder="например, 75"
                value={profile.targetWeight ?? ""}
                onChange={(e) => {
                  const raw = e.target.value.replace(",", ".").trim();
                  if (raw === "") return onUpdateProfile({ ...profile, targetWeight: undefined });
                  const n = parseFloat(raw);
                  if (Number.isFinite(n)) onUpdateProfile({ ...profile, targetWeight: Math.min(400, Math.max(30, n)) });
                }}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [["Похудение", 0.85], ["Держать", 1], ["Набор", 1.1]] as const
            ).map(([label, k]) => (
              <button
                key={label}
                onClick={() => applySplit(tdee * k)}
                className="btn-press rounded-full border border-line bg-field px-3.5 py-1.5 text-xs font-bold text-soft hover:border-leaf/50 hover:text-ink"
              >
                {label} · {fmt(Math.round(tdee * k))} ккал
              </button>
            ))}
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-snug text-faint">
            <IAlert width={13} height={13} className="mt-px shrink-0" />
            Кнопки применяют норму и БЖУ (30/30/40) к дневной цели.
          </p>
        </section>
      </div>
    </div>
  );
}
