export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 h-3.5 w-3.5 rounded-full bg-accent" />
      <h1 className="text-[20px] font-medium tracking-[-0.02em]">Нет сети</h1>
      <p className="mt-2 max-w-[280px] text-[14px] leading-relaxed text-ink-2">
        Эта страница ещё не сохранена. Откройте её один раз со связью — дальше она будет работать офлайн.
        Уже загруженные поездки открываются без интернета.
      </p>
    </main>
  );
}
