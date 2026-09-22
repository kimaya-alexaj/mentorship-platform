begin;
select plan(8);

select tests.create_user('reporter');
select tests.create_user('reported');
select tests.create_user('admin1');
select tests.create_user('bystander');

insert into public.admin_users (user_id) values (tests.uid('admin1'));

select tests.authenticate_as('reporter');
select lives_ok(
  format(
    $$ insert into public.reports (reporter_id, reported_user_id, reason)
       values (%L, %L, 'Inappropriate messages') $$,
    tests.uid('reporter'), tests.uid('reported')
  ),
  'a user can file a report against another user'
);

-- A report must reference a user or a match.
select throws_ok(
  format(
    $$ insert into public.reports (reporter_id, reason) values (%L, 'No target') $$,
    tests.uid('reporter')
  ),
  'a report with neither a reported user nor a match is rejected'
);

-- Nobody can file a report "as" someone else.
select tests.authenticate_as('bystander');
select throws_ok(
  format(
    $$ insert into public.reports (reporter_id, reported_user_id, reason)
       values (%L, %L, 'Impersonated report') $$,
    tests.uid('reporter'), tests.uid('reported')
  ),
  'new row violates row-level security policy for table "reports"',
  'a user cannot file a report as someone else'
);

-- Only the reporter and admins can see the report.
select is(
  (select count(*)::int from public.reports where reporter_id = tests.uid('reporter')),
  0,
  'an unrelated user cannot see someone else''s report'
);

select tests.authenticate_as('reporter');
select is(
  (select count(*)::int from public.reports where reporter_id = tests.uid('reporter')),
  1,
  'the reporter can see their own report'
);

-- The reporter cannot mark their own report reviewed/dismissed.
select throws_ok(
  $$ update public.reports set status = 'dismissed' where reporter_id = tests.uid('reporter') $$,
  'Only an admin may update a report.',
  'the reporter cannot change their report''s review status'
);

select tests.authenticate_as('admin1');
select is(
  (select count(*)::int from public.reports),
  1,
  'an admin can see all reports'
);

select lives_ok(
  format(
    $$ update public.reports set status = 'reviewed', reviewed_by = %L, reviewed_at = now()
       where reporter_id = %L $$,
    tests.uid('admin1'), tests.uid('reporter')
  ),
  'an admin can mark a report reviewed'
);

select * from finish();
rollback;
