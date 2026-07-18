create table if not exists public.verified_fortune_draws (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  fortune_id smallint not null check (fortune_id between 0 and 6),
  tx_hash text not null check (tx_hash ~ '^0x[0-9a-f]{64}$'),
  log_index integer not null,
  block_number numeric(78, 0) not null,
  chain_id integer not null default 10143,
  created_at timestamptz not null,
  indexed_at timestamptz not null default now(),
  unique (chain_id, tx_hash, log_index)
);

alter table public.verified_fortune_draws enable row level security;

drop policy if exists "verified_fortune_draws_public_select" on public.verified_fortune_draws;

create policy "verified_fortune_draws_public_select" on public.verified_fortune_draws
for select using (true);

insert into public.verified_fortune_draws (
  wallet_address,
  fortune_id,
  tx_hash,
  log_index,
  block_number,
  chain_id,
  created_at
)
select
  wallets.wallet_address,
  fortunes.fortune_id,
  fortunes.tx_hash,
  fortunes.log_index,
  fortunes.block_number,
  fortunes.chain_id,
  fortunes.created_at
from public.fortunes
join public.wallets on wallets.id = fortunes.wallet_id
where fortunes.chain_id = 10143
on conflict (chain_id, tx_hash, log_index) do nothing;

create index if not exists verified_fortune_draws_chain_created_idx
on public.verified_fortune_draws(chain_id, created_at desc);

create or replace function public.get_verified_fortune_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint from public.verified_fortune_draws where chain_id = 10143;
$$;

revoke all on function public.get_verified_fortune_count() from public;
grant execute on function public.get_verified_fortune_count() to anon, authenticated;
