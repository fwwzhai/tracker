-- Rate limit for token-authenticated routes (no auth.uid() there). Service role only.
create function public.bump_ai_usage_for(p_user uuid, p_limit int) returns boolean
language plpgsql security definer set search_path = public as $$
declare d date := (now() at time zone 'Asia/Kuala_Lumpur')::date; c int;
begin
  insert into ai_usage (user_id, date, count) values (p_user, d, 1)
  on conflict (user_id, date) do update set count = ai_usage.count + 1
  returning count into c;
  return c <= p_limit;
end $$;
revoke execute on function public.bump_ai_usage_for from public, anon, authenticated;

-- Web push subscriptions for meal reminders.
create table public.push_subscriptions (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy owner_all on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
