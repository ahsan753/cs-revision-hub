alter table public.profiles
  add column if not exists login_username text;

create unique index if not exists profiles_login_username_unique
  on public.profiles(lower(login_username))
  where login_username is not null;

update public.profiles p
set login_username = lower(split_part(u.email, '@', 1))
from auth.users u
where u.id = p.id
  and p.login_username is null
  and lower(split_part(u.email, '@', 2)) in ('student.orbital.education', 'csrevisionhub.local');

create or replace function private.require_verified_school_user()
returns auth.users
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user auth.users;
  v_domain text;
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

  v_domain := lower(split_part(v_user.email, '@', 2));
  if v_domain not in ('student.orbital.education', 'csrevisionhub.local')
     and not exists (
       select 1 from public.profiles p
       where p.id = v_user.id and p.role = 'teacher'
     ) then
    raise exception 'Email domain is not allowed' using errcode = '28000';
  end if;

  return v_user;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, full_name, role, login_username)
  values (
    new.id,
    private.name_from_email(new.email),
    'student',
    case
      when lower(split_part(new.email, '@', 2)) = 'student.orbital.education'
        or lower(split_part(new.email, '@', 2)) = 'csrevisionhub.local'
        then lower(split_part(new.email, '@', 1))
      else null
    end
  )
  on conflict (id) do nothing;

  insert into public.progress(user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
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
      or new.display_name is distinct from old.display_name
      or new.login_username is distinct from old.login_username then
      raise exception 'Protected profile field cannot be changed by student';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.get_teacher_student_accounts()
returns table(
  student_id uuid,
  username text,
  display_name text,
  full_name text,
  class_id uuid,
  class_name text,
  xp integer
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
    p.id,
    p.login_username,
    p.display_name,
    p.full_name,
    c.id,
    c.name,
    coalesce(pr.xp, 0)
  from public.profiles p
  join public.classes c on c.id = p.class_id
  left join public.progress pr on pr.user_id = p.id
  where c.teacher_id = caller.id
    and p.role = 'student'
  order by c.name, p.full_name;
end;
$$;

grant execute on function public.get_teacher_student_accounts() to authenticated;

create or replace function public.hook_restrict_signup_by_email_domain(event jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  email text := event->'user'->>'email';
  domain text := lower(split_part(coalesce(email, ''), '@', 2));
begin
  if domain in ('student.orbital.education', 'csrevisionhub.local') then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error',
    jsonb_build_object(
      'http_code', 403,
      'message', 'Use your school email address or teacher-created CS Revision Hub login.'
    )
  );
end;
$$;

grant execute on function public.hook_restrict_signup_by_email_domain(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_restrict_signup_by_email_domain(jsonb) from anon, authenticated, public;
