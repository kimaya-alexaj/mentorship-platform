begin;
select plan(8);

select tests.create_user('mentor1');
select tests.create_user('mentee1');
select tests.create_user('bystander');

update public.profiles set is_mentor = true where id = tests.uid('mentor1');
update public.profiles set is_mentee = true where id = tests.uid('mentee1');

select tests.authenticate_as('mentee1');
insert into public.requests (mentee_id, mentor_id, message)
values (tests.uid('mentee1'), tests.uid('mentor1'), 'Let''s work together');

select tests.authenticate_as('mentor1');
update public.requests set status = 'accepted'
where mentee_id = tests.uid('mentee1') and mentor_id = tests.uid('mentor1');

-- No client can insert directly into matches; it can only be created by
-- the create_match_on_acceptance() trigger.
select throws_ok(
  $$ insert into public.matches (request_id, mentor_id, mentee_id)
     select id, mentor_id, mentee_id from public.requests
     where mentee_id = tests.uid('mentee1') and mentor_id = tests.uid('mentor1') $$,
  'new row violates row-level security policy for table "matches"',
  'a client cannot insert into matches directly (would conflict with the auto-created row)'
);

select is(
  (select status::text from public.matches
   where mentee_id = tests.uid('mentee1') and mentor_id = tests.uid('mentor1')),
  'active',
  'accepting the request auto-created an active match'
);

-- Both participants can see the match.
select is(
  (select count(*)::int from public.matches where mentor_id = tests.uid('mentor1')),
  1,
  'the mentor can see the match'
);

select tests.authenticate_as('mentee1');
select is(
  (select count(*)::int from public.matches where mentee_id = tests.uid('mentee1')),
  1,
  'the mentee can see the match'
);

-- An unrelated user cannot see the match.
select tests.authenticate_as('bystander');
select is(
  (select count(*)::int from public.matches),
  0,
  'an unrelated user cannot see the match'
);

-- A participant can end the match, but cannot reassign it.
select tests.authenticate_as('mentee1');
select throws_ok(
  format(
    $$ update public.matches set mentor_id = %L where mentee_id = %L $$,
    tests.uid('bystander'), tests.uid('mentee1')
  ),
  'Cannot reassign a match to a different request, mentor, or mentee.',
  'a participant cannot reassign a match to a different mentor'
);

select lives_ok(
  $$ update public.matches set status = 'ended' where mentee_id = tests.uid('mentee1') $$,
  'a participant can end an active match'
);

select is(
  (select ended_at is not null from public.matches where mentee_id = tests.uid('mentee1')),
  true,
  'ending a match stamps ended_at'
);

select * from finish();
rollback;
