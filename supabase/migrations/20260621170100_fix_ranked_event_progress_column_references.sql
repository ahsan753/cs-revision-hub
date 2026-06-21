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

  select (public.progress.last_answer_at at time zone 'Asia/Qatar')::date,
    public.progress.streak
  into previous_day, previous_streak
  from public.progress
  where public.progress.user_id = p_user_id
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
