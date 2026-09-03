# TASK-003 — Supabase data foundation

## Outcome

- Supabase CLI configuration and a reproducible foundation migration
- 23 workspace-scoped application tables
- RLS with owner/editor/viewer authorization on every public table
- Private `k-lore-assets` bucket with SELECT, INSERT, UPDATE, and DELETE policies
- Immutable approved briefs, scripts, scene plans, bible entries, assets, and renders
- Five category presets created with every workspace
- pgTAP metadata tests for tables, RLS, policies, and Storage

## Storage path

`<workspace-id>/<episode-id>/<asset-kind>/<filename>`

The browser uses only a publishable key. Secret/service keys remain server-only.

## Verification with Docker

```bash
supabase start
supabase db reset
supabase test db
supabase db lint
```

No remote project is linked or migrated by this task.
