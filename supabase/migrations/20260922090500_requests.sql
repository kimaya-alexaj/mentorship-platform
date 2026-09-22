create type public.request_status as enum ('pending', 'accepted', 'declined', 'cancelled');

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null references public.profiles (id) on delete cascade,
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  skill_id uuid references public.skills (id) on delete set null,
  message text not null check (char_length(trim(message)) between 1 and 2000),
  status public.request_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (mentee_id <> mentor_id)
);

create index requests_mentor_id_idx on public.requests (mentor_id);
create index requests_mentee_id_idx on public.requests (mentee_id);
create index requests_status_idx on public.requests (status);

-- RLS decides *who* can touch a row; this trigger decides which status
-- transitions are legal and *which side* of the request may make them,
-- since that's a business rule RLS's per-row USING/WITH CHECK can't
-- express cleanly (it needs the pre-update row plus the caller's role in
-- the same expression).
create or replace function public.enforce_request_transition()
returns trigger
language plpgsql
as $$
begin
  if new.mentee_id <> old.mentee_id or new.mentor_id <> old.mentor_id then
    raise exception 'Cannot reassign a request to a different mentor or mentee.';
  end if;

  if old.status = new.status then
    return new;
  end if;

  if old.status <> 'pending' then
    raise exception 'Request has already been responded to.';
  end if;

  if new.status = 'cancelled' then
    if auth.uid() <> old.mentee_id then
      raise exception 'Only the mentee may cancel a pending request.';
    end if;
  elsif new.status in ('accepted', 'declined') then
    if auth.uid() <> old.mentor_id then
      raise exception 'Only the mentor may accept or decline a request.';
    end if;
    new.responded_at = now();
  else
    raise exception 'Invalid status transition to %', new.status;
  end if;

  return new;
end;
$$;

create trigger requests_enforce_transition
  before update on public.requests
  for each row execute function public.enforce_request_transition();

alter table public.requests enable row level security;

create policy "requests_select_participant_or_admin"
  on public.requests for select
  to authenticated
  using (mentee_id = auth.uid() or mentor_id = auth.uid() or public.is_admin(auth.uid()));

-- Only the mentee can open a request, only for themselves, and only in
-- the initial 'pending' state.
create policy "requests_insert_mentee"
  on public.requests for insert
  to authenticated
  with check (
    mentee_id = auth.uid()
    and status = 'pending'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_mentee)
    and exists (select 1 from public.profiles p where p.id = mentor_id and p.is_mentor)
  );

-- Either participant may update their own request; enforce_request_transition
-- narrows this down to the specific transitions each side is allowed to make.
create policy "requests_update_participant"
  on public.requests for update
  to authenticated
  using (mentee_id = auth.uid() or mentor_id = auth.uid())
  with check (mentee_id = auth.uid() or mentor_id = auth.uid());

-- No delete policy: requests are kept as a record of what happened.
