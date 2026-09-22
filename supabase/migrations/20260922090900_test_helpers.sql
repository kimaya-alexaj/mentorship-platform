-- Testing infrastructure: pgTAP plus helpers to create fixture users and
-- impersonate them, so RLS policies can be exercised as the actual
-- `authenticated` Postgres role rather than as the superuser running the
-- migration. Lives in its own `tests` schema, which is not in
-- supabase/config.toml's exposed API schemas, so none of this is
-- reachable from the client API in any environment.
create extension if not exists pgtap with schema extensions;

create schema if not exists tests;

-- Unlike the `public` schema, a freshly created schema does not grant
-- USAGE to anon/authenticated by default. Tests call tests.uid(...) and
-- tests.authenticate_as(...) *after* switching role to authenticated (or
-- anon), so those roles need to be able to resolve objects in this
-- schema, or the calls fail with "permission denied for schema tests".
grant usage on schema tests to anon, authenticated, service_role;

-- Maps a short human label ("mentor1", "admin") to the fixture user's id
-- for the lifetime of one test transaction, so test files can refer to
-- fixtures by name instead of threading uuids through psql variables.
create table tests.users (
  label text primary key,
  user_id uuid not null
);

create or replace function tests.create_user(
  p_label text,
  p_is_adult boolean default true,
  p_display_name text default null
) returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  values (
    v_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    p_label || '@example.test',
    crypt('correct-horse-battery-staple', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('is_adult', p_is_adult, 'display_name', coalesce(p_display_name, p_label)),
    now(),
    now()
  );

  insert into tests.users (label, user_id) values (p_label, v_id);

  return v_id;
end;
$$;

-- SECURITY DEFINER so this works after a test has switched role to
-- authenticated/anon, without needing to grant those roles direct SELECT
-- on tests.users.
create or replace function tests.uid(p_label text)
returns uuid
language sql
stable
security definer
set search_path = tests
as $$
  select user_id from tests.users where label = p_label;
$$;

-- Switches the current session to look like an authenticated request
-- from the given fixture user: sets the Postgres role RLS policies
-- check via `to authenticated`, and the request.jwt.claims GUC that
-- auth.uid() reads its `sub` claim from.
create or replace function tests.authenticate_as(p_label text)
returns void
language plpgsql
as $$
declare
  v_id uuid := tests.uid(p_label);
begin
  if v_id is null then
    raise exception 'No test user with label %', p_label;
  end if;
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_id, 'role', 'authenticated')::text,
    true
  );
end;
$$;

create or replace function tests.authenticate_as_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- Drops back to the (superuser) role migrations/fixtures run as, e.g.
-- between creating fixtures and asserting as a specific user.
create or replace function tests.clear_authentication()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;
