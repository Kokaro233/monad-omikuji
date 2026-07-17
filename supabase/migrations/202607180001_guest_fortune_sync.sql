create table if not exists public.guest_fortunes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  local_id text not null,
  fortune_id smallint not null check (fortune_id between 0 and 6),
  tx_hash text not null,
  favorite boolean not null default false,
  created_at timestamptz not null,
  unique (user_id, local_id)
);

alter table public.guest_fortunes enable row level security;

drop policy if exists "guest_fortunes_select_own" on public.guest_fortunes;
drop policy if exists "guest_fortunes_insert_own" on public.guest_fortunes;
drop policy if exists "guest_fortunes_update_own" on public.guest_fortunes;

create policy "guest_fortunes_select_own" on public.guest_fortunes
for select using (auth.uid() = user_id);

create policy "guest_fortunes_insert_own" on public.guest_fortunes
for insert with check (auth.uid() = user_id);

create policy "guest_fortunes_update_own" on public.guest_fortunes
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists guest_fortunes_user_created_idx
on public.guest_fortunes(user_id, created_at desc);
