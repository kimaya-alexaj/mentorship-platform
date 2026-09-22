begin;
select plan(12);

select tests.create_user('mentor1');
select tests.create_user('mentee1');
select tests.create_user('mentee2');
select tests.create_user('bystander');

update public.profiles set is_mentor = true where id = tests.uid('mentor1');
update public.profiles set is_mentee = true where id in (tests.uid('mentee1'), tests.uid('mentee2'));

-- A mentee can send a request to a mentor.
select tests.authenticate_as('mentee1');
select lives_ok(
  $$ insert into public.requests (mentee_id, mentor_id, message)
     values (tests.uid('mentee1'), tests.uid('mentor1'), 'Would love your help with JavaScript!') $$,
  'a mentee can send a request to a mentor'
);

-- A non-mentee (bystander has is_mentee = false) cannot send a request.
select tests.authenticate_as('bystander');
select throws_ok(
  $$ insert into public.requests (mentee_id, mentor_id, message)
     values (tests.uid('bystander'), tests.uid('mentor1'), 'Hi there') $$,
  'new row violates row-level security policy for table "requests"',
  'a user who hasn''t opted into being a mentee cannot send a request'
);

-- Nobody can create a request "as" someone else.
select tests.authenticate_as('mentee2');
select throws_ok(
  $$ insert into public.requests (mentee_id, mentor_id, message)
     values (tests.uid('mentee1'), tests.uid('mentor1'), 'Impersonating mentee1') $$,
  'new row violates row-level security policy for table "requests"',
  'a user cannot create a request on behalf of another mentee'
);

-- Only the two participants (or an admin) can see the request.
select tests.authenticate_as('mentee1');
select is(
  (select count(*)::int from public.requests where mentee_id = tests.uid('mentee1')),
  1,
  'the requesting mentee can see their own request'
);

select tests.authenticate_as('mentor1');
select is(
  (select count(*)::int from public.requests where mentor_id = tests.uid('mentor1')),
  1,
  'the target mentor can see the request'
);

select tests.authenticate_as('bystander');
select is(
  (select count(*)::int from public.requests),
  0,
  'an unrelated user cannot see the request at all'
);

-- The mentee cannot accept/decline their own request.
select tests.authenticate_as('mentee1');
select throws_ok(
  format(
    $$ update public.requests set status = 'accepted' where mentee_id = %L and mentor_id = %L $$,
    tests.uid('mentee1'), tests.uid('mentor1')
  ),
  'Only the mentor may accept or decline a request.',
  'a mentee cannot accept their own request'
);

-- The mentor accepts the request.
select tests.authenticate_as('mentor1');
select lives_ok(
  format(
    $$ update public.requests set status = 'accepted' where mentee_id = %L and mentor_id = %L $$,
    tests.uid('mentee1'), tests.uid('mentor1')
  ),
  'the mentor can accept the request'
);

-- Accepting the request auto-creates a match (tested more thoroughly in
-- matches.test.sql).
select is(
  (select count(*)::int from public.matches
   where mentee_id = tests.uid('mentee1') and mentor_id = tests.uid('mentor1')),
  1,
  'accepting a request creates a match'
);

-- A request that's already been responded to cannot be changed again.
select throws_ok(
  format(
    $$ update public.requests set status = 'declined' where mentee_id = %L and mentor_id = %L $$,
    tests.uid('mentee1'), tests.uid('mentor1')
  ),
  'Request has already been responded to.',
  'an already-accepted request cannot be re-decided'
);

-- A different mentee can cancel their own pending request.
select tests.authenticate_as('mentee2');
select lives_ok(
  $$ insert into public.requests (mentee_id, mentor_id, message)
     values (tests.uid('mentee2'), tests.uid('mentor1'), 'Interested in mentoring too') $$,
  'a second mentee can send their own request'
);
select lives_ok(
  format(
    $$ update public.requests set status = 'cancelled' where mentee_id = %L and mentor_id = %L $$,
    tests.uid('mentee2'), tests.uid('mentor1')
  ),
  'a mentee can cancel their own pending request'
);

select * from finish();
rollback;
