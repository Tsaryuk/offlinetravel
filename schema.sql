-- Offline.Travel — Supabase Schema
-- Run this in Supabase SQL Editor

-- ═══════════════════════════════════════════
-- TRIPS
-- ═══════════════════════════════════════════
CREATE TABLE trips (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  start_date  date NOT NULL,
  end_date    date NOT NULL,
  description text,
  created_at  timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════
-- TG AUTH CODES
-- ═══════════════════════════════════════════
CREATE TABLE auth_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,
  trip_id     uuid REFERENCES trips(id),
  claimed     boolean DEFAULT false,
  claimed_at  timestamptz,
  tg_id       text,
  tg_name     text,
  tg_username text,
  tg_photo    text,
  created_at  timestamptz DEFAULT now(),
  expires_at  timestamptz DEFAULT (now() + interval '15 minutes')
);

-- ═══════════════════════════════════════════
-- TRIP MEMBERS
-- ═══════════════════════════════════════════
CREATE TABLE members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid REFERENCES trips(id) NOT NULL,
  tg_id       text NOT NULL,
  tg_name     text,
  tg_username text,
  tg_photo    text,
  display_name text,
  role        text NOT NULL DEFAULT 'participant',
  joined_at   timestamptz DEFAULT now(),
  last_seen   timestamptz,
  UNIQUE(trip_id, tg_id)
);

-- ═══════════════════════════════════════════
-- PLACES
-- ═══════════════════════════════════════════
CREATE TABLE places (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid REFERENCES trips(id) NOT NULL,
  name        text NOT NULL,
  address     text,
  lat         double precision,
  lng         double precision,
  description text,
  map_url     text,
  category    text DEFAULT 'other',
  sort_order  int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════
-- SCHEDULE EVENTS
-- ═══════════════════════════════════════════
CREATE TABLE schedule (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid REFERENCES trips(id) NOT NULL,
  day         date NOT NULL,
  time_start  time NOT NULL,
  time_end    time,
  title       text NOT NULL,
  description text,
  place_id    uuid REFERENCES places(id),
  sort_order  int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════
-- MESSAGES
-- ═══════════════════════════════════════════
CREATE TABLE messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid REFERENCES trips(id) NOT NULL,
  author_tg_id text NOT NULL,
  author_name text,
  text        text NOT NULL,
  is_pinned   boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════
-- EXPENSES
-- ═══════════════════════════════════════════
CREATE TABLE expenses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid REFERENCES trips(id) NOT NULL,
  paid_by     text NOT NULL,
  amount      numeric(12,2) NOT NULL,
  description text NOT NULL,
  category    text DEFAULT 'other',
  split_type  text DEFAULT 'equal',
  op_type     text NOT NULL DEFAULT 'expense',
  currency    text NOT NULL DEFAULT 'RUB',
  expense_date date,
  transfer_to text,
  photo_url   text,
  created_at  timestamptz DEFAULT now(),
  created_by  text
);

-- ═══════════════════════════════════════════
-- EXPENSE SPLITS
-- ═══════════════════════════════════════════
CREATE TABLE splits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id  uuid REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
  member_tg_id text NOT NULL,
  amount      numeric(12,2) NOT NULL
);

-- ═══════════════════════════════════════════
-- SETTLEMENTS
-- ═══════════════════════════════════════════
CREATE TABLE settlements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid REFERENCES trips(id) NOT NULL,
  from_tg_id  text NOT NULL,
  to_tg_id    text NOT NULL,
  amount      numeric(12,2) NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════
-- CHECK-INS
-- ═══════════════════════════════════════════
CREATE TABLE checkins (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid REFERENCES trips(id) NOT NULL,
  member_tg_id text NOT NULL,
  place_id    uuid REFERENCES places(id),
  checked_in_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════
CREATE INDEX idx_auth_codes_code ON auth_codes(code);
CREATE INDEX idx_members_trip ON members(trip_id);
CREATE INDEX idx_members_tg ON members(tg_id);
CREATE INDEX idx_schedule_trip_day ON schedule(trip_id, day);
CREATE INDEX idx_messages_trip ON messages(trip_id, created_at DESC);
CREATE INDEX idx_expenses_trip ON expenses(trip_id, created_at DESC);
CREATE INDEX idx_splits_expense ON splits(expense_id);
CREATE INDEX idx_checkins_trip ON checkins(trip_id, checked_in_at DESC);

-- ═══════════════════════════════════════════
-- RLS (permissive for small group app)
-- ═══════════════════════════════════════════
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all" ON trips FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON auth_codes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON members FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON places FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON schedule FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON messages FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON expenses FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON splits FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON settlements FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON checkins FOR ALL TO anon USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════
-- ENABLE REALTIME
-- ═══════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE checkins;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE splits;
ALTER PUBLICATION supabase_realtime ADD TABLE settlements;
