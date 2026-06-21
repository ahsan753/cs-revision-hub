drop function if exists public.get_year_leaderboard();

create function public.get_year_leaderboard()
returns table(
  rank bigint,
  display_name text,
  class_name text,
  level integer,
  xp integer,
  streak integer,
  is_me boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller auth.users;
  caller_year text;
begin
  caller := private.require_verified_school_user();
  select p.year_group into caller_year from public.profiles p where p.id = caller.id;
  if caller_year is null then
    return;
  end if;

  return query
  select
    ranked.rank,
    ranked.display_name,
    ranked.class_name,
    ranked.level,
    ranked.xp,
    ranked.streak,
    ranked.user_id = caller.id
  from (
    select
      row_number() over (order by pr.xp desc, pr.streak desc, pr.last_answer_at asc nulls last) as rank,
      p.id as user_id,
      coalesce(nullif(trim(p.display_name), ''), split_part(p.full_name, ' ', 1), 'Student') as display_name,
      c.name as class_name,
      pr.level,
      pr.xp,
      pr.streak
    from public.profiles p
    join public.classes c on c.id = p.class_id
    join public.progress pr on pr.user_id = p.id
    where p.year_group = caller_year
      and p.leaderboard_opt_in
  ) ranked;
end;
$$;

revoke execute on function public.get_year_leaderboard() from public, anon;
grant execute on function public.get_year_leaderboard() to authenticated;
