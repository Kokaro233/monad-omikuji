create or replace function public.get_guest_fortune_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint from public.guest_fortunes;
$$;

revoke all on function public.get_guest_fortune_count() from public;
grant execute on function public.get_guest_fortune_count() to anon, authenticated;
