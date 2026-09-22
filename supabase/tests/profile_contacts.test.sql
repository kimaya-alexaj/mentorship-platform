begin;
select plan(7);

select tests.create_user('mentor1');
select tests.create_user('mentee1');
select tests.create_user('bystander');

update public.profiles set is_mentor = true where id = tests.uid('mentor1');
update public.profiles set is_mentee = true where id = tests.uid('mentee1');

-- A contact row is auto-seeded from the sign-up email.
select is(
  (select contact_email from public.profile_contacts where profile_id = tests.uid('mentor1')),
  'mentor1@example.test',
  'a profile_contacts row is auto-seeded with the sign-up email'
);

select tests.authenticate_as('mentor1');
select is(
  (select count(*)::int from public.profile_contacts where profile_id = tests.uid('mentor1')),
  1,
  'a user can see their own contact email'
);

-- CLAUDE.md: never expose contact details to other users before a match.
select tests.authenticate_as('bystander');
select is(
  (select count(*)::int from public.profile_contacts where profile_id = tests.uid('mentor1')),
  0,
  'an unrelated (unmatched) user cannot see another user''s contact email'
);

select tests.authenticate_as('mentee1');
select is(
  (select count(*)::int from public.profile_contacts where profile_id = tests.uid('mentor1')),
  0,
  'a mentee with no accepted match cannot see the mentor''s contact email'
);

-- Once matched (request accepted), each side can see the other's email.
select lives_ok(
  $$ insert into public.requests (mentee_id, mentor_id, message)
     values (tests.uid('mentee1'), tests.uid('mentor1'), 'Let''s connect') $$,
  'mentee sends a request (setup for the matched-contact assertions)'
);

select tests.authenticate_as('mentor1');
update public.requests set status = 'accepted'
where mentee_id = tests.uid('mentee1') and mentor_id = tests.uid('mentor1');

select is(
  (select contact_email from public.profile_contacts where profile_id = tests.uid('mentee1')),
  'mentee1@example.test',
  'after a match is accepted, the mentor can see the mentee''s contact email'
);

select tests.authenticate_as('mentee1');
select is(
  (select contact_email from public.profile_contacts where profile_id = tests.uid('mentor1')),
  'mentor1@example.test',
  'after a match is accepted, the mentee can see the mentor''s contact email'
);

select * from finish();
rollback;
