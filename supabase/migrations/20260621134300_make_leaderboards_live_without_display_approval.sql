create or replace function public.get_class_leaderboard()
returns table(rank bigint, display_name text, level integer, xp integer, streak integer, is_me boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller auth.users;
  caller_class uuid;
begin
  caller := private.require_verified_school_user();
  select p.class_id into caller_class from public.profiles p where p.id = caller.id;
  if caller_class is null then
    return;
  end if;

  return query
  select ranked.rank, ranked.display_name, ranked.level, ranked.xp, ranked.streak, ranked.user_id = caller.id
  from (
    select
      row_number() over (order by pr.xp desc, pr.streak desc, pr.last_answer_at asc nulls last) as rank,
      p.id as user_id,
      coalesce(nullif(trim(p.display_name), ''), split_part(p.full_name, ' ', 1), 'Student') as display_name,
      pr.level,
      pr.xp,
      pr.streak
    from public.profiles p
    join public.progress pr on pr.user_id = p.id
    where p.class_id = caller_class
      and p.leaderboard_opt_in
  ) ranked;
end;
$$;

create or replace function public.get_year_leaderboard()
returns table(rank bigint, display_name text, level integer, xp integer, streak integer, is_me boolean)
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
  select ranked.rank, ranked.display_name, ranked.level, ranked.xp, ranked.streak, ranked.user_id = caller.id
  from (
    select
      row_number() over (order by pr.xp desc, pr.streak desc, pr.last_answer_at asc nulls last) as rank,
      p.id as user_id,
      coalesce(nullif(trim(p.display_name), ''), split_part(p.full_name, ' ', 1), 'Student') as display_name,
      pr.level,
      pr.xp,
      pr.streak
    from public.profiles p
    join public.progress pr on pr.user_id = p.id
    where p.year_group = caller_year
      and p.leaderboard_opt_in
  ) ranked;
end;
$$;
