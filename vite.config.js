import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Относительный базовый путь: сборка работает в ЛЮБОЙ подпапке хостинга —
  // https://ник.github.io/любое_имя_репо/, Netlify, локальный просмотр dist.
  base: "./",
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
  },
});
