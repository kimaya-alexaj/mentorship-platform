@AGENTS.md

# Volunteer Mentoring Platform

Free mentoring platform for [Charity]. Volunteer mentors and mentees (18+)
connect by shared interests, worldwide.

Stack: Next.js (App Router, TypeScript), Tailwind + shadcn/ui, Supabase
(Postgres, Auth, RLS), deployed on Vercel.

## Rules

- Every table must have Row Level Security enabled, with policies written
  and tested.
- Schema changes go in `supabase/migrations` only — never edit the schema
  by hand against a live project.
- Store all times in UTC; each profile has an IANA timezone
  (`profiles.timezone`). Convert to/from local time only in the UI layer.
- Never expose personal data (email, full contact details) to other users
  until a match is accepted. Enforce this in RLS policies and in query
  shapes, not just in the UI.
- Users must confirm they are 18+ at sign-up. This is a hard requirement,
  not a soft nudge — sign-up must be blocked without it.
- Keep components small; explain non-obvious decisions in comments.

## Local development

This project targets the Supabase local dev stack (`supabase start`), which
requires Docker. If Docker isn't available in your environment, migrations
and pgTAP tests can still be written and reviewed, but can't be executed
locally — run `supabase start && supabase test db` wherever Docker is
available (or in CI) before trusting them.

- `npm run dev` — Next.js dev server
- `supabase start` — local Postgres/Auth/Storage stack
- `supabase db reset` — reapply all migrations + seed data to the local db
- `supabase test db` — run pgTAP tests in `supabase/tests`

## Directory map

- `supabase/migrations` — schema + RLS policies, one file per change
- `supabase/seed.sql` — seed data (skills taxonomy)
- `supabase/tests` — pgTAP RLS tests
- `src/lib/supabase` — typed Supabase client helpers (browser/server/admin)
- `src/app` — routes (App Router)
