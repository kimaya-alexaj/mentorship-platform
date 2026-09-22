begin;
select plan(6);

select tests.create_user('mentor1');
select tests.create_user('bystander');

select tests.authenticate_as('mentor1');
select lives_ok(
  $$ insert into public.availability (profile_id, day_of_week, start_time_utc, end_time_utc)
     values (tests.uid('mentor1'), 1, '09:00', '11:00') $$,
  'a user can add their own availability slot'
);

select throws_ok(
  $$ insert into public.availability (profile_id, day_of_week, start_time_utc, end_time_utc)
     values (tests.uid('mentor1'), 1, '11:00', '09:00') $$,
  'end_time_utc must be after start_time_utc'
);

select tests.authenticate_as('bystander');
select throws_ok(
  $$ insert into public.availability (profile_id, day_of_week, start_time_utc, end_time_utc)
     values (tests.uid('mentor1'), 2, '09:00', '11:00') $$,
  'new row violates row-level security policy for table "availability"',
  'a user cannot add an availability slot for someone else'
);

-- Availability is visible to any authenticated user (needed for the
-- mentor search's timezone-overlap filter).
select is(
  (select count(*)::int from public.availability where profile_id = tests.uid('mentor1')),
  1,
  'any authenticated user can see another user''s availability'
);

select tests.authenticate_as('mentor1');
select lives_ok(
  $$ update public.availability set end_time_utc = '12:00' where profile_id = tests.uid('mentor1') $$,
  'a user can update their own availability slot'
);

select tests.authenticate_as('bystander');
select is_empty(
  $$ update public.availability set end_time_utc = '23:00' where profile_id = tests.uid('mentor1') returning id $$,
  'a user cannot update someone else''s availability slot'
);

select * from finish();
rollback;
