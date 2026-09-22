-- Profiles hold only public-safe fields. Contact details live in
-- profile_contacts (see 20260922090700_profile_contacts.sql) so that
-- "never expose contact details until matched" can be enforced by RLS
-- on that table, not just by convention in application code.

create extension if not exists "pgcrypto" with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  bio text check (char_length(bio) <= 2000),
  avatar_url text,
  is_mentor boolean not null default false,
  is_mentee boolean not null default false,
  -- IANA timezone identifier, e.g. "Europe/London". All timestamps
  -- elsewhere in the schema are stored in UTC; this is only used to
  -- render times back in the user's local timezone in the UI.
  timezone text not null default 'Etc/UTC',
  languages text[] not null default '{}',
  -- Enforced true by the handle_new_user() trigger below, which refuses
  -- to create a profile (and therefore refuses the whole sign-up) unless
  -- the 18+ confirmation was present at signUp() time. The CHECK is a
  -- second line of defense against this ever being set to false.
  is_adult_confirmed boolean not null default false check (is_adult_confirmed is true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Public-safe profile data. Never add email/phone here; see profile_contacts.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row when a new auth user is created. Also the
-- enforcement point for the 18+ requirement: sign-up fails entirely
-- (the auth.users insert is rolled back) if is_adult isn't confirmed.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce((new.raw_user_meta_data ->> 'is_adult')::boolean, false) is not true then
    raise exception 'You must confirm you are 18 or older to sign up.';
  end if;

  insert into public.profiles (id, display_name, is_adult_confirmed)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    true
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

-- Any signed-in user can browse public profile fields (needed for mentor
-- search). No email/phone lives on this table, so this does not violate
-- the "no contact details before match" rule.
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_insert_self"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- No delete policy: profile deletion happens via auth.users cascade only.
