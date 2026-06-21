revoke execute on function public.create_class(text, text) from public, anon;
revoke execute on function public.join_class(text) from public, anon;
revoke execute on function public.get_my_class() from public, anon;
revoke execute on function public.get_class_roster() from public, anon;
revoke execute on function public.set_student_display_name(uuid, text) from public, anon;
revoke execute on function public.remove_student_from_class(uuid) from public, anon;
revoke execute on function public.get_class_leaderboard() from public, anon;
revoke execute on function public.get_year_leaderboard() from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.apply_ranked_event(uuid, uuid, text, text, text, boolean, jsonb, integer) from public, anon, authenticated;

grant execute on function public.create_class(text, text) to authenticated;
grant execute on function public.join_class(text) to authenticated;
grant execute on function public.get_my_class() to authenticated;
grant execute on function public.get_class_roster() to authenticated;
grant execute on function public.set_student_display_name(uuid, text) to authenticated;
grant execute on function public.remove_student_from_class(uuid) to authenticated;
grant execute on function public.get_class_leaderboard() to authenticated;
grant execute on function public.get_year_leaderboard() to authenticated;
grant execute on function public.apply_ranked_event(uuid, uuid, text, text, text, boolean, jsonb, integer) to service_role;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists profiles_update_own_safe_fields on public.profiles;
create policy profiles_update_own_safe_fields on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists classes_select_teacher_owned on public.classes;
create policy classes_select_teacher_owned on public.classes
  for select to authenticated using (teacher_id = (select auth.uid()));

drop policy if exists answer_events_select_own on public.answer_events;
create policy answer_events_select_own on public.answer_events
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists progress_select_own on public.progress;
create policy progress_select_own on public.progress
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists daily_stats_select_own on public.progress_daily_stats;
create policy daily_stats_select_own on public.progress_daily_stats
  for select to authenticated using (user_id = (select auth.uid()));
