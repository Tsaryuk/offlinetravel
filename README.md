# Offline.Travel v2

Координация совместных поездок: расписание, места, общие расходы с делением, чат.
Работает как Telegram Mini App внутри бота и как обычное веб-приложение по ссылке.

Версия v1 (один файл `index.html` на ванильном JS) осталась в ветке `main`:
`git show main:index.html`.

## Стек

- Next.js 16 (App Router, Turbopack), React 19, TypeScript
- Tailwind CSS v4 — токены в `src/app/globals.css`
- Supabase (Postgres) — доступ только с сервера, service role
- `@tma.js/sdk-react` + `@tma.js/init-data-node` — Telegram Mini App и проверка подписи
- TanStack Query + persist в IndexedDB — офлайн-кэш и очередь отложенных записей
- Свой service worker (`public/sw.js`) — офлайн-оболочка

## Как устроен доступ к данным

Браузер **никогда** не ходит в базу напрямую. Все запросы идут в `/api/*`,
где на каждый запрос проверяется сессия (JWT в httpOnly-cookie) и членство в поездке.
Ключ Supabase с правами service role живёт только на сервере.
RLS включён на всех таблицах без политик для `anon` — прямой доступ закрыт.

## Локальный запуск

```bash
npm install
cp .env.example .env.local   # заполнить значения
npm run dev
```

Демо-режим без базы и Telegram — данные похода «Дорога в Лавру» в памяти:

```bash
echo "NEXT_PUBLIC_DEMO=1" >> .env.local
npm run dev
```

## Переменные окружения

| Переменная | Зачем |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | доступ к базе с сервера |
| `TELEGRAM_BOT_TOKEN` | проверка подписи initData и отправка сообщений |
| `TELEGRAM_BOT_USERNAME`, `NEXT_PUBLIC_BOT_USERNAME` | ссылки на бота и приглашения |
| `TELEGRAM_WEBHOOK_SECRET` | проверка заголовка вебхука (необязательно, но желательно) |
| `SESSION_SECRET` | подпись сессии, 32+ символа: `openssl rand -hex 32` |
| `APP_URL` | публичный адрес для кнопок бота |
| `CRON_SECRET` | защита `/api/cron/reminders` — утренняя рассылка итогов по долгам (`vercel.json`) |

## Развёртывание

1. Создать проект Supabase, выполнить `supabase/migrations/0001_init.sql`.
2. Задать переменные окружения в Vercel.
3. Задеплоить ветку.
4. Привязать бота:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook?url=$APP_URL/api/bot/webhook&secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

5. В BotFather у бота указать Menu Button → Web App с адресом `$APP_URL`.

## Курсы валют

Берутся с зеркала ЦБ РФ `cbr-xml-daily.ru`, кэшируются в `fx_rates` на 12 часов. Если источник недоступен — используются последние сохранённые; если сохранённых нет, форма расхода честно предупреждает, что сумма будет учтена 1:1.

## Что осталось за рамками первой версии

Документы участников (таблица в схеме есть, интерфейса пока нет), экспорт в PDF,
офлайн-карты, загрузка фото к расходам.
