-- Recurring weekly availability slots, stored in UTC (day-of-week +
-- time-of-day), per CLAUDE.md's "store all times in UTC" rule. The app
-- is responsible for converting to/from the profile's local timezone
-- (profiles.timezone) when rendering or accepting input. A weekly
-- recurrence expressed in UTC will drift by an hour across DST changes
-- observed in the user's local timezone; acceptable for an MVP, revisit
-- if precise local-time recurrence becomes a requirement.
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  -- 0 = Sunday .. 6 = Saturday, matching Postgres's extract(dow ...).
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time_utc time not null,
  end_time_utc time not null,
  created_at timestamptz not null default now(),
  check (end_time_utc > start_time_utc)
);

create index availability_profile_id_idx on public.availability (profile_id);
create index availability_day_of_week_idx on public.availability (day_of_week);

alter table public.availability enable row level security;

-- Readable by any signed-in user: mentor search needs to compare a
-- mentee's availability against candidate mentors' availability.
create policy "availability_select_authenticated"
  on public.availability for select
  to authenticated
  using (true);

create policy "availability_insert_self"
  on public.availability for insert
  to authenticated
  with check (profile_id = auth.uid());

create policy "availability_update_self"
  on public.availability for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "availability_delete_self"
  on public.availability for delete
  to authenticated
  using (profile_id = auth.uid());
