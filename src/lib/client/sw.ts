"use client";

/** Регистрирует service worker для офлайн-оболочки. Только в проде. */
export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (process.env.NODE_ENV !== "production") return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // офлайн-режим просто не включится — приложение продолжает работать
    });
  });
}
