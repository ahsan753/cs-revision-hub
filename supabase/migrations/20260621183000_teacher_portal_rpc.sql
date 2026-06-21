create or replace function public.get_teacher_class_summaries()
returns table(
  id uuid,
  name text,
  year_group text,
  student_count integer,
  average_xp integer,
  total_xp integer,
  active_this_week integer,
  latest_activity_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller auth.users;
begin
  caller := private.require_verified_school_user();
  if not exists (select 1 from public.profiles p where p.id = caller.id and p.role = 'teacher') then
    raise exception 'Teacher role required';
  end if;

  return query
  select
    c.id,
    c.name,
    c.year_group,
    count(p.id)::integer as student_count,
    coalesce(round(avg(coalesce(pr.xp, 0)))::integer, 0) as average_xp,
    coalesce(sum(coalesce(pr.xp, 0))::integer, 0) as total_xp,
    count(p.id) filter (where pr.last_answer_at >= now() - interval '7 days')::integer as active_this_week,
    max(pr.last_answer_at) as latest_activity_at
  from public.classes c
  left join public.profiles p
    on p.class_id = c.id
    and p.role = 'student'
  left join public.progress pr on pr.user_id = p.id
  where c.teacher_id = caller.id
  group by c.id, c.name, c.year_group, c.created_at
  order by c.created_at desc;
end;
$$;

grant execute on function public.get_teacher_class_summaries() to authenticated;

create or replace function public.get_teacher_class_roster(p_class_id uuid)
returns table(
  student_id uuid,
  username text,
  display_name text,
  full_name text,
  class_id uuid,
  class_name text,
  xp integer,
  level integer,
  streak integer,
  best_streak integer,
  total_answered integer,
  last_answer_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller auth.users;
begin
  caller := private.require_verified_school_user();
  if not exists (select 1 from public.profiles p where p.id = caller.id and p.role = 'teacher') then
    raise exception 'Teacher role required';
  end if;
  if not exists (select 1 from public.classes c where c.id = p_class_id and c.teacher_id = caller.id) then
    raise exception 'Class not found';
  end if;

  return query
  select
    p.id,
    p.login_username,
    p.display_name,
    p.full_name,
    c.id,
    c.name,
    coalesce(pr.xp, 0),
    coalesce(pr.level, 1),
    coalesce(pr.streak, 0),
    coalesce(pr.best_streak, 0),
    coalesce(pr.total_answered, 0),
    pr.last_answer_at
  from public.profiles p
  join public.classes c on c.id = p.class_id
  left join public.progress pr on pr.user_id = p.id
  where c.id = p_class_id
    and c.teacher_id = caller.id
    and p.role = 'student'
  order by p.full_name;
end;
$$;

grant execute on function public.get_teacher_class_roster(uuid) to authenticated;

create or replace function public.get_teacher_class_activity(p_class_id uuid, p_limit integer default 20)
returns table(
  event_id uuid,
  student_id uuid,
  student_name text,
  item_id text,
  activity text,
  content_kind text,
  correct boolean,
  xp_awarded integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller auth.users;
  safe_limit integer := greatest(1, least(coalesce(p_limit, 20), 50));
begin
  caller := private.require_verified_school_user();
  if not exists (select 1 from public.profiles p where p.id = caller.id and p.role = 'teacher') then
    raise exception 'Teacher role required';
  end if;
  if not exists (select 1 from public.classes c where c.id = p_class_id and c.teacher_id = caller.id) then
    raise exception 'Class not found';
  end if;

  return query
  select
    ae.id,
    p.id,
    p.full_name,
    ae.item_id,
    ae.activity,
    ae.content_kind,
    ae.correct,
    ae.xp_awarded,
    ae.created_at
  from public.answer_events ae
  join public.profiles p on p.id = ae.user_id
  join public.classes c on c.id = p.class_id
  where c.id = p_class_id
    and c.teacher_id = caller.id
    and p.role = 'student'
  order by ae.created_at desc
  limit safe_limit;
end;
$$;

grant execute on function public.get_teacher_class_activity(uuid, integer) to authenticated;

create or replace function public.get_teacher_class_weak_areas(p_class_id uuid)
returns table(
  item_id text,
  attempts integer,
  correct_attempts integer,
  miss_count integer,
  affected_students integer,
  last_attempt_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller auth.users;
begin
  caller := private.require_verified_school_user();
  if not exists (select 1 from public.profiles p where p.id = caller.id and p.role = 'teacher') then
    raise exception 'Teacher role required';
  end if;
  if not exists (select 1 from public.classes c where c.id = p_class_id and c.teacher_id = caller.id) then
    raise exception 'Class not found';
  end if;

  return query
  select
    rip.item_id,
    sum(rip.attempts)::integer as attempts,
    sum(rip.correct_attempts)::integer as correct_attempts,
    sum(greatest(rip.attempts - rip.correct_attempts, 0))::integer as miss_count,
    count(distinct rip.user_id)::integer as affected_students,
    max(rip.last_attempt_at) as last_attempt_at
  from public.ranked_item_progress rip
  join public.profiles p on p.id = rip.user_id
  join public.classes c on c.id = p.class_id
  where c.id = p_class_id
    and c.teacher_id = caller.id
    and p.role = 'student'
    and rip.attempts > rip.correct_attempts
  group by rip.item_id
  order by miss_count desc, attempts desc, last_attempt_at desc nulls last
  limit 12;
end;
$$;

grant execute on function public.get_teacher_class_weak_areas(uuid) to authenticated;
