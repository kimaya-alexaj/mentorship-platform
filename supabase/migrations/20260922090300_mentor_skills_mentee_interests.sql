create table public.mentor_skills (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (mentor_id, skill_id)
);

create table public.mentee_interests (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null references public.profiles (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (mentee_id, skill_id)
);

create index mentor_skills_skill_id_idx on public.mentor_skills (skill_id);
create index mentee_interests_skill_id_idx on public.mentee_interests (skill_id);

alter table public.mentor_skills enable row level security;
alter table public.mentee_interests enable row level security;

-- Mentor skills are effectively public (mentor search needs to filter and
-- display them for any signed-in visitor).
create policy "mentor_skills_select_authenticated"
  on public.mentor_skills for select
  to authenticated
  using (true);

create policy "mentor_skills_insert_self"
  on public.mentor_skills for insert
  to authenticated
  with check (
    mentor_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_mentor
    )
  );

create policy "mentor_skills_delete_self"
  on public.mentor_skills for delete
  to authenticated
  using (mentor_id = auth.uid());

-- Mentee interests are private: only the mentee themself (used to power
-- their own dashboard/future matching) or an admin can see them.
create policy "mentee_interests_select_self_or_admin"
  on public.mentee_interests for select
  to authenticated
  using (mentee_id = auth.uid() or public.is_admin(auth.uid()));

create policy "mentee_interests_insert_self"
  on public.mentee_interests for insert
  to authenticated
  with check (
    mentee_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_mentee
    )
  );

create policy "mentee_interests_delete_self"
  on public.mentee_interests for delete
  to authenticated
  using (mentee_id = auth.uid());
