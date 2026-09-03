# TASK-004 — Authentication and personal workspace onboarding

## Implemented

- Supabase email/password sign-up, sign-in, sign-out
- PKCE callback route for email confirmation
- Next.js proxy-based session refresh and protected application routes
- Server-side Zod validation and safe local redirect handling
- Automatic profile, personal workspace, owner membership, and category preset creation
- Authenticated dashboard backed by the current workspace and episode stages

## Onboarding transaction

An `auth.users` insert invokes `private.bootstrap_auth_user()`. The function creates
the public profile and workspace. The existing workspace trigger then creates the
owner membership and five default category presets in the same database transaction.

The auth trigger is a `security definer` function in the private schema with an empty
search path and no execution grants for `public`, `anon`, or `authenticated`.

## Environment

Set `NEXT_PUBLIC_SITE_URL` to the canonical application origin. Local development
defaults to `http://localhost:3000`. Add the same callback origin to the Supabase Auth
redirect allow list before deploying another environment.

## Verification

- `pnpm check`
- Supabase security advisor: no findings
- Auth trigger catalog check: private schema, fixed search path, restricted privileges
