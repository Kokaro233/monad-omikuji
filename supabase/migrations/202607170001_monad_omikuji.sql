create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null default '御签守护者' check (char_length(username) between 2 and 32),
  avatar text not null default '🌸',
  created_at timestamptz not null default now()
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  wallet_address text not null check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  chain_id integer not null default 10143,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (chain_id, wallet_address)
);

create table if not exists public.fortunes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  fortune_id smallint not null check (fortune_id between 0 and 6),
  fortune_type text not null,
  rarity text not null check (rarity in ('SSR', 'SR', 'R')),
  message text not null,
  tx_hash text not null check (tx_hash ~ '^0x[0-9a-f]{64}$'),
  log_index integer not null,
  block_number numeric(78, 0) not null,
  chain_id integer not null default 10143,
  favorite boolean not null default false,
  created_at timestamptz not null,
  unique (chain_id, tx_hash, log_index)
);

create table if not exists public.wallet_nonces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_address text not null,
  chain_id integer not null,
  nonce uuid not null unique default gen_random_uuid(),
  message text not null,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, avatar)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', '御签守护者'), '🌸')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.fortunes enable row level security;
alter table public.wallet_nonces enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "wallets_select_own" on public.wallets;
drop policy if exists "fortunes_select_own" on public.fortunes;
drop policy if exists "fortunes_update_own" on public.fortunes;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "wallets_select_own" on public.wallets for select using (auth.uid() = user_id);
create policy "fortunes_select_own" on public.fortunes for select using (auth.uid() = user_id);
create policy "fortunes_update_own" on public.fortunes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists wallets_user_id_idx on public.wallets(user_id);
create index if not exists fortunes_user_created_idx on public.fortunes(user_id, created_at desc);
create index if not exists wallet_nonces_expiry_idx on public.wallet_nonces(expires_at) where used_at is null;
