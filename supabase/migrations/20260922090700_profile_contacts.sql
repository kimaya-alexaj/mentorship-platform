-- Split from profiles so RLS itself enforces "never expose contact
-- details until a match is accepted" (CLAUDE.md), rather than relying on
-- application code to remember not to select/join this column.
create table public.profile_contacts (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  contact_email text not null check (contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  updated_at timestamptz not null default now()
);

create trigger profile_contacts_set_updated_at
  before update on public.profile_contacts
  for each row execute function public.set_updated_at();

-- Seed a contact row from the auth email as soon as a profile is
-- created, so users don't have to fill it in separately. They can
-- change the contact address later via profile_contacts_update_self.
create or replace function public.handle_new_profile_contact()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profile_contacts (profile_id, contact_email)
  select new.id, u.email
  from auth.users u
  where u.id = new.id
  on conflict (profile_id) do nothing;
  return new;
end;
$$;

create trigger on_profile_created_seed_contact
  after insert on public.profiles
  for each row execute function public.handle_new_profile_contact();

alter table public.profile_contacts enable row level security;

create policy "profile_contacts_select_self_matched_or_admin"
  on public.profile_contacts for select
  to authenticated
  using (
    profile_id = auth.uid()
    or public.is_admin(auth.uid())
    or public.has_accepted_match(auth.uid(), profile_id)
  );

create policy "profile_contacts_insert_self"
  on public.profile_contacts for insert
  to authenticated
  with check (profile_id = auth.uid());

create policy "profile_contacts_update_self"
  on public.profile_contacts for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
