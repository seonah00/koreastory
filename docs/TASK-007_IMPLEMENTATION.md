# TASK-007 — English long-form script versions

## Implemented

- OpenAI Responses API adapter with Structured Outputs
- Category-aware long-form narration blueprints
- Story Brief and verified research evidence supplied as generation context
- Minimum word-count validation based on the requested duration
- Production-ready narration segments with emotion and duration metadata
- Atomic script version and segment persistence
- Manual editing that always creates a new version
- Script approval and immutable approved versions
- Generation ledger with pending, running, succeeded, and failed states
- Script Studio with word count, segments, version history, and run history

## Generation quality rules

The target is approximately 125 spoken English words per minute. A generated result
is rejected when it contains fewer than 80 words per requested minute (with a 700-word
absolute minimum). This prevents outline-sized responses from being stored as a
long-form script.

The prompt treats stored research evidence as factual boundaries and instructs the
model not to invent dates, quotations, sources, or historical claims. User content is
passed as source material, while the fixed production requirements remain explicit.

## Version and approval behavior

`public.create_script_version` is a `security invoker` transaction that validates the
episode/Brief relationship, calculates the next version, inserts the script and all
segments, and advances the episode to the script stage. Composite foreign keys prevent
cross-workspace relationships.

Editing never updates a version in place. It creates a new draft. Once approved, the
existing immutable-record triggers protect both the script and its segments.

## Configuration

```bash
OPENAI_API_KEY=...
OPENAI_SCRIPT_MODEL=gpt-5.5
```

Without a key, Script Studio remains readable but disables live generation. It never
creates synthetic provider results.

## Verification

- Zod domain validation tests
- Migration contract tests
- TypeScript strict check
- ESLint with zero warnings
- Next.js production build
- Remote Supabase constraint, RLS, and security-advisor checks

Live provider execution requires an OpenAI API key and is not simulated.
