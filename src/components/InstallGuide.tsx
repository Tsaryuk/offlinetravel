"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

type Platform = "ios" | "android" | "desktop";

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detect(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Открыто ли приложение внутри Telegram — там установка на экран не нужна. */
function inTelegram(): boolean {
  return typeof window !== "undefined" && Boolean((window as Window & { Telegram?: unknown }).Telegram);
}

const STEPS: Record<Platform, { title: string; steps: string[]; note?: string }> = {
  ios: {
    title: "iPhone или iPad",
    steps: [
      "Откройте эту страницу в Safari — из другого браузера установить нельзя",
      "Нажмите кнопку «Поделиться» внизу экрана (квадрат со стрелкой вверх)",
      "Пролистайте список и выберите «На экран „Домой“»",
      "Нажмите «Добавить» в правом верхнем углу",
    ],
    note: "Значок появится среди обычных приложений. Открывается на весь экран, без адресной строки.",
  },
  android: {
    title: "Android",
    steps: [
      "Откройте страницу в Chrome",
      "Нажмите три точки в правом верхнем углу",
      "Выберите «Установить приложение» или «Добавить на главный экран»",
      "Подтвердите установку",
    ],
    note: "Приложение появится в списке программ и будет работать без интернета.",
  },
  desktop: {
    title: "Компьютер",
    steps: [
      "Откройте страницу в Chrome или Edge",
      "Нажмите значок установки в правой части адресной строки",
      "Подтвердите «Установить»",
    ],
  },
};

export function InstallGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // читаем платформу после монтирования: на сервере navigator недоступен
    queueMicrotask(() => {
      setPlatform(detect());
      setInstalled(isStandalone());
    });
    // Android/Chrome: можно предложить установку системным окном
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    setPrompt(null);
    if (outcome === "accepted") {
      toast("Приложение устанавливается");
      onClose();
    }
  }

  const guide = STEPS[platform];

  return (
    <Sheet open={open} onClose={onClose} title="Приложение на телефоне">
      {installed ? (
        <div className="rounded-card bg-good-soft px-4 py-5 text-center">
          <div className="text-[15px] font-medium text-good">Уже установлено</div>
          <div className="mt-1 text-[13px] text-ink-2">Вы открыли приложение с домашнего экрана.</div>
        </div>
      ) : inTelegram() ? (
        <>
          <p className="mb-4 text-[14px] leading-relaxed text-ink-2">
            Сейчас приложение открыто внутри Telegram — это нормально и удобно. Но в походе связь пропадает,
            и надёжнее иметь значок прямо на экране телефона: так приложение открывается мгновенно и работает без сети.
          </p>
          <div className="mb-4 rounded-field bg-surface px-4 py-3 text-[13.5px] leading-relaxed">
            Откройте <span className="font-medium">offlinetravel.vercel.app</span> в браузере телефона
            {platform === "ios" ? " (обязательно в Safari)" : ""} и выполните шаги ниже.
          </div>
          <Steps guide={guide} />
        </>
      ) : (
        <>
          <p className="mb-4 text-[14px] leading-relaxed text-ink-2">
            Установите приложение на телефон — оно откроется на весь экран и будет работать без интернета:
            расписание, места и уже добавленные расходы останутся под рукой.
          </p>
          {prompt && (
            <Button size="lg" className="mb-4" onClick={install}>Установить</Button>
          )}
          <Steps guide={guide} />
        </>
      )}

      <div className="mt-5 rounded-field bg-surface px-4 py-3">
        <div className="text-[13px] font-medium">Что даёт установка</div>
        <ul className="mt-2 space-y-1.5 text-[13px] text-ink-2">
          <li>— Работает без сети: экраны и расходы сохранены в телефоне</li>
          <li>— Добавленное офлайн уходит на сервер, когда появится связь</li>
          <li>— Открывается с домашнего экрана, без поиска ссылки в чате</li>
        </ul>
      </div>
    </Sheet>
  );
}

function Steps({ guide }: { guide: { title: string; steps: string[]; note?: string } }) {
  return (
    <div>
      <div className="mb-2 text-[12px] font-medium text-ink-2">{guide.title}</div>
      <ol className="space-y-2.5">
        {guide.steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-inverse text-[12px] font-medium text-inverse-fg">{i + 1}</span>
            <span className="pt-0.5 text-[14px] leading-snug">{s}</span>
          </li>
        ))}
      </ol>
      {guide.note && <div className="mt-3 text-[12.5px] leading-snug text-ink-3">{guide.note}</div>}
    </div>
  );
}
