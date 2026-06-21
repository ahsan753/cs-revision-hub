create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  full_name text not null,
  class_id uuid,
  year_group text,
  role text not null default 'student' check (role in ('student', 'teacher')),
  leaderboard_opt_in boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  year_group text not null check (length(trim(year_group)) > 0),
  join_code text not null unique check (join_code = upper(join_code)),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_class_id_fkey
  foreign key (class_id) references public.classes(id) on delete set null;

create unique index if not exists profiles_display_name_class_unique
  on public.profiles(class_id, lower(trim(display_name)))
  where display_name is not null and class_id is not null;

create table if not exists public.content_items (
  item_id text primary key,
  content_kind text not null check (content_kind in ('mcq', 'flashcard', 'code-predict', 'code-fill', 'code-parsons', 'conversion')),
  ranked_activities text[] not null default '{}',
  difficulty smallint not null check (difficulty between 1 and 3),
  answer_key jsonb,
  ranked_enabled boolean not null default false
);

create table if not exists public.answer_events (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references public.content_items(item_id),
  activity text not null check (activity in ('quiz', 'match', 'memory', 'code', 'convert')),
  content_kind text not null,
  correct boolean not null,
  submitted jsonb not null,
  xp_awarded integer not null check (xp_awarded >= 0),
  created_at timestamptz not null default now()
);

create index if not exists answer_events_user_created_idx
  on public.answer_events(user_id, created_at desc);

create table if not exists public.ranked_item_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references public.content_items(item_id),
  attempts integer not null default 0,
  correct_attempts integer not null default 0,
  correct_count integer not null default 0,
  latest_correct boolean not null default false,
  leitner_box integer not null default 1 check (leitner_box between 1 and 5),
  next_due timestamptz not null default '-infinity',
  last_activity text,
  last_attempt_at timestamptz,
  primary key (user_id, item_id)
);

create table if not exists public.progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0,
  level integer not null default 1,
  streak integer not null default 0,
  best_streak integer not null default 0,
  total_answered integer not null default 0,
  last_answer_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.progress_daily_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  xp_gained integer not null default 0,
  answered integer not null default 0,
  primary key (user_id, date)
);

create table if not exists public.ranked_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket_kind text not null check (bucket_kind in ('minute', 'hour')),
  bucket_start timestamptz not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, bucket_kind, bucket_start)
);

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.content_items enable row level security;
alter table public.answer_events enable row level security;
alter table public.ranked_item_progress enable row level security;
alter table public.progress enable row level security;
alter table public.progress_daily_stats enable row level security;
alter table public.ranked_rate_limits enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select, update(leaderboard_opt_in) on public.profiles to authenticated;
grant select on public.classes to authenticated;
grant select on public.answer_events to authenticated;
grant select on public.progress to authenticated;
grant select on public.progress_daily_stats to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated using (auth.uid() = id);

create policy profiles_update_own_safe_fields on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy classes_select_teacher_owned on public.classes
  for select to authenticated using (teacher_id = auth.uid());

create policy answer_events_select_own on public.answer_events
  for select to authenticated using (user_id = auth.uid());

create policy progress_select_own on public.progress
  for select to authenticated using (user_id = auth.uid());

create policy daily_stats_select_own on public.progress_daily_stats
  for select to authenticated using (user_id = auth.uid());

create or replace function private.level_from_xp(p_xp integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select greatest(1, floor(sqrt(greatest(p_xp, 0)::numeric / 90))::integer + 1);
$$;

create or replace function private.name_from_email(p_email text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  local_part text;
  pieces text[];
  piece text;
  result text := '';
begin
  local_part := split_part(coalesce(p_email, ''), '@', 1);
  local_part := split_part(local_part, '+', 1);
  local_part := regexp_replace(local_part, '[._-]+', ' ', 'g');
  pieces := regexp_split_to_array(trim(local_part), '\s+');
  foreach piece in array pieces loop
    if length(piece) > 0 then
      result := trim(result || ' ' || initcap(lower(piece)));
    end if;
  end loop;
  return coalesce(nullif(result, ''), 'Student');
end;
$$;

create or replace function private.require_verified_school_user()
returns auth.users
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user auth.users;
begin
  select * into v_user
  from auth.users
  where id = auth.uid();

  if v_user.id is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if v_user.email_confirmed_at is null then
    raise exception 'Email is not verified' using errcode = '28000';
  end if;
  if lower(split_part(v_user.email, '@', 2)) <> 'student.orbital.education'
     and not exists (
       select 1 from public.profiles p
       where p.id = v_user.id and p.role = 'teacher'
     ) then
    raise exception 'Email domain is not allowed' using errcode = '28000';
  end if;

  return v_user;
end;
$$;

create or replace function private.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() = 'authenticated' and auth.uid() = old.id then
    if new.role is distinct from old.role
      or new.full_name is distinct from old.full_name
      or new.class_id is distinct from old.class_id
      or new.year_group is distinct from old.year_group
      or new.display_name is distinct from old.display_name then
      raise exception 'Protected profile field cannot be changed by student';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns
before update on public.profiles
for each row execute function private.protect_profile_columns();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, full_name, role)
  values (new.id, private.name_from_email(new.email), 'student')
  on conflict (id) do nothing;

  insert into public.progress(user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.hook_restrict_signup_by_email_domain(event jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  email text := event->'user'->>'email';
begin
  if lower(split_part(coalesce(email, ''), '@', 2)) = 'student.orbital.education' then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error',
    jsonb_build_object(
      'http_code', 403,
      'message', 'Use your @student.orbital.education email address.'
    )
  );
end;
$$;

grant execute on function public.hook_restrict_signup_by_email_domain(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_restrict_signup_by_email_domain(jsonb) from anon, authenticated, public;

create or replace function private.generate_join_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i integer;
begin
  loop
    code := 'CS-';
    for i in 1..4 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    end loop;
    exit when not exists (select 1 from public.classes where join_code = code);
  end loop;
  return code;
end;
$$;

create or replace function public.create_class(p_name text, p_year_group text)
returns table(id uuid, name text, year_group text, join_code text)
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
  insert into public.classes(name, year_group, join_code, teacher_id)
  values (trim(p_name), trim(p_year_group), private.generate_join_code(), caller.id)
  returning classes.id, classes.name, classes.year_group, classes.join_code;
end;
$$;

create or replace function public.join_class(p_join_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller auth.users;
  target public.classes;
begin
  caller := private.require_verified_school_user();
  select * into target from public.classes where join_code = upper(trim(p_join_code));
  if target.id is null then
    raise exception 'Class code not found';
  end if;

  update public.profiles
  set class_id = target.id, year_group = target.year_group, display_name = null
  where id = caller.id and role = 'student';

  return target.name;
end;
$$;

create or replace function public.get_my_class()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller auth.users;
  class_name text;
begin
  caller := private.require_verified_school_user();
  select c.name into class_name
  from public.profiles p
  join public.classes c on c.id = p.class_id
  where p.id = caller.id;
  return class_name;
end;
$$;

create or replace function public.get_class_roster()
returns table(student_id uuid, display_name text, full_name text, xp integer)
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
  select p.id, p.display_name, p.full_name, coalesce(pr.xp, 0)
  from public.profiles p
  join public.classes c on c.id = p.class_id
  left join public.progress pr on pr.user_id = p.id
  where c.teacher_id = caller.id
  order by p.full_name;
end;
$$;

create or replace function public.set_student_display_name(p_student_id uuid, p_display_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller auth.users;
begin
  caller := private.require_verified_school_user();
  if not exists (
    select 1
    from public.profiles teacher
    where teacher.id = caller.id and teacher.role = 'teacher'
  ) then
    raise exception 'Teacher role required';
  end if;

  update public.profiles p
  set display_name = nullif(trim(p_display_name), '')
  where p.id = p_student_id
    and exists (
      select 1 from public.classes c
      where c.id = p.class_id and c.teacher_id = caller.id
    );
end;
$$;

create or replace function public.remove_student_from_class(p_student_id uuid)
returns void
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

  update public.profiles p
  set class_id = null, year_group = null, display_name = null
  where p.id = p_student_id
    and exists (
      select 1 from public.classes c
      where c.id = p.class_id and c.teacher_id = caller.id
    );
end;
$$;

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
      p.display_name,
      pr.level,
      pr.xp,
      pr.streak
    from public.profiles p
    join public.progress pr on pr.user_id = p.id
    where p.class_id = caller_class
      and p.leaderboard_opt_in
      and p.display_name is not null
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
      p.display_name,
      pr.level,
      pr.xp,
      pr.streak
    from public.profiles p
    join public.progress pr on pr.user_id = p.id
    where p.year_group = caller_year
      and p.leaderboard_opt_in
      and p.display_name is not null
  ) ranked;
end;
$$;

create or replace function private.apply_ranked_event(
  p_event_id uuid,
  p_user_id uuid,
  p_item_id text,
  p_activity text,
  p_content_kind text,
  p_correct boolean,
  p_submitted jsonb,
  p_difficulty integer
)
returns table(correct boolean, xp_awarded integer, xp integer, level integer, streak integer, best_streak integer, total_answered integer, last_answer_at timestamptz, updated_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  now_ts timestamptz := now();
  school_day date := (now_ts at time zone 'Asia/Qatar')::date;
  previous public.ranked_item_progress;
  next_box integer;
  next_due_ts timestamptz;
  gained integer := 0;
  previous_day date;
  previous_streak integer := 0;
  new_streak integer := 0;
begin
  select * into previous
  from public.ranked_item_progress
  where user_id = p_user_id and item_id = p_item_id
  for update;

  if p_correct and not (previous.correct_count >= 2 and previous.next_due > now_ts) then
    gained := 10 * greatest(1, least(3, p_difficulty));
  end if;

  insert into public.answer_events(id, user_id, item_id, activity, content_kind, correct, submitted, xp_awarded, created_at)
  values (p_event_id, p_user_id, p_item_id, p_activity, p_content_kind, p_correct, p_submitted, gained, now_ts)
  on conflict (id) do nothing;

  if not found then
    return query
    select p_correct, ae.xp_awarded, pr.xp, pr.level, pr.streak, pr.best_streak, pr.total_answered, pr.last_answer_at, pr.updated_at
    from public.answer_events ae
    join public.progress pr on pr.user_id = ae.user_id
    where ae.id = p_event_id;
    return;
  end if;

  next_box := case
    when p_correct then least(5, coalesce(previous.leitner_box, 1) + 1)
    when previous.correct_count >= 2 and previous.next_due > now_ts then coalesce(previous.leitner_box, 1)
    else 1
  end;

  next_due_ts := now_ts + case next_box
    when 1 then interval '0 seconds'
    when 2 then interval '1 day'
    when 3 then interval '3 days'
    when 4 then interval '7 days'
    else interval '16 days'
  end;

  insert into public.ranked_item_progress(user_id, item_id, attempts, correct_attempts, correct_count, latest_correct, leitner_box, next_due, last_activity, last_attempt_at)
  values (
    p_user_id,
    p_item_id,
    1,
    case when p_correct then 1 else 0 end,
    case when p_correct then 1 else 0 end,
    p_correct,
    next_box,
    next_due_ts,
    p_activity,
    now_ts
  )
  on conflict (user_id, item_id) do update set
    attempts = ranked_item_progress.attempts + 1,
    correct_attempts = ranked_item_progress.correct_attempts + case when p_correct then 1 else 0 end,
    correct_count = case
      when p_correct then ranked_item_progress.correct_count + 1
      when ranked_item_progress.correct_count >= 2 and ranked_item_progress.next_due > now_ts then ranked_item_progress.correct_count
      else greatest(0, ranked_item_progress.correct_count - 1)
    end,
    latest_correct = p_correct,
    leitner_box = next_box,
    next_due = next_due_ts,
    last_activity = p_activity,
    last_attempt_at = now_ts;

  select (last_answer_at at time zone 'Asia/Qatar')::date, streak
  into previous_day, previous_streak
  from public.progress
  where user_id = p_user_id
  for update;

  new_streak := case
    when previous_day = school_day then previous_streak
    when previous_day = school_day - 1 then previous_streak + 1
    else 1
  end;

  insert into public.progress(user_id, xp, level, streak, best_streak, total_answered, last_answer_at, updated_at)
  values (
    p_user_id,
    gained,
    private.level_from_xp(gained),
    new_streak,
    new_streak,
    1,
    now_ts,
    now_ts
  )
  on conflict (user_id) do update set
    xp = progress.xp + gained,
    level = private.level_from_xp(progress.xp + gained),
    streak = new_streak,
    best_streak = greatest(progress.best_streak, new_streak),
    total_answered = progress.total_answered + 1,
    last_answer_at = now_ts,
    updated_at = now_ts;

  insert into public.progress_daily_stats(user_id, date, xp_gained, answered)
  values (p_user_id, school_day, gained, 1)
  on conflict (user_id, date) do update set
    xp_gained = progress_daily_stats.xp_gained + gained,
    answered = progress_daily_stats.answered + 1;

  return query
  select p_correct, gained, pr.xp, pr.level, pr.streak, pr.best_streak, pr.total_answered, pr.last_answer_at, pr.updated_at
  from public.progress pr
  where pr.user_id = p_user_id;
end;
$$;

revoke all on function private.apply_ranked_event(uuid, uuid, text, text, text, boolean, jsonb, integer) from public, anon, authenticated;

create or replace function public.apply_ranked_event(
  p_event_id uuid,
  p_user_id uuid,
  p_item_id text,
  p_activity text,
  p_content_kind text,
  p_correct boolean,
  p_submitted jsonb,
  p_difficulty integer
)
returns table(correct boolean, xp_awarded integer, xp integer, level integer, streak integer, best_streak integer, total_answered integer, last_answer_at timestamptz, updated_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  select *
  from private.apply_ranked_event(
    p_event_id,
    p_user_id,
    p_item_id,
    p_activity,
    p_content_kind,
    p_correct,
    p_submitted,
    p_difficulty
  );
$$;

revoke all on function public.apply_ranked_event(uuid, uuid, text, text, text, boolean, jsonb, integer) from public, anon, authenticated;
grant execute on function public.apply_ranked_event(uuid, uuid, text, text, text, boolean, jsonb, integer) to service_role;

grant execute on function public.create_class(text, text) to authenticated;
grant execute on function public.join_class(text) to authenticated;
grant execute on function public.get_my_class() to authenticated;
grant execute on function public.get_class_roster() to authenticated;
grant execute on function public.set_student_display_name(uuid, text) to authenticated;
grant execute on function public.remove_student_from_class(uuid) to authenticated;
grant execute on function public.get_class_leaderboard() to authenticated;
grant execute on function public.get_year_leaderboard() to authenticated;

revoke execute on all functions in schema private from anon, authenticated, public;
