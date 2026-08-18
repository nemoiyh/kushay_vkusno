import { useMemo, useState } from "react";
import type { AppData, Goals, Profile, Sex } from "../types";
import { fmt, humanDate, round1, todayKey } from "../lib/store";
import { IAlert, IPlus, IScale, ITrash } from "./Icons";

const ACTIVITIES = [
  { v: 1.2, label: "Минимум движения" },
  { v: 1.375, label: "Лёгкая активность, 1–3 тренировки" },
  { v: 1.55, label: "Средняя, 3–5 тренировок" },
  { v: 1.725, label: "Высокая, 6–7 тренировок" },
];

export function GoalsView({
  data,
  onUpdateGoals,
  onUpdateProfile,
  onAddWeight,
  onDeleteWeight,
}: {
  data: AppData;
  onUpdateGoals: (g: Goals) => void;
  onUpdateProfile: (p: Profile) => void;
  onAddWeight: (value: number) => void;
  onDeleteWeight: (date: string) => void;
}) {
  const { goals, profile } = data;
  const [weightInput, setWeightInput] = useState("");
  const [weightErr, setWeightErr] = useState("");

  const kcalFromMacros = Math.round(goals.p * 4 + goals.f * 9 + goals.c * 4);
  const mismatch = Math.abs(kcalFromMacros - goals.kcal) / goals.kcal > 0.1;

  const setGoal = (patch: Partial<Goals>) => onUpdateGoals({ ...goals, ...patch });
  const setProf = (patch: Partial<Profile>) => onUpdateProfile({ ...profile, ...patch });

  const applySplit = (kcal: number) =>
    onUpdateGoals({
      kcal: Math.round(kcal / 10) * 10,
      p: Math.round((kcal * 0.3) / 4),
      f: Math.round((kcal * 0.3) / 9),
      c: Math.round((kcal * 0.4) / 4),
    });

  const tdee = useMemo(() => {
    const bmr =
      10 * profile.weight + 6.25 * profile.height - 5 * profile.age + (profile.sex === "male" ? 5 : -161);
    return Math.round(bmr * profile.activity);
  }, [profile]);

  const addWeight = () => {
    const v = parseFloat(weightInput.replace(",", "."));
    if (!Number.isFinite(v) || v < 30 || v > 400) {
      setWeightErr("Введите вес от 30 до 400 кг");
      return;
    }
    setWeightErr("");
    setWeightInput("");
    onAddWeight(round1(v));
  };

  const weights = useMemo(
    () => [...data.weights].sort((a, b) => b.date.localeCompare(a.date)),
    [data.weights],
  );

  return (
    <div className="anim-in">
      <h1 className="font-display text-xl font-extrabold sm:text-2xl">Цели и профиль</h1>
      <p className="mt-1 text-sm text-soft">Настройте дневную норму — кольца и полосы в дневнике подстроятся</p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* дневная цель */}
        <section className="card p-5">
          <h2 className="font-display text-[13px] font-bold">Дневная цель</h2>

          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-sm font-semibold text-soft">Калории</span>
            <span className="font-display text-2xl font-extrabold text-carrot tabular-nums">
              {fmt(goals.kcal)} <span className="text-xs font-bold text-faint">ккал</span>
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <input
              type="range"
              min={1200}
              max={3500}
              step={50}
              value={goals.kcal}
              onChange={(e) => setGoal({ kcal: Number(e.target.value) })}
              className="flex-1"
              aria-label="Цель по калориям"
            />
            <input
              type="number"
              className="field w-24 text-center font-bold tabular-nums"
              value={goals.kcal}
              min={800}
              max={6000}
              onChange={(e) => setGoal({ kcal: Math.max(0, Math.min(6000, Number(e.target.value) || 0)) })}
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {(
              [
                ["Белки, г", goals.p, "p", "var(--color-leaf)", "var(--color-leafwash)"],
                ["Жиры, г", goals.f, "f", "var(--color-amber)", "var(--color-amberwash)"],
                ["Углеводы, г", goals.c, "c", "var(--color-teal)", "var(--color-tealwash)"],
              ] as const
            ).map(([label, val, key, color, wash]) => (
              <div key={key} className="rounded-xl p-3" style={{ background: wash }}>
                <label className="text-[11px] font-bold" style={{ color }}>{label}</label>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-transparent bg-card px-2 py-1.5 text-center font-display text-base font-bold tabular-nums focus:border-line focus:outline-none"
                  value={val}
                  min={0}
                  max={1000}
                  onChange={(e) => setGoal({ [key]: Math.max(0, Math.min(1000, Number(e.target.value) || 0)) } as Partial<Goals>)}
                />
              </div>
            ))}
          </div>

          <p className={`mt-3 flex items-start gap-1.5 text-[11px] leading-snug ${mismatch ? "text-amber" : "text-faint"}`}>
            {mismatch && <IAlert width={13} height={13} className="mt-px shrink-0" />}
            БЖУ дают ≈ {fmt(kcalFromMacros)} ккал.
            {mismatch
              ? " Заметное расхождение с целью — сбалансируйте макросы."
              : " Расхождение с целью в пределах нормы."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ["Дефицит −15%", 0.85],
              ["Поддержание", 1],
              ["Набор +10%", 1.1],
            ].map(([label, k]) => (
              <button
                key={label as string}
                onClick={() => applySplit(goals.kcal * (k as number))}
                className="btn-press rounded-full border border-line bg-field px-3 py-1.5 text-xs font-semibold text-soft hover:text-ink"
              >
                {label as string}
              </button>
            ))}
          </div>
        </section>

        {/* калькулятор */}
        <section className="card p-5">
          <h2 className="font-display text-[13px] font-bold">Калькулятор нормы</h2>
          <p className="mt-0.5 text-[11px] text-faint">формула Миффлина — Сан-Жеора</p>

          <div className="mt-3 grid grid-cols-2 rounded-xl border border-line bg-field p-1 text-xs font-semibold">
            {(
              [
                ["male", "Мужчина"],
                ["female", "Женщина"],
              ] as [Sex, string][]
            ).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setProf({ sex: v })}
                className={`rounded-lg py-1.5 transition-colors ${profile.sex === v ? "bg-ink text-paperink" : "text-soft hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {(
              [
                ["Возраст", profile.age, "age", 100],
                ["Рост, см", profile.height, "height", 250],
                ["Вес, кг", profile.weight, "weight", 400],
              ] as const
            ).map(([label, val, key, maxV]) => (
              <div key={key}>
                <label className="mb-1 block text-[11px] font-bold text-soft">{label}</label>
                <input
                  type="number"
                  className="field tabular-nums"
                  value={val}
                  min={0}
                  max={maxV}
                  onChange={(e) => setProf({ [key]: Math.max(0, Math.min(maxV, Number(e.target.value) || 0)) } as Partial<Profile>)}
                />
              </div>
            ))}
          </div>
          <label className="mb-1 mt-3 block text-[11px] font-bold text-soft">Активность</label>
          <select
            className="field"
            value={profile.activity}
            onChange={(e) => setProf({ activity: Number(e.target.value) })}
          >
            {ACTIVITIES.map((a) => (
              <option key={a.v} value={a.v}>{a.label}</option>
            ))}
          </select>

          <div className="mt-4 rounded-xl bg-ink p-4 text-paperink">
            <div className="text-[11px] font-semibold uppercase tracking-wider opacity-60">Поддержание веса</div>
            <div className="font-display text-3xl font-extrabold tabular-nums">{fmt(tdee)} ккал</div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ["Похудение", Math.round(tdee * 0.85)],
                ["Держать", tdee],
                ["Набор", Math.round(tdee * 1.1)],
              ].map(([label, v]) => (
                <button
                  key={label as string}
                  onClick={() => applySplit(v as number)}
                  className="btn-press rounded-lg border border-paperink/25 bg-paperink/10 px-2 py-2 text-center hover:bg-paperink/20"
                >
                  <span className="block text-[10px] font-semibold opacity-70">{label}</span>
                  <span className="block font-display text-sm font-bold tabular-nums">{fmt(v as number)}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-snug opacity-60">
              Нажатие установит калории и БЖУ (30/30/40) как дневную цель.
            </p>
          </div>
        </section>

        {/* вес */}
        <section className="card p-5">
          <h2 className="flex items-center gap-1.5 font-display text-[13px] font-bold">
            <IScale width={15} height={15} className="text-soft" /> Дневник веса
          </h2>
          <div className="mt-3 flex gap-2">
            <input
              className={`field flex-1 tabular-nums ${weightErr ? "field-invalid" : ""}`}
              placeholder="Например, 80,5"
              inputMode="decimal"
              value={weightInput}
              onChange={(e) => { setWeightInput(e.target.value); setWeightErr(""); }}
              onKeyDown={(e) => e.key === "Enter" && addWeight()}
            />
            <button
              onClick={addWeight}
              className="btn-press flex items-center gap-1.5 rounded-xl bg-leaf px-4 py-2.5 text-sm font-bold text-paperink"
            >
              <IPlus width={15} height={15} /> Записать
            </button>
          </div>
          {weightErr && <p className="mt-1.5 text-xs font-medium text-danger">{weightErr}</p>}
          {weights.length > 0 ? (
            <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto pr-1">
              {weights.map((w) => (
                <li key={w.date} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-field">
                  <span className="flex-1 text-soft">{humanDate(w.date)} <span className="text-[11px] text-faint">{w.date.split("-").reverse().join(".")}</span></span>
                  <b className="tabular-nums">{w.value.toFixed(1)} кг</b>
                  <button
                    onClick={() => onDeleteWeight(w.date)}
                    aria-label="Удалить замер"
                    className="btn-press grid size-7 place-items-center rounded-md border border-line bg-card text-soft opacity-100 hover:text-danger sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <ITrash width={13} height={13} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-xl bg-paper px-3 py-2.5 text-xs text-faint">
              Замеров пока нет. Первый запишется на сегодня ({humanDate(todayKey())}).
            </p>
          )}
        </section>

      </div>
    </div>
  );
}
