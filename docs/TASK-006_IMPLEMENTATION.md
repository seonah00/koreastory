# TASK-006 — AI web research and evidence

## Implemented

- OpenAI Responses API adapter using the hosted `web_search` tool
- Structured research output validation with Zod
- Source extraction from web-search results and citation annotations
- Exact URL matching before a finding is accepted as evidence
- Workspace-scoped source documents and claim-level evidence
- Research history with pending, running, succeeded, and failed states
- Clickable source and confidence display in the Story Brief workspace

## Durable generation flow

The server creates a `generations` row before calling OpenAI. The row transitions to
`running`, then retains either the validated response summary and token counts or a
sanitized failure message. Failed attempts are not discarded.

Research results are accepted only when at least two findings can be matched to URLs
returned by the web-search response. Sources are stored in `source_documents`; claims,
concise evidence paraphrases, and confidence values are stored in
`research_evidence`.

## Configuration

Set these server-only environment variables:

```bash
OPENAI_API_KEY=...
OPENAI_RESEARCH_MODEL=gpt-5.5
```

Without an API key the interface stays available, but the research action is disabled
and no synthetic results are created.

## Security and data model

Research evidence can now belong directly to a story idea before an episode exists.
The existing workspace RLS policies still guard sources, evidence, and generations.
The OpenAI key is read only on the server and is never included in generation records.

## Verification

- TypeScript strict check
- ESLint with zero warnings
- Unit and migration tests
- Production Next.js build
- Supabase security advisor: no findings

Live provider execution requires a funded OpenAI API key and is intentionally not
simulated when one is unavailable.
