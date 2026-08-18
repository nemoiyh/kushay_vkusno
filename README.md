# Съедено — дневник питания и счётчик калорий

React + Vite + TypeScript приложение. Работает как **PWA** (устанавливается на iPhone/Android из браузера, офлайн) и готово к упаковке в **нативное iOS-приложение для App Store** через Capacitor.

## Что умеет

- Дневник за день: калории, БЖУ, кольца прогресса, вода, 4 приёма пищи
- База из 67 продуктов + свои продукты, живой расчёт по весу порции
- Статистика за 7 дней, серия дней в цели, дневник веса
- Цели с калькулятором нормы (Миффлин — Сан-Жеор), экспорт JSON
- Офлайн: service worker + кэш, данные в localStorage (не покидают устройство)

## Запуск

```bash
npm install
npm run dev       # разработка
npm run build     # прод-сборка в dist/
```

## Как установить на телефон прямо сейчас (без App Store)

Приложение — PWA. Откройте его в браузере:

- **iPhone (Safari):** кнопка «Поделиться» → «На экран „Домой"». Появится иконка, запуск в полноэкранном режиме, работает офлайн.
- **Android (Chrome):** меню ⋮ → «Установить приложение».

## Публикация в App Store (iOS)

Веб-код упаковывается в нативное приложение через **Capacitor** (уже настроен: `capacitor.config.ts`). Понадобится:

1. **Mac** с macOS и установленным **Xcode** (бесплатно, Mac App Store)
2. Аккаунт **Apple Developer** — $99/год (developer.apple.com)

### Шаги

```bash
# 1. Собрать веб-версию
npm run build

# 2. Добавить iOS-платформу (один раз)
npx cap add ios

# 3. Синхронизировать веб-код в нативный проект (после каждого build)
npx cap sync ios

# 4. Открыть проект в Xcode
npx cap open ios
```

Дальше в Xcode:

1. Выбрать target **App** → Signing & Capabilities → указать свою команду разработчика (Team). Xcode создаст provisioning-профиль автоматически.
2. Поменять Bundle ID, если `com.seyedeno.diary` занят (например, `com.вашеимя.seyedeno`).
3. Иконка: заменить содержимое `ios/App/App/Assets.xcassets/AppIcon.appiconset` (наборы размеров до 1024×1024 — сгенерируйте из исходного квадрата 1024×1024 любым «app icon generator», например appicon.co).
4. Product → Archive → Distribute App → App Store Connect.
5. В [App Store Connect](https://appstoreconnect.apple.com) создать приложение, заполнить описание (на русском), приложить скриншоты (6.7" и 5.5"), указать политику конфиденциальности (URL — приложение не собирает данные, достаточно простой страницы) и отправить на ревью.

**Проверка до отправки:** в Xcode подключить iPhone кабелем и нажать Run — приложение поставится как тестовое. Или TestFlight для бета-тестировщиков.

### Требования App Store, о которых стоит знать

- Политика конфиденциальности (URL в App Store Connect). Данные хранятся локально и не отправляются никуда — политика будет короткой.
- Категория: «Здоровье и фитнес».
- Приложение должно приносить пользу без регистрации — наше работает сразу, это плюс для ревью.

## Публикация в Google Play (Android)

Тот же подход: `npx cap add android`, `npx cap sync android`, открыть в Android Studio, собрать подписанный AAB (Build → Generate Signed Bundle). Нужен аккаунт Google Play Console (разовый взнос $25).

## Рекомендации перед релизом

- Для максимальной надёжности хранения внутри нативной оболочки можно подключить `@capacitor/preferences` вместо `localStorage` (в WKWebView localStorage тоже работает и сохраняется, но Preferences API — «родной» способ).
- Заменить `appId` в `capacitor.config.ts` и название приложения `appName`.
- Обновить версию: `CFBundleShortVersionString` в Xcode / `versionName` в Android.

## Структура

```
src/
  components/   — экраны (Дневник, Продукты, Статистика, Цели), модальные окна, UI-кит
  data/foods.ts — база продуктов (КБЖУ на 100 г)
  lib/store.ts  — localStorage, даты, расчёты, демо-данные
public/
  manifest.webmanifest, sw.js — PWA-обвязка (манифест + офлайн-кэш)
capacitor.config.ts — упаковка в iOS/Android
```
