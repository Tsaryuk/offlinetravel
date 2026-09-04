"use client";

import {
  init,
  isTMA,
  miniApp,
  viewport,
  backButton,
  swipeBehavior,
  retrieveRawInitData,
  themeParams,
  hapticFeedback,
} from "@tma.js/sdk-react";

let initialized = false;
let inside = false;

/** Инициализирует SDK, если мы внутри Telegram. Безопасно вызывать много раз. */
export function initTelegram(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  try {
    if (!isTMA()) return;
    init();
    inside = true;
    try { miniApp.mount(); } catch { /* недоступно на этой платформе */ }
    try { themeParams.mount(); } catch { /* ignore */ }
    try { backButton.mount(); } catch { /* ignore */ }
    // Вертикальный свайп закрывает Mini App и конфликтует с прокруткой листов
    try {
      swipeBehavior.mount();
      swipeBehavior.disableVertical();
    } catch { /* на старых клиентах метода нет */ }
    viewport
      .mount()
      .then(() => {
        try { viewport.expand(); } catch { /* ignore */ }
        try { viewport.bindCssVars(); } catch { /* ignore */ }
      })
      .catch(() => {});
    try { miniApp.setHeaderColor("#ffffff"); } catch { /* ignore */ }
  } catch {
    inside = false;
  }
}

export function isInsideTelegram(): boolean {
  return inside;
}

/** Сырая строка initData для проверки подписи на сервере; null вне Telegram. */
export function rawInitData(): string | null {
  try {
    return retrieveRawInitData() ?? null;
  } catch {
    return null;
  }
}

/**
 * Показывает кнопку «назад» в шапке Telegram и вызывает cb по нажатию.
 * Возвращает функцию отписки. Вне Telegram — пустышка, но Escape и тап по фону
 * продолжают работать.
 */
export function onBackButton(cb: () => void): () => void {
  if (!inside) return () => {};
  try {
    backButton.show();
    const off = backButton.onClick(cb);
    return () => {
      try { off(); } catch { /* ignore */ }
      try { backButton.hide(); } catch { /* ignore */ }
    };
  } catch {
    return () => {};
  }
}

export function haptic(kind: "light" | "medium" | "success" | "error" = "light"): void {
  try {
    if (!inside) return;
    if (kind === "success" || kind === "error") hapticFeedback.notificationOccurred(kind);
    else hapticFeedback.impactOccurred(kind);
  } catch { /* ignore */ }
}
