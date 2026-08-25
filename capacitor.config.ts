import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Конфиг для упаковки веб-приложения «Съедено» в нативное iOS-приложение.
 * Команды: npm run build → npx cap add ios → npx cap sync → npx cap open ios
 * Подробная инструкция — в README.md
 */
const config: CapacitorConfig = {
  appId: "com.seyedeno.diary",
  appName: "Съедено",
  webDir: "dist",
  backgroundColor: "#edf1e6",
  ios: {
    contentInset: "automatic",
    backgroundColor: "#edf1e6",
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    backgroundColor: "#edf1e6",
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
