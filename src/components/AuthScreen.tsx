import { useEffect, useMemo, useRef, useState } from "react";
import type { AppData } from "../types";
import type { SessionUser } from "../lib/auth";
import { vkLoginUrl, saveVkSession, preloadVkSdk, onVkOAuthResult, type VkTokenResponse } from "../lib/vkid";
import {
  AuthError,
  isValidEmail,
  loadAccountData,
  passwordStrength,
  requestReset,
  resetPassword,
  saveAccountData,
  signin,
  signup,
} from "../lib/auth";
import { createFreshState, fmt, isLocallyModified, resetModifiedFlag } from "../lib/store";
import { Modal, Ring } from "./ui";
import {
  IBarcode,
  IBook,
  ICheck,
  IChevL,
  ICloudCheck,
  IEye,
  IEyeOff,
  IFlame,
  ILock,
  IMail,
  IUserIcon,
  IVk,
  LogoMark,
} from "./Icons";

type Mode = "landing" | "login" | "register" | "forgot";

export function AuthScreen({
  localData,
  onDone,
}: {
  localData: AppData;
  onDone: (user: SessionUser, data?: AppData) => void;
}) {
  const [mode, setMode] = useState<Mode>("landing");
  const [merge, setMerge] = useState<{ user: SessionUser; cloud: { data: AppData; syncedAt: number } | null } | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);

  /** после успешной аутентификации — проверяем, нужна ли миграция локальных данных */
  const finish = (user: SessionUser) => {
    const cloud = loadAccountData(user.id);
    if (isLocallyModified()) {
      setMerge({ user, cloud });
    } else if (cloud) {
      onDone(user, cloud.data);
    } else {
      onDone(user);
    }
  };

  /** Успешный вход через VK ID: сохраняем токен/профиль и переходим в приложение */
  const handleVkLogin = (data: VkTokenResponse) => {
    const profile = saveVkSession(data);
    finish({
      id: `vk-${profile.user_id}`,
      email: profile.email ?? `id${profile.user_id}@vk.ru`,
      name: profile.name,
      provider: "vk",
    });
  };

  const localEntries = Object.values(localData.days).reduce((s, d) => s + d.entries.length, 0);

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
            Дневник питания, БЖУ, вода, вес и сон — всё в одном месте. Войдите, чтобы данные
            хранились в аккаунте и не терялись при смене устройства.
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
            {mode === "landing" ? (
              <Landing
                onLogin={() => setMode("login")}
                onRegister={() => setMode("register")}
                onVkLogin={handleVkLogin}
              />
            ) : mode === "login" ? (
              <LoginForm onBack={() => setMode("landing")} onForgot={() => setMode("forgot")} onSwitch={() => setMode("register")} onSuccess={finish} />
            ) : mode === "register" ? (
              <RegisterForm onBack={() => setMode("landing")} onSwitch={() => setMode("login")} onSuccess={finish} onTerms={() => setTermsOpen(true)} />
            ) : (
              <ForgotForm onBack={() => setMode("login")} />
            )}
          </div>
          <p className="mt-3 px-2 text-center text-[11px] leading-relaxed text-faint">
            Вход через ВКонтакте или по email. Данные хранятся в вашем аккаунте.
          </p>
        </section>
      </div>

      {/* миграция локальных данных */}
      {merge && (
        <Modal
          title="У вас есть локальные данные"
          subtitle={
            merge.cloud
              ? `В аккаунте тоже есть данные (от ${new Date(merge.cloud.syncedAt).toLocaleDateString("ru-RU")})`
              : "Сохранить их в аккаунт?"
          }
          onClose={() => setMerge(null)}
        >
          <div className="rounded-xl border border-line bg-paper p-4 text-sm leading-relaxed text-soft">
            В этом браузере ведётся дневник: <b className="text-ink">{fmt(localEntries)}</b>{" "}
            записей и настройки. Объединить их с аккаунтом <b className="text-ink">{merge.user.email}</b>?
          </div>
          <div className="mt-4 flex flex-col gap-2.5">
            <button
              onClick={() => {
                saveAccountData(merge.user.id, localData);
                resetModifiedFlag();
                const u = merge.user;
                setMerge(null);
                onDone(u);
              }}
              className="btn-press flex items-center justify-center gap-2 rounded-xl bg-leaf px-4 py-3 text-sm font-bold text-paperink"
            >
              <ICloudCheck width={17} height={17} /> Да, объединить с аккаунтом
            </button>
            <button
              onClick={() => {
                resetModifiedFlag();
                const u = merge.user;
                const c = merge.cloud;
                setMerge(null);
                onDone(u, c ? c.data : createFreshState());
              }}
              className="btn-press rounded-xl border border-line bg-field px-4 py-3 text-sm font-bold text-soft hover:text-ink"
            >
              {merge.cloud ? "Нет, использовать данные аккаунта" : "Нет, начать заново"}
            </button>
          </div>
        </Modal>
      )}

      {termsOpen && (
        <Modal title="Политика конфиденциальности" subtitle="Коротко и по делу" onClose={() => setTermsOpen(false)}>
          <div className="space-y-3 text-[13px] leading-relaxed text-soft">
            <p>
              <b className="text-ink">1.</b> Данные дневника питания, веса и настроек хранятся в
              вашем аккаунте и в браузере устройства. Мы не передаём их третьим лицам.
            </p>
            <p>
              <b className="text-ink">2.</b> Для входа через ВКонтакте мы получаем только email и
              имя профиля — ничего лишнего.
            </p>
            <p>
              <b className="text-ink">3.</b> Вы можете в любой момент выгрузить все данные в JSON
              или полностью их удалить.
            </p>
          </div>
          <button
            onClick={() => setTermsOpen(false)}
            className="btn-press mt-5 w-full rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-paperink"
          >
            Понятно
          </button>
        </Modal>
      )}
    </div>
  );
}

/* ---------- лендинг карточки ---------- */

function Landing({
  onLogin,
  onRegister,
  onVkLogin,
}: {
  onLogin: () => void;
  onRegister: () => void;
  onVkLogin: (data: VkTokenResponse) => void;
}) {
  const [navigating, setNavigating] = useState(false);
  const [vkError, setVkError] = useState<string | null>(null);
  const onVkLoginRef = useRef(onVkLogin);
  onVkLoginRef.current = onVkLogin;
  // адрес входа ВКонтакте — обычная ссылка, генерируется один раз при монтировании
  const [loginUrl] = useState(() => vkLoginUrl());

  // предзагружаем SDK (понадобится при возврате для обмена code→токены)
  // и подписываемся на возможный результат из попапа
  useEffect(() => {
    preloadVkSdk();
    const unsub = onVkOAuthResult((data) => onVkLoginRef.current(data));
    return unsub;
  }, []);

  // страховка: если через 10 секунд переход так и не состоялся
  // (браузер или расширение заблокировало навигацию) — сообщаем об ошибке
  useEffect(() => {
    if (!navigating) return;
    const t = window.setTimeout(() => {
      setNavigating(false);
      setVkError(
        "Не удалось открыть ВКонтакте. Проверьте настройки блокировки всплывающих окон или попробуйте войти по Email.",
      );
    }, 10000);
    return () => window.clearTimeout(t);
  }, [navigating]);

  return (
    <div className="anim-in">
      <h2 className="font-display text-lg font-extrabold">Добро пожаловать</h2>
      <p className="mt-1 text-[13px] text-soft">Войдите, чтобы начать вести дневник</p>

      {/* Обычная ссылка на страницу авторизации ВК — синхронная навигация,
          никаких попапов и «вечной загрузки». После входа ВК вернёт нас сюда. */}
      <a
        href={loginUrl}
        onClick={() => {
          setVkError(null);
          setNavigating(true);
        }}
        rel="noopener"
        className="btn-press mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#07f] px-4 py-3.5 text-sm font-bold text-white shadow-[0_4px_0_rgba(0,60,160,0.35)] transition-transform hover:brightness-110"
      >
        {navigating ? (
          <span className="spinner" style={{ borderTopColor: "#fff" }} />
        ) : (
          <IVk width={20} height={20} />
        )}
        {navigating ? "Перенаправляем в ВКонтакте…" : "Войти через ВКонтакте"}
      </a>
      {vkError && (
        <p className="anim-in mt-2.5 rounded-xl border border-danger/35 bg-dangerwash px-3 py-2 text-xs font-semibold leading-relaxed text-danger">
          {vkError}
        </p>
      )}
      {!navigating && !vkError && (
        <p className="mt-2 text-center text-[11px] text-faint">
          Перейдёте на страницу ВКонтакте, а после входа вернётесь сюда
        </p>
      )}

      <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-faint">
        <span className="h-px flex-1 bg-line" />
        или по email
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="flex flex-col gap-2.5">
        <button
          onClick={onLogin}
          className="btn-press rounded-xl bg-leaf px-4 py-3 text-sm font-bold text-paperink"
        >
          Войти
        </button>
        <button
          onClick={onRegister}
          className="btn-press rounded-xl border border-leaf/45 bg-leafwash/50 px-4 py-3 text-sm font-bold text-leafdeep hover:bg-leafwash"
        >
          Зарегистрироваться
        </button>
      </div>
    </div>
  );
}

/* ---------- формы ---------- */

function Field({
  label,
  icon,
  error,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-soft">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint z-10">{icon}</span>
        {children}
      </div>
      {error && <span className="mt-1.5 block text-[11px] font-medium text-danger">{error}</span>}
    </label>
  );
}

function PasswordInput({
  value,
  onChange,
  invalid,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        className={`field pl-10 pr-11 ${invalid ? "field-invalid" : ""}`}
        placeholder="••••••••"
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Скрыть пароль" : "Показать пароль"}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-faint hover:text-ink"
      >
        {show ? <IEyeOff width={16} height={16} /> : <IEye width={16} height={16} />}
      </button>
    </div>
  );
}

function StrengthBar({ password }: { password: string }) {
  const { score, label } = useMemo(() => passwordStrength(password), [password]);
  const colors = ["var(--color-danger)", "var(--color-danger)", "var(--color-amber)", "var(--color-leaf)", "var(--color-leaf)"];
  return (
    <div className="mt-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-1 flex-1 rounded-full transition-colors duration-300"
            style={{ background: password && score > i ? colors[score] : "var(--color-linesoft)" }}
          />
        ))}
      </div>
      {password && (
        <span className="mt-0.5 block text-[10px] font-semibold" style={{ color: colors[score] }}>
          {label}
        </span>
      )}
    </div>
  );
}

function ErrorBanner({ text }: { text: string }) {
  return (
    <div className="anim-in rounded-xl border border-danger/35 bg-dangerwash px-3.5 py-2.5 text-[13px] font-semibold text-danger">
      {text}
    </div>
  );
}

function BackRow({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <button
        onClick={onBack}
        aria-label="Назад"
        className="btn-press grid size-8 place-items-center rounded-lg border border-line bg-field text-soft hover:text-ink"
      >
        <IChevL width={16} height={16} />
      </button>
      <h2 className="font-display text-[15px] font-bold">{title}</h2>
    </div>
  );
}

function LoginForm({
  onBack,
  onForgot,
  onSwitch,
  onSuccess,
}: {
  onBack: () => void;
  onForgot: () => void;
  onSwitch: () => void;
  onSuccess: (u: SessionUser) => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!identifier.trim()) return setError("Введите email или никнейм");
    if (!password) return setError("Введите пароль");
    setBusy(true);
    try {
      onSuccess(await signin(identifier, password, remember));
    } catch (e) {
      setError(e instanceof AuthError ? e.message : "Не удалось войти. Попробуйте ещё раз.");
      setBusy(false);
    }
  };

  return (
    <div className="anim-in">
      <BackRow onBack={onBack} title="Вход" />
      <div className="flex flex-col gap-4">
        {error && <ErrorBanner text={error} />}
        <Field label="Email или никнейм" icon={<IMail width={15} height={15} />}>
          <input
            className="field pl-10"
            type="text"
            placeholder="you@example.ru"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </Field>
        <Field label="Пароль" icon={<ILock width={15} height={15} />}>
          <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
        </Field>
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-soft">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-4 accent-[var(--color-leaf)]"
            />
            Запомнить меня
          </label>
          <button onClick={onForgot} className="text-xs font-bold text-leaf underline-offset-2 hover:underline">
            Забыли пароль?
          </button>
        </div>
        <button
          onClick={submit}
          disabled={busy}
          className="btn-press mt-1 flex items-center justify-center gap-2 rounded-xl bg-leaf px-4 py-3 text-sm font-bold text-paperink disabled:opacity-60"
        >
          {busy && <span className="spinner" style={{ borderTopColor: "var(--color-paperink)" }} />}
          {busy ? "Входим…" : "Войти"}
        </button>
        <p className="text-center text-xs text-soft">
          Нет аккаунта?{" "}
          <button onClick={onSwitch} className="font-bold text-leaf underline-offset-2 hover:underline">
            Зарегистрируйтесь
          </button>
        </p>
      </div>
    </div>
  );
}

function RegisterForm({
  onBack,
  onSwitch,
  onSuccess,
  onTerms,
}: {
  onBack: () => void;
  onSwitch: () => void;
  onSuccess: (u: SessionUser) => void;
  onTerms: () => void;
}) {
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErr, setFieldErr] = useState<{ nickname?: string; email?: string; password?: string; confirm?: string; terms?: string }>({});

  const submit = async () => {
    setError("");
    const fe: typeof fieldErr = {};
    const nick = nickname.trim();
    if (nick && nick.length < 2) fe.nickname = "Никнейм — минимум 2 символа";
    if (!isValidEmail(email)) fe.email = "Похоже, в email опечатка";
    if (password.length < 8) fe.password = "Минимум 8 символов";
    else if (passwordStrength(password).score <= 1) fe.password = "Слабый пароль — добавьте цифры и разный регистр";
    if (confirm !== password) fe.confirm = "Пароли не совпадают";
    if (!terms) fe.terms = "Нужно согласие с политикой конфиденциальности";
    setFieldErr(fe);
    if (Object.keys(fe).length) return;
    setBusy(true);
    try {
      onSuccess(await signup(email, password, nick || undefined));
    } catch (e) {
      setError(e instanceof AuthError ? e.message : "Ошибка сети. Попробуйте ещё раз.");
      setBusy(false);
    }
  };

  return (
    <div className="anim-in">
      <BackRow onBack={onBack} title="Регистрация" />
      <div className="flex flex-col gap-4">
        {error && <ErrorBanner text={error} />}
        <Field label="Никнейм (для входа по нику)" icon={<IUserIcon width={15} height={15} />} error={fieldErr.nickname}>
          <input
            className={`field pl-10 ${fieldErr.nickname ? "field-invalid" : ""}`}
            type="text"
            placeholder="например, anya_fit"
            autoComplete="username"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </Field>
        <Field label="Email" icon={<IMail width={15} height={15} />} error={fieldErr.email}>
          <input
            className={`field pl-10 ${fieldErr.email ? "field-invalid" : ""}`}
            type="email"
            placeholder="you@example.ru"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <div>
          <Field label="Пароль (мин. 8 символов)" icon={<ILock width={15} height={15} />} error={fieldErr.password}>
            <PasswordInput
              value={password}
              onChange={setPassword}
              invalid={!!fieldErr.password}
              autoComplete="new-password"
            />
          </Field>
          <div className="mb-1">
            <StrengthBar password={password} />
          </div>
        </div>
        <Field label="Повторите пароль" icon={<ILock width={15} height={15} />} error={fieldErr.confirm}>
          <PasswordInput value={confirm} onChange={setConfirm} invalid={!!fieldErr.confirm} autoComplete="new-password" />
        </Field>
        <div>
          <label className="flex cursor-pointer items-start gap-2 text-xs font-medium text-soft">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-0.5 size-4 accent-[var(--color-leaf)]"
            />
            <span>
              Согласен с{" "}
              <button type="button" onClick={onTerms} className="font-bold text-leaf underline-offset-2 hover:underline">
                политикой конфиденциальности
              </button>
            </span>
          </label>
          {fieldErr.terms && <span className="mt-1.5 block text-[11px] font-medium text-danger">{fieldErr.terms}</span>}
        </div>
        <button
          onClick={submit}
          disabled={busy}
          className="btn-press mt-1 flex items-center justify-center gap-2 rounded-xl bg-leaf px-4 py-3 text-sm font-bold text-paperink disabled:opacity-60"
        >
          {busy && <span className="spinner" style={{ borderTopColor: "var(--color-paperink)" }} />}
          {busy ? "Создаём аккаунт…" : "Зарегистрироваться"}
        </button>
        <p className="text-center text-xs text-soft">
          Уже есть аккаунт?{" "}
          <button onClick={onSwitch} className="font-bold text-leaf underline-offset-2 hover:underline">
            Войдите
          </button>
        </p>
      </div>
    </div>
  );
}

function ForgotForm({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [localCode, setLocalCode] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    setError("");
    if (!isValidEmail(email)) return setError("Похоже, в email опечатка");
    setBusy(true);
    try {
      setLocalCode(await requestReset(email));
      setStep(2);
    } catch (e) {
      setError(e instanceof AuthError ? e.message : "Ошибка сети");
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setError("");
    if (password.length < 8) return setError("Новый пароль — минимум 8 символов");
    setBusy(true);
    try {
      await resetPassword(email, code, password);
      setStep(3);
    } catch (e) {
      setError(e instanceof AuthError ? e.message : "Ошибка сети");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="anim-in">
      <BackRow onBack={step === 1 ? onBack : () => setStep(1)} title="Восстановление пароля" />
      {error && <div className="mb-3"><ErrorBanner text={error} /></div>}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <p className="text-[13px] leading-relaxed text-soft">
            Укажите email аккаунта — пришлём код для смены пароля.
          </p>
          <Field label="Email" icon={<IMail width={15} height={15} />}>
            <input
              className="field pl-10"
              type="email"
              placeholder="you@example.ru"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <button
            onClick={send}
            disabled={busy}
            className="btn-press flex items-center justify-center gap-2 rounded-xl bg-leaf px-4 py-3 text-sm font-bold text-paperink disabled:opacity-60"
          >
            {busy && <span className="spinner" style={{ borderTopColor: "var(--color-paperink)" }} />}
            Отправить код
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-dashed border-water/50 bg-waterwash/60 p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-water">Ваш код</p>
            <p className="mt-1 text-xs text-soft">В реальной версии код придёт на почту, а здесь он для наглядности:</p>
            <p className="mt-1.5 font-display text-xl font-extrabold tracking-[0.3em] text-ink tabular-nums">{localCode}</p>
          </div>
          <Field label="Код из письма" icon={<ILock width={15} height={15} />}>
            <input
              className="field pl-10 text-center font-bold tracking-widest tabular-nums"
              inputMode="numeric"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </Field>
          <Field label="Новый пароль" icon={<ILock width={15} height={15} />}>
            <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
            <StrengthBar password={password} />
          </Field>
          <button
            onClick={reset}
            disabled={busy}
            className="btn-press flex items-center justify-center gap-2 rounded-xl bg-leaf px-4 py-3 text-sm font-bold text-paperink disabled:opacity-60"
          >
            {busy && <span className="spinner" style={{ borderTopColor: "var(--color-paperink)" }} />}
            Сменить пароль
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="anim-in flex flex-col items-center gap-3 py-4 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-leafwash text-leaf">
            <ICheck width={22} height={22} />
          </span>
          <p className="text-sm font-bold">Пароль обновлён</p>
          <p className="text-xs text-soft">Теперь войдите с новым паролем.</p>
          <button onClick={onBack} className="btn-press mt-1 rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-paperink">
            Вернуться ко входу
          </button>
        </div>
      )}
    </div>
  );
}
