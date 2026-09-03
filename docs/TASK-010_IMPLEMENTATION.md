# TASK-010 — Scene image generation and Asset Library

## Implemented

- Deterministic prompt composition from approved Bible entries, category rules,
  and an approved Scene Plan scene
- One-at-a-time image generation and regeneration for cost control
- GPT Image 2 through the Image API at 1536×1024, medium quality, WebP output
- A generation ledger record created before every provider call
- Immediate persistence to the private `k-lore-assets` Supabase Storage bucket
- SHA-256 checksum, byte size, prompt snapshot, provider metadata, and estimated
  image cost preservation
- Explicit workspace-safe Asset relationships to Scene and Generation
- Scene-level latest-image preview and a browsable Asset Library
- Draft Asset approval and immutable approved versions

## Prompt composition

The final prompt combines:

`approved master style + approved Halmeoni/house continuity + category visual rules + scene prompt + negative rules`

Halmeoni and her room are explicitly included for the opening scene. Main-story
scenes do not force the narrator into the illustration unless the Scene Plan asks for
her. The exact Bible and category values used are copied into the generation request
record, so later Bible edits do not erase the generation context.

## Persistence and failure handling

The Generation row is created in `pending` state before the OpenAI request and moves
through `running` to `succeeded` or `failed`. Successful bytes are uploaded to a
workspace-prefixed immutable path before the Asset row is created. A failed database
insert removes an orphaned Storage object; once an Asset exists, the file is kept.

Generated files remain in a private bucket and are displayed using short-lived signed
URLs. Service-role credentials are not needed or exposed to the browser. Existing
Storage RLS checks workspace membership for reads and owner/editor roles for writes.

## Configuration

```bash
OPENAI_API_KEY=...
OPENAI_IMAGE_MODEL=gpt-image-2
```

Without an API key, saved prompts and assets remain viewable but live generation is
disabled. No placeholder image is fabricated.

## Cost policy

The default GPT Image 2 medium landscape generation estimate is recorded as USD
0.041 per image. Unknown custom models leave the estimate empty rather than recording
an invented value. Provider token usage is stored when returned.

## Verification

- Prompt composition and OpenAI response decoding tests
- Migration relationship and uniqueness contract tests
- TypeScript strict check, ESLint, unit tests, and Next.js production build
- Remote foreign-key, RLS, Storage, privilege, and security-advisor checks
