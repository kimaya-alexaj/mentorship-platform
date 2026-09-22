create type public.match_status as enum ('active', 'ended');

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests (id) on delete cascade,
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  mentee_id uuid not null references public.profiles (id) on delete cascade,
  status public.match_status not null default 'active',
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create index matches_mentor_id_idx on public.matches (mentor_id);
create index matches_mentee_id_idx on public.matches (mentee_id);

-- True if the two profiles have (or had) an active match. Used by
-- profile_contacts' RLS policy to decide when contact info may be
-- revealed. SECURITY DEFINER so it can read matches regardless of the
-- caller's own row-level access to that table.
create or replace function public.has_accepted_match(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.matches m
    where m.status = 'active'
      and ((m.mentor_id = a and m.mentee_id = b) or (m.mentor_id = b and m.mentee_id = a))
  );
$$;

-- Creates the match the moment a request is accepted. SECURITY DEFINER
-- so it can insert into matches, which otherwise has no client-facing
-- insert policy (matches are never created directly by a client).
create or replace function public.create_match_on_acceptance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    insert into public.matches (request_id, mentor_id, mentee_id)
    values (new.id, new.mentor_id, new.mentee_id)
    on conflict (request_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger requests_create_match_on_acceptance
  after update on public.requests
  for each row execute function public.create_match_on_acceptance();

-- Restrict client updates to ending a match. Without this, the broad
-- ownership check in matches_update_participant would let a participant
-- reassign request_id/mentor_id/mentee_id as long as they kept
-- themselves listed on the resulting row.
create or replace function public.enforce_match_transition()
returns trigger
language plpgsql
as $$
begin
  if new.request_id <> old.request_id
     or new.mentor_id <> old.mentor_id
     or new.mentee_id <> old.mentee_id then
    raise exception 'Cannot reassign a match to a different request, mentor, or mentee.';
  end if;

  if old.status = 'ended' then
    raise exception 'Match has already ended.';
  end if;

  if new.status <> 'ended' then
    raise exception 'The only allowed client update is ending an active match.';
  end if;

  new.ended_at = now();
  return new;
end;
$$;

create trigger matches_enforce_transition
  before update on public.matches
  for each row execute function public.enforce_match_transition();

alter table public.matches enable row level security;

create policy "matches_select_participant_or_admin"
  on public.matches for select
  to authenticated
  using (mentor_id = auth.uid() or mentee_id = auth.uid() or public.is_admin(auth.uid()));

-- No insert policy: matches are only created by create_match_on_acceptance().

create policy "matches_update_participant"
  on public.matches for update
  to authenticated
  using (mentor_id = auth.uid() or mentee_id = auth.uid())
  with check (mentor_id = auth.uid() or mentee_id = auth.uid());
