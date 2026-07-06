-- ============================================================
--  ROUTINE — Supabase Datenbank-Schema
--  Ausführen: Supabase Dashboard → SQL Editor → New query
--             → alles hier einfügen → Run.
--  Idempotent: kann bei Bedarf erneut ausgeführt werden.
-- ============================================================

-- 1) PROFILES — 1 Zeile pro User, verknüpft mit auth.users
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  settings     jsonb not null default '{}'::jsonb,   -- z.B. { "dark_mode": true }
  created_at   timestamptz not null default now()
);

-- 2) TRACKERS — die frei definierbaren Felder ("eigene Felder")
create table if not exists public.trackers (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  type       text not null check (type in ('boolean','number','scale','time','text')),
  unit       text,                     -- z.B. "min", "kg", "h"
  target     numeric,                  -- optionales Ziel
  icon       text,                     -- optionales Emoji
  position   int  not null default 0,  -- Reihenfolge im Formular
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists trackers_user_idx on public.trackers(user_id);

-- 3) ENTRIES — 1 Tageseintrag pro User + Datum
create table if not exists public.entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, entry_date)
);
create index if not exists entries_user_date_idx on public.entries(user_id, entry_date);

-- 4) ENTRY_VALUES — ein Wert pro Tag + Tracker
create table if not exists public.entry_values (
  id         uuid primary key default gen_random_uuid(),
  entry_id   uuid not null references public.entries(id)  on delete cascade,
  tracker_id uuid not null references public.trackers(id) on delete cascade,
  user_id    uuid not null references auth.users(id)      on delete cascade, -- vereinfacht RLS
  value_bool boolean,
  value_num  numeric,
  value_text text,
  value_time time,
  unique (entry_id, tracker_id)
);
create index if not exists entry_values_entry_idx on public.entry_values(entry_id);

-- ============================================================
--  ROW-LEVEL SECURITY — jeder sieht/ändert NUR seine Daten
-- ============================================================
alter table public.profiles     enable row level security;
alter table public.trackers     enable row level security;
alter table public.entries      enable row level security;
alter table public.entry_values enable row level security;

drop policy if exists "own profile - select" on public.profiles;
drop policy if exists "own profile - update" on public.profiles;
drop policy if exists "own profile - insert" on public.profiles;
create policy "own profile - select" on public.profiles for select using (auth.uid() = id);
create policy "own profile - update" on public.profiles for update using (auth.uid() = id);
create policy "own profile - insert" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "own trackers" on public.trackers;
create policy "own trackers" on public.trackers for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own entries" on public.entries;
create policy "own entries" on public.entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own entry_values" on public.entry_values;
create policy "own entry_values" on public.entry_values for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
--  AUTO-SETUP bei Registrierung:
--  Profil + Default-Tracker automatisch anlegen
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));

  insert into public.trackers (user_id, name, type, unit, icon, position) values
    (new.id, 'Aufstehzeit',      'time',    null,  '⏰', 1),
    (new.id, 'Kalt geduscht',    'boolean', null,  '🚿', 2),
    (new.id, 'Training',         'boolean', null,  '💪', 3),
    (new.id, 'Trainings-Notiz',  'text',    null,  '📝', 4),
    (new.id, 'Programmieren',    'number',  'h',   '💻', 5),
    (new.id, 'Draußen gewesen',  'boolean', null,  '🌳', 6),
    (new.id, 'Minuten draußen',  'number',  'min', '⏱️', 7),
    (new.id, 'Stimmung/Energie', 'scale',   null,  '⚡', 8),
    (new.id, 'Reflexion',        'text',    null,  '💭', 9),
    (new.id, 'Gewicht',          'number',  'kg',  '⚖️', 10);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
--  Fertig. Danach: Frontend mit Project URL + publishable key.
-- ============================================================
