create or replace function public.get_verified_fortune_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint from public.fortunes where chain_id = 10143;
$$;

revoke all on function public.get_verified_fortune_count() from public;
grant execute on function public.get_verified_fortune_count() to anon, authenticated;
