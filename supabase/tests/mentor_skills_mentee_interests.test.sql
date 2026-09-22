begin;
select plan(9);

select tests.create_user('mentor1');
select tests.create_user('mentee1');
select tests.create_user('bystander');

update public.profiles set is_mentor = true where id = tests.uid('mentor1');
update public.profiles set is_mentee = true where id = tests.uid('mentee1');

-- A mentor can add a skill they offer.
select tests.authenticate_as('mentor1');
select lives_ok(
  $$ insert into public.mentor_skills (mentor_id, skill_id)
     select tests.uid('mentor1'), id from public.skills limit 1 $$,
  'a mentor can add one of their skills'
);

-- Someone who hasn't opted into being a mentor cannot add mentor_skills,
-- even for themselves.
select tests.authenticate_as('bystander');
select throws_ok(
  $$ insert into public.mentor_skills (mentor_id, skill_id)
     select tests.uid('bystander'), id from public.skills limit 1 $$,
  'new row violates row-level security policy for table "mentor_skills"',
  'a non-mentor cannot add mentor_skills for themselves'
);

-- Nobody can add a mentor_skills row on someone else's behalf.
select tests.authenticate_as('mentee1');
select throws_ok(
  $$ insert into public.mentor_skills (mentor_id, skill_id)
     select tests.uid('mentor1'), id from public.skills limit 1 offset 1 $$,
  'new row violates row-level security policy for table "mentor_skills"',
  'a user cannot add mentor_skills rows for someone else'
);

-- mentor_skills is visible to any authenticated user (needed for search).
select is(
  (select count(*)::int from public.mentor_skills where mentor_id = tests.uid('mentor1')),
  1,
  'any authenticated user can see a mentor''s skills'
);

-- mentee_interests: a mentee can record their own interests.
select tests.authenticate_as('mentee1');
select lives_ok(
  $$ insert into public.mentee_interests (mentee_id, skill_id)
     select tests.uid('mentee1'), id from public.skills limit 1 $$,
  'a mentee can record their own interests'
);

select throws_ok(
  $$ insert into public.mentee_interests (mentee_id, skill_id)
     select tests.uid('mentor1'), id from public.skills limit 1 offset 1 $$,
  'new row violates row-level security policy for table "mentee_interests"',
  'a user cannot record mentee_interests for someone else'
);

-- mentee_interests is private: only the owner (or admin) can see it.
select tests.authenticate_as('bystander');
select is(
  (select count(*)::int from public.mentee_interests where mentee_id = tests.uid('mentee1')),
  0,
  'other users cannot see a mentee''s interests'
);

select tests.authenticate_as('mentee1');
select is(
  (select count(*)::int from public.mentee_interests where mentee_id = tests.uid('mentee1')),
  1,
  'a mentee can see their own interests'
);

-- Owner can remove their own mentor_skills row.
select tests.authenticate_as('mentor1');
select lives_ok(
  $$ delete from public.mentor_skills where mentor_id = tests.uid('mentor1') $$,
  'a mentor can delete their own mentor_skills row'
);

select * from finish();
rollback;
