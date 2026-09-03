<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# K-Lore project rules

- Read `docs/ARCHITECTURE.md` before changing domain or infrastructure code.
- Keep TypeScript strict and validate external input with Zod.
- Prefer Server Components; add `use client` only at the smallest interactive boundary.
- Never expose Supabase secret/service keys in browser code.
- Enable RLS on every table in an exposed schema and scope access by workspace membership.
- Treat approved content versions and generated assets as immutable.
- Create a generation record before calling an AI provider and retain failed attempts.
- Run `pnpm check` before reporting a task complete.
- Do not commit, push, migrate a remote database, or deploy unless the user explicitly asks.
