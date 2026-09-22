-- Admin role lives in its own table rather than a flag on profiles, so
-- that no RLS policy or client ever has a path to grant itself admin by
-- updating its own row. Granting admin is a service-role-only operation
-- (run from the Supabase SQL editor / a trusted server context):
--   insert into public.admin_users (user_id) values ('<uuid>');

create table public.admin_users (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admin_users is 'Membership-only table; grant/revoke via service role, never via client RLS.';

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users a where a.user_id = uid);
$$;

alter table public.admin_users enable row level security;

-- Users may check their own admin status; admins may see the full list
-- (needed for the admin page). No insert/update/delete policy exists for
-- any client role, so writes are only possible via the service role.
create policy "admin_users_select_self_or_admin"
  on public.admin_users for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));
