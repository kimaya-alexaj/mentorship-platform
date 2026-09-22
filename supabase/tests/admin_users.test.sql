begin;
select plan(6);

select tests.create_user('alice');
select tests.create_user('bob');

-- Granting admin is a service-role/superuser-only operation, done here
-- as the migration-running role (bypasses RLS as table owner).
insert into public.admin_users (user_id) values (tests.uid('alice'));

select tests.authenticate_as('alice');
select is(
  (select count(*)::int from public.admin_users where user_id = tests.uid('alice')),
  1,
  'an admin can see their own admin_users row'
);
select is(
  public.is_admin(tests.uid('alice')),
  true,
  'is_admin() reports true for a granted admin'
);

select tests.authenticate_as('bob');
select is(
  (select count(*)::int from public.admin_users),
  0,
  'a non-admin cannot see any admin_users rows (not even that alice is one)'
);
select is(
  public.is_admin(tests.uid('bob')),
  false,
  'is_admin() reports false for a non-admin'
);

-- No client role can grant itself admin: there is no insert policy on
-- admin_users at all, so this must fail regardless of who's calling.
select throws_ok(
  $$ insert into public.admin_users (user_id) values (tests.uid('bob')) $$,
  'new row violates row-level security policy for table "admin_users"',
  'bob cannot grant himself admin'
);

-- With RLS enabled and no DELETE policy at all, the row is simply
-- invisible to the delete (0 rows affected, no error) rather than
-- raising an exception.
select tests.authenticate_as('alice');
select is_empty(
  $$ delete from public.admin_users where user_id = tests.uid('alice') returning user_id $$,
  'even an admin cannot revoke admin via the client API (no delete policy)'
);

select * from finish();
rollback;
