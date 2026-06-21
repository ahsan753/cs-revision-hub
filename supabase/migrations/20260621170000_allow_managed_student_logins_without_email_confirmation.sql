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

  v_domain := lower(split_part(v_user.email, '@', 2));
  if v_user.email_confirmed_at is null
     and not (
       v_domain = 'csrevisionhub.local'
       and exists (
         select 1 from public.profiles p
         where p.id = v_user.id
           and p.role = 'student'
           and p.login_username is not null
       )
     ) then
    raise exception 'Account is not ready for ranked XP' using errcode = '28000';
  end if;

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
