# TASK-009 — Visual Bible and category image presets

## Implemented

- A Visual Bible management page linked from the studio navigation
- Approved K-Lore master style, Halmeoni character, Halmeoni house, and voice defaults
- Category-specific palette, lighting, composition, atmosphere, and style modifiers
- Reusable brand, character, world, style, and voice entry creation
- Immutable approved Bible entries and editable draft versions
- Workspace-scoped Server Actions and row-level security
- A direct link from Scene Plan to Visual Bible configuration

## Consistency strategy

The system keeps one K-Lore master style while category presets change only the
palette, lighting, composition, atmosphere, and modest style modifiers. Halmeoni's
identity and house remain fixed across categories. Seasonal and category mood
changes are expressed through the environment rather than changing the narrator.

Later image prompts can be assembled from:

`approved master style + category preset + approved character/world entries + scene`

## Versioning and approval

`public.create_bible_entry_version` is a `security invoker` transaction exposed only
to authenticated users. It locks the workspace while allocating the next version,
so concurrent edits cannot select the same version number. RLS independently limits
reads and writes to workspace members.

Editing always creates a new draft. Approval uses the existing immutable record
trigger, which records the approver and approval time and prevents later mutation or
deletion. This preserves exact visual inputs for reproducible generation.

## Workspace bootstrap

Existing workspaces receive the four approved defaults during migration. A private,
trigger-only bootstrap function creates the same defaults for each future workspace.
Its execution privilege is revoked from browser-facing roles.

## Verification

- Visual Bible JSON parsing and latest-version selection tests
- Migration contract tests for defaults, category coverage, and RPC privileges
- TypeScript strict check, ESLint, unit tests, and Next.js production build
- Remote RLS, privilege, seed, and security-advisor checks
