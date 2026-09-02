// Офлайн-оболочка Offline.Travel.
// Принцип, выученный на прошлой версии: НИКОГДА не подменять ответ API
// пустышкой со статусом 200 — приложение примет её за настоящие данные.
// Данные живут в IndexedDB (TanStack Query persist), здесь только оболочка.

const CACHE = "ot-shell-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE_URL, "/manifest.webmanifest", "/icon.svg"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // API не кэшируем и не подменяем: пусть ошибка сети дойдёт до приложения.
  if (url.pathname.startsWith("/api/")) return;

  // Навигация: сеть, при неудаче — сохранённая страница, иначе офлайн-заглушка.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match(OFFLINE_URL))),
    );
    return;
  }

  // Статика Next: сначала кэш, потом сеть.
  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/icon")) {
    e.respondWith(
      caches.match(req).then((hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        }),
      ),
    );
  }
});
