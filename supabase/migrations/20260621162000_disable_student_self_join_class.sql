create or replace function public.join_class(p_join_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Students are assigned to classes by teachers.';
end;
$$;

revoke execute on function public.join_class(text) from public, anon, authenticated;
