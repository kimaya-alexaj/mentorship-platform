begin;
select plan(9);

-- Sign-up (auth.users insert) must fail outright without 18+ confirmation.
select throws_ok(
  $$ select tests.create_user('minor', p_is_adult => false) $$,
  'You must confirm you are 18 or older to sign up.',
  'sign-up is rejected without 18+ confirmation'
);

-- A confirmed-adult sign-up succeeds and gets an auto-created profile.
select tests.create_user('alice');
select tests.create_user('bob');

select is(
  (select is_adult_confirmed from public.profiles where id = tests.uid('alice')),
  true,
  'profile is auto-created with is_adult_confirmed = true'
);

select is(
  (select display_name from public.profiles where id = tests.uid('alice')),
  'alice',
  'profile display_name defaults from sign-up metadata'
);

-- Any authenticated user can browse public profile fields.
select tests.authenticate_as('bob');
select is(
  (select count(*)::int from public.profiles where id = tests.uid('alice')),
  1,
  'bob can select alice''s public profile fields'
);

-- A user can update their own profile.
select lives_ok(
  $$ update public.profiles set bio = 'Loves teaching Python' where id = tests.uid('bob') $$,
  'bob can update his own profile'
);

-- A user cannot update someone else's profile (RLS filters the row out,
-- so the update simply matches zero rows rather than erroring).
select is_empty(
  $$ update public.profiles set bio = 'hacked' where id = tests.uid('alice') returning id $$,
  'bob cannot update alice''s profile'
);

select is(
  (select bio from public.profiles where id = tests.uid('alice')),
  null,
  'alice''s profile was left unchanged by bob''s update attempt'
);

-- Nobody can flip is_adult_confirmed to false (defense in depth beyond
-- the sign-up trigger).
--
-- throws_ok(sql, arg2, arg3) auto-detects arg2 as a 5-char SQLSTATE vs.
-- a message purely by octet_length(arg2) = 5, and when it *is* 5 chars
-- it forwards arg3 into the errmsg slot (not description) and description
-- comes out NULL -- verified by reading the extension's own source
-- (pg_get_functiondef) after this tripped up '23514' as a shorthand for
-- "code + free-text description". So: match the literal constraint
-- violation message instead, which is long enough to route through the
-- errmsg branch with arg3 correctly landing as the description.
select throws_ok(
  $$ update public.profiles set is_adult_confirmed = false where id = tests.uid('bob') $$,
  'new row for relation "profiles" violates check constraint "profiles_is_adult_confirmed_check"',
  'is_adult_confirmed cannot be set back to false'
);

-- Anonymous (signed-out) visitors cannot read profiles.
select tests.authenticate_as_anon();
select is(
  (select count(*)::int from public.profiles),
  0,
  'anonymous users cannot select any profiles'
);

select * from finish();
rollback;
