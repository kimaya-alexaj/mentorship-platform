create table public.skill_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.skill_categories (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Alternate names/terms used to help search find this skill, e.g.
  -- "JS" and "ECMAScript" for "JavaScript".
  synonyms text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (category_id, name)
);

create index skills_category_id_idx on public.skills (category_id);
create index skills_synonyms_gin_idx on public.skills using gin (synonyms);

alter table public.skill_categories enable row level security;
alter table public.skills enable row level security;

-- Skills taxonomy is not sensitive and is useful to show to signed-out
-- visitors browsing what the platform covers, so it's readable by anon
-- and authenticated alike. It's written only via migrations/seed data
-- (service role), so there are no insert/update/delete policies.
create policy "skill_categories_select_all"
  on public.skill_categories for select
  to anon, authenticated
  using (true);

create policy "skills_select_all"
  on public.skills for select
  to anon, authenticated
  using (true);
