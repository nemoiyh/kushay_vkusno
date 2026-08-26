import { useState } from "react";
import type { AppData } from "../types";
import { AuthError, signin, signup, type User } from "../lib/auth";
import { Ring } from "./ui";
import { ICheck, IEye, IEyeOff, ILock, IUser, LogoMark } from "./Icons";

export function AuthScreen({ onAuthed }: { onAuthed: (user: User, data: AppData) => void }) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-24 top-16 size-72 rounded-full bg-leaf/10 blur-3xl" />
        <div className="absolute -right-20 bottom-10 size-80 rounded-full bg-carrot/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-5xl flex-col items-center gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:gap-14 lg:py-16">
        {/* бренд-часть */}
        <section className="w-full max-w-md text-center lg:max-w-none lg:flex-1 lg:text-left">
          <div className="flex items-center justify-center gap-3 lg:justify-start">
            <LogoMark size={46} />
            <div className="leading-none">
              <div className="font-display text-2xl font-extrabold tracking-wide sm:text-3xl">КУШАЙ ВКУСНО</div>
              <div className="mt-1 text-[11px] font-medium tracking-[0.22em] text-soft">НЕ БУДЕТ ГРУСТНО</div>
            </div>
          </div>

          <h1 className="mt-6 font-display text-[30px] font-extrabold leading-tight sm:text-[38px] lg:text-[42px]">
            Считай калории —<br />
            <span className="text-leaf">живи в удовольствие</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-soft lg:mx-0">
            Дневник питания, БЖУ, вода, вес и сон — всё в одном месте. Создайте аккаунт, и ваши
            данные будут храниться под вашим ником.
          </p>

          <div className="card mx-auto mt-7 flex max-w-md items-center gap-5 p-4 lg:mx-0">
            <Ring size={104} stroke={10} value={1420} max={2000} color="var(--color-leaf)">
              <span className="font-display text-lg font-extrabold tabular-nums">1 420</span>
              <span className="text-[10px] text-faint">из 2 000</span>
            </Ring>
            <div className="flex-1 space-y-2.5 text-left">
              {[
                ["Белки", 62, "var(--color-leaf)", "var(--color-leafwash)"],
                ["Жиры", 41, "var(--color-amber)", "var(--color-amberwash)"],
                ["Углеводы", 128, "var(--color-teal)", "var(--color-tealwash)"],
              ].map(([label, val, color, wash]) => (
                <div key={label as string}>
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span style={{ color: color as string }}>{label}</span>
                    <span className="text-faint tabular-nums">{val} г</span>
                  </div>
                  <div className="mt-0.5 h-1.5 rounded-full" style={{ background: wash as string }}>
                    <div className="h-full rounded-full" style={{ width: `${((val as number) / 160) * 100}%`, background: color as string }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <ul className="mx-auto mt-6 flex max-w-md flex-col gap-2 text-left text-[13px] text-soft lg:mx-0">
            {["Дневник калорий и БЖУ за 10 секунд", "Сканер штрихкодов и база Open Food Facts", "Статистика: вес, шаги, сон, активность"].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-leafwash text-leaf">
                  <ICheck width={11} height={11} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </section>

        {/* карточка входа */}
        <section className="w-full max-w-md">
          <div className="card hard-sm p-6 sm:p-7">
            <AuthForm onAuthed={onAuthed} />
          </div>
          <p className="mt-4 text-center text-[11px] leading-relaxed text-faint">
            Аккаунт и данные хранятся локально в вашем браузере. Пароль не передаётся никуда и
            сохраняется только в виде хэша.
          </p>
        </section>
      </div>
    </div>
  );
}

/* ---------- форма «ник + пароль» ---------- */

type Tab = "login" | "register";

function AuthForm({ onAuthed }: { onAuthed: (user: User, data: AppData) => void }) {
  const [tab, setTab] = useState<Tab>("login");
  const [nick, setNick] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const data = tab === "register" ? await signup(nick, password) : await signin(nick, password);
      onAuthed({ nick: nick.trim().toLowerCase() }, data);
    } catch (e) {
      setError(e instanceof AuthError ? e.message : "Что-то пошло не так. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  };

  const switchTab = (t: Tab) => {
    if (t === tab) return;
    setTab(t);
    setError(null);
  };

  return (
    <div className="anim-in">
      <h2 className="font-display text-lg font-extrabold">Добро пожаловать</h2>
      <p className="mt-1 text-[13px] text-soft">
        {tab === "login" ? "Войдите, чтобы открыть свой дневник" : "Создайте аккаунт за пару секунд"}
      </p>

      {/* переключатель Вход / Регистрация */}
      <div className="mt-4 grid grid-cols-2 rounded-xl border border-line bg-field p-1 text-[13px] font-semibold">
        {(["login", "register"] as const).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`rounded-lg py-1.5 transition-colors ${tab === t ? "bg-ink text-paperink" : "text-soft hover:text-ink"}`}
          >
            {t === "login" ? "Вход" : "Регистрация"}
          </button>
        ))}
      </div>

      <form
        className="mt-4 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field label="Ник" icon={<IUser width={15} height={15} />}>
          <input
            className="field pl-9"
            value={nick}
            onChange={(e) => { setNick(e.target.value); setError(null); }}
            placeholder="например, anna"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </Field>

        <Field label="Пароль" icon={<ILock width={15} height={15} />}>
          <input
            className="field pl-9 pr-10"
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            placeholder={tab === "register" ? "минимум 6 символов" : "ваш пароль"}
            autoComplete={tab === "register" ? "new-password" : "current-password"}
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            aria-label={showPw ? "Скрыть пароль" : "Показать пароль"}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint transition-colors hover:text-ink"
          >
            {showPw ? <IEyeOff width={16} height={16} /> : <IEye width={16} height={16} />}
          </button>
        </Field>

        {error && (
          <p className="anim-in -mt-1 rounded-xl border border-danger/35 bg-dangerwash px-3 py-2 text-xs font-semibold text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="btn-press flex w-full items-center justify-center gap-2 rounded-xl bg-leaf px-4 py-3 text-sm font-bold text-paperink disabled:opacity-60"
        >
          {busy && <span className="spinner" style={{ borderTopColor: "#fff" }} />}
          {tab === "login" ? "Войти" : "Создать аккаунт"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-soft">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">{icon}</span>
        {children}
      </div>
    </label>
  );
}
