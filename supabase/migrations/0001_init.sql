-- Daily Hub schema. Money in integer cents, timestamps in UTC.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  age int, sex text check (sex in ('male','female')),
  height_cm numeric, weight_kg numeric,
  activity text check (activity in ('sedentary','light','moderate','active','very_active')),
  goal text check (goal in ('lose','maintain','gain')),
  kcal_goal int, protein_g int, carb_g int, fat_g int,
  steps_goal int not null default 8000,
  monthly_budget_cents int not null default 0,
  steps_factor numeric not null default 0.04,
  currency text not null default 'MYR',
  units text not null default 'metric',
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  monthly_budget_cents int,
  color text not null default 'ink',
  sort int not null default 0
);

create table public.recurring (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  amount_cents int not null check (amount_cents > 0),
  category_id uuid references public.categories on delete set null,
  note text,
  day_of_month int not null check (day_of_month between 1 and 31),
  last_month text, -- 'YYYY-MM' of the last generated expense
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(), -- client generated for offline idempotency
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  spent_at timestamptz not null default now(),
  amount_cents int not null check (amount_cents > 0),
  category_id uuid references public.categories on delete set null,
  note text,
  recurring_id uuid references public.recurring on delete set null
);
create index expenses_user_time on public.expenses (user_id, spent_at desc);

create table public.presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  label text not null,
  amount_cents int not null check (amount_cents > 0),
  category_id uuid references public.categories on delete set null,
  sort int not null default 0
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  eaten_at timestamptz not null default now(),
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  name text not null,
  kcal int not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  portion numeric not null default 1,
  source text not null check (source in ('photo','text','manual')),
  thumb_url text, -- tiny (<=200px) JPEG data URL, never the original
  raw_json jsonb
);
create index meals_user_time on public.meals (user_id, eaten_at desc);

create table public.steps_daily (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  steps int not null check (steps >= 0),
  source text not null default 'manual',
  primary key (user_id, date)
);

create table public.weights (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  kg numeric not null,
  primary key (user_id, date)
);

create table public.coach_cache (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  text text not null,
  primary key (user_id, date)
);

create table public.food_cache (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  key text not null,
  data jsonb not null,
  primary key (user_id, key)
);

create table public.api_tokens (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now()
);

create table public.ai_usage (
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  count int not null default 0,
  primary key (user_id, date)
);

-- Row level security: every table, owner only.
do $$
declare t text;
begin
  foreach t in array array['categories','recurring','expenses','presets','meals','steps_daily',
                           'weights','coach_cache','food_cache','api_tokens','ai_usage'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy owner_all on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
alter table public.profiles enable row level security;
create policy owner_all on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
-- ai_usage is only written through bump_ai_usage()
revoke insert, update, delete on public.ai_usage from authenticated, anon;

-- New user: profile + default categories.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.categories (user_id, name, color, sort) values
    (new.id, 'Food', 'green', 0), (new.id, 'Transport', 'blue', 1), (new.id, 'Bills', 'ink', 2),
    (new.id, 'Fun', 'orange', 3), (new.id, 'Health', 'red', 4), (new.id, 'Other', 'muted', 5);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Steps merge rule: keep the highest count for a day, never sum.
create function public.upsert_steps(p_user uuid, p_date date, p_steps int, p_source text)
returns void language sql security definer set search_path = public as $$
  insert into steps_daily (user_id, date, steps, source) values (p_user, p_date, p_steps, p_source)
  on conflict (user_id, date) do update
    set steps = greatest(steps_daily.steps, excluded.steps),
        source = case when excluded.steps > steps_daily.steps then excluded.source else steps_daily.source end;
$$;
revoke execute on function public.upsert_steps from public, anon, authenticated;

-- Rate limit for AI routes. Returns false once the daily limit is hit.
create function public.bump_ai_usage(p_limit int) returns boolean
language plpgsql security definer set search_path = public as $$
declare d date := (now() at time zone 'Asia/Kuala_Lumpur')::date; c int;
begin
  insert into ai_usage (user_id, date, count) values (auth.uid(), d, 1)
  on conflict (user_id, date) do update set count = ai_usage.count + 1
  returning count into c;
  return c <= p_limit;
end $$;

-- Add recurring expenses that are due, once per month per rule. Called on app open.
create function public.apply_recurring() returns int
language plpgsql security invoker set search_path = public as $$
declare
  r record; today date := (now() at time zone 'Asia/Kuala_Lumpur')::date;
  m date; due date; added int := 0; start_m date;
begin
  for r in select * from recurring where user_id = auth.uid() loop
    start_m := coalesce((r.last_month || '-01')::date + interval '1 month',
                        date_trunc('month', (r.created_at at time zone 'Asia/Kuala_Lumpur')::date))::date;
    m := start_m;
    while m <= date_trunc('month', today)::date loop
      due := make_date(extract(year from m)::int, extract(month from m)::int,
                       least(r.day_of_month, extract(day from (m + interval '1 month - 1 day'))::int));
      exit when due > today;
      if due >= (r.created_at at time zone 'Asia/Kuala_Lumpur')::date then
        insert into expenses (user_id, spent_at, amount_cents, category_id, note, recurring_id)
        values (r.user_id, (due + time '09:00') at time zone 'Asia/Kuala_Lumpur',
                r.amount_cents, r.category_id, r.note, r.id);
        added := added + 1;
      end if;
      update recurring set last_month = to_char(m, 'YYYY-MM') where id = r.id;
      m := (m + interval '1 month')::date;
    end loop;
  end loop;
  return added;
end $$;
