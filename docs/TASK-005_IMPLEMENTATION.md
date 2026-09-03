# TASK-005 — Category discovery and Story Brief

## Implemented

- Ten starter ideas across the five K-Lore production categories
- Category filtering with category-specific scores, hooks, moods, and rationale
- Manual idea capture for stories found outside the starter catalog
- Workspace-scoped idea library backed by `story_ideas`
- Category-aware Story Brief defaults and editing form
- Existing Brief read view and production-stage dashboard updates

## Atomic Brief creation

`public.create_story_brief_from_idea` converts a saved idea into an episode and its
first Story Brief inside one PostgreSQL transaction. It locks the idea row, rejects
repeat conversion, creates the episode at the `brief` stage, creates Brief version 1,
and links the idea to the episode.

The function is `security invoker`, has a fixed empty search path, and is executable
only by authenticated users. Existing workspace RLS policies remain authoritative.

## Product boundary

The starter catalog provides a usable, zero-provider-cost discovery baseline. A later
AI research task can write new candidates into the same `story_ideas` table without
changing the review and Brief workflow built here.

## Verification

- TypeScript strict check
- ESLint with zero warnings
- 12 unit/static tests
- Production Next.js build
- Supabase security advisor: no findings
