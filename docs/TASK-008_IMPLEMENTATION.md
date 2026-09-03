# TASK-008 — Scene Plan generation and versions

## Implemented

- AI scene planning from the latest approved English script
- Category-specific color, lighting, composition, and mood presets
- Shared K-Lore watercolor/minhwa visual identity in every prompt
- Fixed Halmeoni/hanok framing rules for opening and closing scenes
- Intentionally limited image counts for low-stimulation long-form videos
- Scene descriptions, image prompts, negative prompts, camera motion, ambience,
  and duration metadata
- Complete coverage validation for every script segment, with repeated mappings
  allowed for long visual beats
- Atomic Scene Plan, scene, and script-segment mapping persistence
- Manual editing that creates a new Scene Plan version
- Approval and immutable approved Scene Plans
- Generation ledger with pending, running, succeeded, and failed states

## Scene-count policy

The planner aims for approximately 8 scenes at 15 minutes, 11 at 20 minutes,
14 at 30 minutes, and 18 for longer sleep content. One strong image may support
multiple adjacent narration segments. This preserves the low-stimulation channel
identity and controls image-generation cost.

## Data integrity

`public.create_scene_plan_version` is a `security invoker` transaction. It accepts
only an approved script belonging to the same episode, verifies that every script
segment is covered, rejects unknown positions, writes the plan and its children, and
advances the episode to the scenes stage. A long narration segment may support
multiple consecutive visual scenes.

Composite workspace foreign keys prevent cross-workspace plan, scene, and segment
relationships. Existing immutable triggers protect approved plans and their child
scenes and mappings.

## Configuration

```bash
OPENAI_API_KEY=...
OPENAI_SCENE_MODEL=gpt-5.5
```

Without the key, saved Scene Plans remain readable and editable through versioning,
but live AI generation is disabled and no synthetic result is produced.

## Verification

- Scene schema and coverage tests
- Migration contract tests
- TypeScript strict check
- ESLint with zero warnings
- Next.js production build
- Remote constraint, RLS, privilege, and security-advisor checks
