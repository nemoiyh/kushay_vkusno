/// <reference types="vite/client" />
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

// офлайн-режим (PWA): регистрируем service worker в прод-сборке
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => {
        /* офлайн-кэш недоступен — приложение продолжает работать */
      });
  });
}
