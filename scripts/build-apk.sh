#!/usr/bin/env bash
# Сборка Android-версии «Съедено» (нужны: Node.js, JDK 17+, Android SDK / Android Studio)
set -e
cd "$(dirname "$0")/.."

echo "→ Собираю веб-версию…"
npm run build

echo "→ Добавляю android-платформу Capacitor (один раз)…"
npx cap add android 2>/dev/null || echo "  платформа уже добавлена"

echo "→ Синхронизирую веб-код в нативный проект…"
npx cap sync android

echo ""
echo "Готово! Дальше два варианта:"
echo "  1) npx cap open android — открыть в Android Studio → Build → Build APK(s)"
echo "     APK появится в android/app/build/outputs/apk/debug/app-debug.apk"
echo "  2) Собрать подписанный AAB для Google Play: Build → Generate Signed Bundle"
