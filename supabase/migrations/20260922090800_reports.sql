create type public.report_status as enum ('open', 'reviewed', 'resolved', 'dismissed');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete cascade,
  match_id uuid references public.matches (id) on delete set null,
  reason text not null check (char_length(trim(reason)) between 1 and 200),
  details text check (char_length(details) <= 4000),
  status public.report_status not null default 'open',
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (reported_user_id is not null or match_id is not null),
  check (reporter_id <> reported_user_id)
);

create index reports_reporter_id_idx on public.reports (reporter_id);
create index reports_status_idx on public.reports (status);

-- Only admins may change a report's review state; reporters cannot edit
-- their own report or mark it reviewed/dismissed.
create or replace function public.enforce_report_transition()
returns trigger
language plpgsql
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only an admin may update a report.';
  end if;
  return new;
end;
$$;

create trigger reports_enforce_transition
  before update on public.reports
  for each row execute function public.enforce_report_transition();

alter table public.reports enable row level security;

create policy "reports_select_reporter_or_admin"
  on public.reports for select
  to authenticated
  using (reporter_id = auth.uid() or public.is_admin(auth.uid()));

create policy "reports_insert_self"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid() and status = 'open');

-- USING allows admins through to the trigger above, which does the real
-- authorization check; a non-admin's update is blocked by the trigger
-- even though this policy alone would also let the reporter attempt one.
create policy "reports_update_admin"
  on public.reports for update
  to authenticated
  using (reporter_id = auth.uid() or public.is_admin(auth.uid()))
  with check (true);

-- No delete policy: reports are kept as a permanent record.
