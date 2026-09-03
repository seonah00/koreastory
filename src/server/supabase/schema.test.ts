import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260903022331_create_k_lore_foundation.sql",
  ),
  "utf8",
);
const researchMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260903041000_research_evidence_for_story_ideas.sql",
  ),
  "utf8",
);
const researchIntegrityMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260903043000_enforce_research_workspace_integrity.sql",
  ),
  "utf8",
);
const scriptWorkflowMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260903050000_create_script_version_workflow.sql",
  ),
  "utf8",
);
const scenePlanWorkflowMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260903053000_create_scene_plan_workflow.sql",
  ),
  "utf8",
);
const repeatedSceneMappingsMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260903054000_allow_repeated_scene_segment_mappings.sql",
  ),
  "utf8",
);

describe("Supabase foundation migration", () => {
  it("defines every planned application table", () => {
    const tables = migration.match(/create table public\.[a-z_]+/g) ?? [];

    expect(tables).toHaveLength(23);
  });

  it("enables workspace-scoped RLS and private storage CRUD", () => {
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("private.is_workspace_member");
    expect(migration).toContain("private.has_workspace_role");
    expect(migration).toContain("'k-lore-assets','k-lore-assets',false");

    for (const operation of ["select", "insert", "update", "delete"]) {
      expect(migration).toContain(`storage_assets_${operation}`);
    }
  });

  it("does not grant browser roles a service-level bypass", () => {
    expect(migration).not.toMatch(/grant\s+.*\bservice_role\b/i);
    expect(migration).not.toMatch(/to\s+anon\b/i);
  });

  it("protects approved parent records and their script/scene children", () => {
    expect(migration).toContain("protect_approved_record");
    expect(migration).toContain("protect_approved_script_child");
    expect(migration).toContain("protect_approved_scene_segment");
  });
});

describe("research evidence migration", () => {
  it("supports evidence before an episode exists", () => {
    expect(researchMigration).toContain(
      "alter column episode_id drop not null",
    );
    expect(researchMigration).toContain(
      "story_idea_id uuid references public.story_ideas",
    );
    expect(researchMigration).toContain("research_evidence_context_check");
    expect(researchMigration).toContain("research_evidence_story_idea_id_idx");
  });

  it("prevents cross-workspace source and evidence references", () => {
    expect(researchIntegrityMigration).toContain("unique (id, workspace_id)");
    expect(researchIntegrityMigration).toContain(
      "foreign key (story_idea_id, workspace_id)",
    );
    expect(
      researchIntegrityMigration.match(
        /foreign key \(story_idea_id, workspace_id\)/g,
      ),
    ).toHaveLength(2);
  });
});

describe("script version workflow migration", () => {
  it("creates script and segment versions atomically", () => {
    expect(scriptWorkflowMigration).toContain(
      "function public.create_script_version",
    );
    expect(scriptWorkflowMigration).toContain(
      "jsonb_array_elements(p_segments) with ordinality",
    );
    expect(scriptWorkflowMigration).toContain("set stage = 'script'");
  });

  it("prevents cross-workspace script relationships", () => {
    expect(scriptWorkflowMigration).toContain(
      "script_versions_episode_workspace_fkey",
    );
    expect(scriptWorkflowMigration).toContain(
      "script_versions_brief_workspace_fkey",
    );
    expect(scriptWorkflowMigration).toContain(
      "script_segments_version_workspace_fkey",
    );
  });

  it("exposes the invoker function only to authenticated users", () => {
    expect(scriptWorkflowMigration).toContain("security invoker");
    expect(scriptWorkflowMigration).toMatch(/from public, anon;/);
    expect(scriptWorkflowMigration).toMatch(/to authenticated;/);
  });
});

describe("scene plan workflow migration", () => {
  it("creates scene plans, scenes, and mappings atomically", () => {
    expect(scenePlanWorkflowMigration).toContain(
      "function public.create_scene_plan_version",
    );
    expect(repeatedSceneMappingsMigration).toContain(
      "every script segment must be covered and unknown positions are forbidden",
    );
    expect(scenePlanWorkflowMigration).toContain("set stage = 'scenes'");
  });

  it("requires an approved script and workspace-safe relationships", () => {
    expect(scenePlanWorkflowMigration).toContain("and s.status = 'approved'");
    for (const constraint of [
      "scene_plan_versions_episode_workspace_fkey",
      "scene_plan_versions_script_workspace_fkey",
      "scenes_plan_workspace_fkey",
      "scene_segments_scene_workspace_fkey",
      "scene_segments_script_segment_workspace_fkey",
    ]) {
      expect(scenePlanWorkflowMigration).toContain(constraint);
    }
  });

  it("keeps the transaction function invoker-scoped", () => {
    expect(scenePlanWorkflowMigration).toContain("security invoker");
    expect(scenePlanWorkflowMigration).toMatch(/from public, anon;/);
    expect(scenePlanWorkflowMigration).toMatch(/to authenticated;/);
  });
});
