create table if not exists public.public_guest_draws (
  id uuid primary key default gen_random_uuid(),
  local_id text not null,
  fortune_id smallint not null check (fortune_id between 0 and 6),
  tx_hash text not null check (tx_hash ~ '^0x[0-9a-f]{64}$'),
  chain_id integer not null default 10143,
  created_at timestamptz not null default now(),
  unique (chain_id, tx_hash)
);

alter table public.public_guest_draws enable row level security;

drop policy if exists "public_guest_draws_insert_anyone" on public.public_guest_draws;
create policy "public_guest_draws_insert_anyone" on public.public_guest_draws
for insert to anon, authenticated
with check (chain_id = 10143);

create index if not exists public_guest_draws_created_idx
on public.public_guest_draws(created_at desc);

create or replace function public.get_guest_fortune_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      select count(*)::bigint
      from public.public_guest_draws
    )
    +
    (
      select count(*)::bigint
      from public.guest_fortunes
      where not exists (
        select 1
        from public.public_guest_draws
        where public_guest_draws.chain_id = 10143
          and public_guest_draws.tx_hash = guest_fortunes.tx_hash
      )
    );
$$;

revoke all on function public.get_guest_fortune_count() from public;
grant execute on function public.get_guest_fortune_count() to anon, authenticated;
