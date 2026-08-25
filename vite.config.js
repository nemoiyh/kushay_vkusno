import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // относительный базовый путь — сайт работает в любой подпапке (GitHub Pages, Netlify)
  base: "./",
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: { port: 3000 },
  },
});
