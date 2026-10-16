alter table public.exam_member_profiles
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_question_limit integer not null default 12;

alter table public.exam_member_profiles
  drop constraint if exists exam_member_profiles_access_status_check;

alter table public.exam_member_profiles
  add constraint exam_member_profiles_access_status_check
  check (access_status in ('trial','pending','approved','rejected','revoked'));

update public.exam_member_profiles
set access_status = 'trial',
    trial_started_at = coalesce(trial_started_at, now())
where access_status = 'pending';

drop policy if exists exam_profiles_insert_pending_self on public.exam_member_profiles;

create policy exam_profiles_insert_trial_self
  on public.exam_member_profiles
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and role = 'member'
    and access_status = 'trial'
  );

create table if not exists public.exam_trial_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  selected_option smallint not null check (selected_option between 0 and 4),
  is_correct boolean not null,
  created_at timestamptz not null default now(),
  unique (user_id, question_id)
);

alter table public.exam_trial_attempts enable row level security;

grant select, insert on public.exam_trial_attempts to authenticated;

drop policy if exists exam_trial_attempts_select_own_or_admin on public.exam_trial_attempts;
create policy exam_trial_attempts_select_own_or_admin
  on public.exam_trial_attempts
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or (select is_exam_admin())
  );

drop policy if exists exam_trial_attempts_insert_own on public.exam_trial_attempts;
create policy exam_trial_attempts_insert_own
  on public.exam_trial_attempts
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create or replace function public.record_exam_trial_attempt(
  p_question_id text,
  p_selected_option smallint,
  p_is_correct boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_status text;
  v_limit integer;
  v_used integer;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select access_status, trial_question_limit
    into v_status, v_limit
  from public.exam_member_profiles
  where user_id = v_user_id
  for update;

  if v_status is null then
    raise exception 'member_profile_not_found';
  end if;

  if v_status <> 'trial' then
    raise exception 'trial_not_active';
  end if;

  select count(*)::integer
    into v_used
  from public.exam_trial_attempts
  where user_id = v_user_id;

  if v_used >= coalesce(v_limit, 12)
     and not exists (
       select 1
       from public.exam_trial_attempts
       where user_id = v_user_id
         and question_id = p_question_id
     ) then
    raise exception 'trial_complete';
  end if;

  insert into public.exam_trial_attempts (user_id, question_id, selected_option, is_correct)
  values (v_user_id, p_question_id, p_selected_option, p_is_correct)
  on conflict (user_id, question_id) do nothing;

  select count(*)::integer
    into v_used
  from public.exam_trial_attempts
  where user_id = v_user_id;

  return jsonb_build_object(
    'used', v_used,
    'limit', coalesce(v_limit, 12),
    'completed', v_used >= coalesce(v_limit, 12)
  );
end;
$$;

revoke all on function public.record_exam_trial_attempt(text, smallint, boolean) from public;
grant execute on function public.record_exam_trial_attempt(text, smallint, boolean) to authenticated;
