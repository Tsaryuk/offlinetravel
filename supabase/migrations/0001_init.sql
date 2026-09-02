-- Offline.Travel v2 — базовая схема
-- Доступ к данным только с сервера (service role). RLS включён на всех таблицах
-- без политик для anon/authenticated: клиент напрямую в базу не ходит.

create extension if not exists pgcrypto;

-- ─── Пользователи (из Telegram) ───────────────────────────────────────────
create table users (
  tg_id        bigint primary key,
  first_name   text not null default '',
  last_name    text,
  username     text,
  photo_url    text,
  phone        text,
  city         text,
  bio          text,
  dietary      text,
  created_at   timestamptz not null default now(),
  last_seen    timestamptz
);

-- ─── Поездки ──────────────────────────────────────────────────────────────
create table trips (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  start_date    date not null,
  end_date      date not null,
  description   text,
  base_currency text not null default 'RUB',
  invite_code   text not null unique default encode(gen_random_bytes(6), 'hex'),
  created_by    bigint references users(tg_id),
  created_at    timestamptz not null default now(),
  constraint trips_dates check (end_date >= start_date)
);

create table members (
  trip_id      uuid not null references trips(id) on delete cascade,
  tg_id        bigint not null references users(tg_id),
  role         text not null default 'member' check (role in ('admin', 'member')),
  display_name text,
  joined_at    timestamptz not null default now(),
  primary key (trip_id, tg_id)
);
create index members_tg_idx on members(tg_id);

-- ─── Места и расписание ───────────────────────────────────────────────────
create table places (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips(id) on delete cascade,
  name        text not null,
  address     text,
  lat         double precision,
  lng         double precision,
  description text,
  map_url     text,
  photo_url   text,
  category    text not null default 'other',
  sort_order  int not null default 0,
  created_by  bigint references users(tg_id),
  created_at  timestamptz not null default now()
);
create index places_trip_idx on places(trip_id, sort_order);

create table schedule (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips(id) on delete cascade,
  day         date not null,
  time_start  time not null,
  time_end    time,
  title       text not null,
  description text,
  place_id    uuid references places(id) on delete set null,
  sort_order  int not null default 0,
  created_by  bigint references users(tg_id),
  created_at  timestamptz not null default now()
);
create index schedule_trip_day_idx on schedule(trip_id, day, time_start);

-- ─── Чат ──────────────────────────────────────────────────────────────────
create table messages (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references trips(id) on delete cascade,
  author_tg_id bigint not null references users(tg_id),
  text         text not null,
  is_pinned    boolean not null default false,
  client_id    text unique,
  created_at   timestamptz not null default now()
);
create index messages_trip_idx on messages(trip_id, created_at);

-- ─── Расходы ──────────────────────────────────────────────────────────────
create table expenses (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references trips(id) on delete cascade,
  op_type      text not null default 'expense' check (op_type in ('expense', 'income', 'transfer')),
  paid_by      bigint not null references users(tg_id),
  transfer_to  bigint references users(tg_id),
  amount       numeric(12,2) not null check (amount > 0),
  currency     text not null default 'RUB',
  description  text not null default '',
  category     text not null default 'other',
  split_type   text not null default 'equal' check (split_type in ('equal', 'parts', 'amounts')),
  expense_date date not null default current_date,
  photo_url    text,
  client_id    text unique,
  created_by   bigint references users(tg_id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index expenses_trip_idx on expenses(trip_id, expense_date desc, created_at desc);

create table splits (
  id         uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  tg_id      bigint not null references users(tg_id),
  amount     numeric(12,2) not null check (amount >= 0),
  unique (expense_id, tg_id)
);
create index splits_expense_idx on splits(expense_id);

create table settlements (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references trips(id) on delete cascade,
  from_tg_id bigint not null references users(tg_id),
  to_tg_id   bigint not null references users(tg_id),
  amount     numeric(12,2) not null check (amount > 0),
  currency   text not null default 'RUB',
  client_id  text unique,
  created_by bigint references users(tg_id),
  created_at timestamptz not null default now()
);
create index settlements_trip_idx on settlements(trip_id, created_at desc);

-- ─── Документы участников (файл как data URL, как в v1) ───────────────────
create table documents (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references trips(id) on delete cascade,
  tg_id      bigint not null references users(tg_id),
  name       text not null,
  doc_type   text,
  file_data  text not null,
  created_at timestamptz not null default now()
);
create index documents_trip_idx on documents(trip_id, created_at desc);

-- ─── Коды входа через бота (для открытия по обычной ссылке) ───────────────
create table auth_codes (
  code       text primary key,
  tg_id      bigint references users(tg_id),
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes'
);

-- ─── RLS: всё закрыто для anon/authenticated, доступ только service role ──
do $$
declare t text;
begin
  foreach t in array array['users','trips','members','places','schedule','messages','expenses','splits','settlements','documents','auth_codes']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
