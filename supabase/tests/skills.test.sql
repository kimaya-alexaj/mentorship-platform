begin;
select plan(5);

select tests.create_user('alice');

-- Anonymous (signed-out) visitors can browse the skills taxonomy.
select tests.authenticate_as_anon();
select cmp_ok(
  (select count(*)::int from public.skill_categories),
  '>=',
  5,
  'anonymous users can read skill_categories'
);
select cmp_ok(
  (select count(*)::int from public.skills),
  '>=',
  30,
  'anonymous users can read skills'
);

-- Signed-in users can read it too.
select tests.authenticate_as('alice');
select cmp_ok(
  (select count(*)::int from public.skills),
  '>=',
  30,
  'authenticated users can read skills'
);

-- Nobody can write to the taxonomy via the client API — no insert/update
-- policy exists at all, so an authenticated insert must fail.
select throws_ok(
  $$ insert into public.skills (category_id, name, slug)
     select id, 'Hacked Skill', 'hacked-skill' from public.skill_categories limit 1 $$,
  'new row violates row-level security policy for table "skills"',
  'authenticated users cannot insert new skills'
);
select throws_ok(
  $$ insert into public.skill_categories (name, slug) values ('Hacked', 'hacked') $$,
  'new row violates row-level security policy for table "skill_categories"',
  'authenticated users cannot insert new skill categories'
);

select * from finish();
rollback;
