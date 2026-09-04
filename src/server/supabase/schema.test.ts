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
const visualBibleMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260903060000_visual_bible_and_category_presets.sql",
  ),
  "utf8",
);
const sceneImageAssetsMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260903070000_scene_image_assets.sql",
  ),
  "utf8",
);
const bibleReferenceAssetsMigration = readFileSync(
  "supabase/migrations/20260903072000_bible_reference_assets.sql",
  "utf8",
);
const narrationAudioAssetsMigration = readFileSync(
  "supabase/migrations/20260903073000_narration_audio_assets.sql",
  "utf8",
);
const audioLayerWorkflowMigration = readFileSync(
  "supabase/migrations/20260903074000_audio_layer_workflow.sql",
  "utf8",
);
const audioLayerDefaultsMigration = readFileSync(
  "supabase/migrations/20260903075000_harden_audio_layer_defaults.sql",
  "utf8",
);
const renderManifestWorkflowMigration = readFileSync(
  "supabase/migrations/20260903080000_render_manifest_workflow.sql",
  "utf8",
);
const asyncRenderWorkerMigration = readFileSync(
  "supabase/migrations/20260904010000_async_render_worker.sql",
  "utf8",
);
const subtitleExportsMigration = readFileSync(
  "supabase/migrations/20260904020000_subtitle_exports_and_review.sql",
  "utf8",
);
const publishPackageMigration = readFileSync(
  "supabase/migrations/20260904030000_publish_package_workflow.sql",
  "utf8",
);
const youtubeAnalyticsMigration = readFileSync(
  "supabase/migrations/20260904040000_youtube_publication_analytics.sql",
  "utf8",
);
const youtubeAnalyticsIndexesMigration = readFileSync(
  "supabase/migrations/20260904041500_index_youtube_publication_episode.sql",
  "utf8",
);
const sceneImageAssetIndexesMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260903071000_index_scene_image_asset_relationships.sql",
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

describe("visual bible migration", () => {
  it("seeds the brand, Halmeoni, house, and voice defaults", () => {
    for (const slug of [
      "k-lore-master-style",
      "halmeoni",
      "halmeoni-house",
      "halmeoni-voice",
    ]) {
      expect(visualBibleMigration).toContain(`'${slug}'`);
    }
    expect(visualBibleMigration).toContain("workspaces_visual_bible_bootstrap");
  });

  it("sets distinct visual rules for all five categories", () => {
    for (const slug of [
      "grandmas-tales",
      "strange-tales",
      "korean-legends",
      "stories-for-sleep",
      "old-korean-wisdom",
    ]) {
      expect(visualBibleMigration).toContain(`when '${slug}'`);
    }
  });

  it("creates Bible versions with authenticated invoker permissions", () => {
    expect(visualBibleMigration).toContain(
      "function public.create_bible_entry_version",
    );
    expect(visualBibleMigration).toContain("security invoker");
    expect(visualBibleMigration).toMatch(/from public, anon;/);
    expect(visualBibleMigration).toMatch(/to authenticated;/);
  });
});

describe("scene image asset migration", () => {
  it("links image assets to scenes and generation records safely", () => {
    expect(sceneImageAssetsMigration).toContain("assets_scene_workspace_fkey");
    expect(sceneImageAssetsMigration).toContain(
      "assets_episode_workspace_fkey",
    );
    expect(sceneImageAssetsMigration).toContain(
      "assets_generation_workspace_fkey",
    );
    expect(sceneImageAssetsMigration).toContain(
      "on delete set null (scene_id)",
    );
    expect(sceneImageAssetsMigration).toContain(
      "on delete set null (generation_id)",
    );
  });

  it("keeps Bible reference assets inside the same workspace", () => {
    expect(bibleReferenceAssetsMigration).toContain(
      "bible_entries_id_workspace_unique",
    );
    expect(bibleReferenceAssetsMigration).toContain(
      "assets_id_workspace_unique",
    );
    expect(bibleReferenceAssetsMigration).toContain(
      "bible_references_entry_workspace_fkey",
    );
    expect(bibleReferenceAssetsMigration).toContain(
      "bible_references_asset_workspace_fkey",
    );
  });

  it("links narration assets to script segments in the same workspace", () => {
    expect(scenePlanWorkflowMigration).toContain(
      "script_segments_id_workspace_unique",
    );
    expect(narrationAudioAssetsMigration).toContain(
      "assets_script_segment_workspace_fkey",
    );
    expect(narrationAudioAssetsMigration).toContain(
      "assets_script_segment_workspace_fkey_idx",
    );
  });

  it("protects workspace-scoped audio timeline layers", () => {
    expect(audioLayerWorkflowMigration).toContain(
      "create table public.audio_layers",
    );
    for (const relationship of ["episode", "scene", "asset"]) {
      expect(audioLayerWorkflowMigration).toContain(
        `audio_layers_${relationship}_workspace_fkey`,
      );
    }
    expect(audioLayerWorkflowMigration).toContain(
      "alter table public.audio_layers enable row level security",
    );
    for (const operation of ["select", "insert", "update", "delete"]) {
      expect(audioLayerWorkflowMigration).toContain(
        `audio_layers_${operation}`,
      );
    }
    expect(audioLayerWorkflowMigration).toContain("audio_layers_immutable");
  });

  it("indexes audio layer relationships and defaults future category presets", () => {
    expect(audioLayerDefaultsMigration).toContain(
      "audio_layers_episode_workspace_fkey_idx",
    );
    expect(audioLayerDefaultsMigration).toContain(
      "audio_layers_approved_by_fkey_idx",
    );
    expect(audioLayerDefaultsMigration).toContain(
      "function private.apply_category_audio_defaults",
    );
    expect(audioLayerDefaultsMigration).toContain(
      "category_presets_audio_defaults",
    );
  });

  it("creates render versions only from approved workspace-safe inputs", () => {
    expect(renderManifestWorkflowMigration).toContain(
      "function public.create_render_version",
    );
    expect(renderManifestWorkflowMigration).toContain(
      "approved scene plan required",
    );
    expect(renderManifestWorkflowMigration).toContain(
      "every image and narration asset must be approved",
    );
    for (const relationship of ["episode", "scene_plan", "output_asset"]) {
      expect(renderManifestWorkflowMigration).toContain(
        `render_versions_${relationship}_workspace_fkey`,
      );
    }
    expect(renderManifestWorkflowMigration).toContain("security invoker");
    expect(renderManifestWorkflowMigration).toMatch(/to authenticated;/);
  });

  it("claims, leases, completes, and retries MP4 render jobs safely", () => {
    for (const functionName of [
      "enqueue_render_job",
      "claim_render_job",
      "heartbeat_render_job",
      "complete_render_job",
      "fail_render_job",
    ]) {
      expect(asyncRenderWorkerMigration).toContain(
        `function public.${functionName}`,
      );
    }
    expect(asyncRenderWorkerMigration).toContain("for update skip locked");
    expect(asyncRenderWorkerMigration).toContain(
      "jobs_render_version_workspace_fkey",
    );
    expect(asyncRenderWorkerMigration).toContain("to service_role");
    expect(asyncRenderWorkerMigration).toContain(
      "from public, anon, authenticated",
    );
    expect(asyncRenderWorkerMigration).toContain(
      "private.protect_render_version",
    );
  });

  it("registers versioned subtitle exports before review completion", () => {
    expect(subtitleExportsMigration).toContain(
      "assets_render_version_workspace_fkey",
    );
    expect(subtitleExportsMigration).toContain(
      "assets_render_subtitle_format_unique",
    );
    for (const functionName of [
      "create_subtitle_exports",
      "mark_episode_ready",
    ]) {
      expect(subtitleExportsMigration).toContain(
        `function public.${functionName}`,
      );
    }
    expect(subtitleExportsMigration).toContain("'text/vtt'");
    expect(subtitleExportsMigration).toContain("'application/x-subrip'");
    expect(subtitleExportsMigration).toContain("security invoker");
    expect(subtitleExportsMigration).toContain("from public, anon");
    expect(subtitleExportsMigration).toContain("to authenticated");
  });

  it("stores immutable workspace-scoped publish package versions", () => {
    expect(publishPackageMigration).toContain(
      "create table public.publish_package_versions",
    );
    for (const relationship of [
      "episode",
      "render",
      "generation",
      "thumbnail",
    ]) {
      expect(publishPackageMigration).toContain(
        `publish_packages_${relationship}_workspace_fkey`,
      );
    }
    expect(publishPackageMigration).toContain("enable row level security");
    expect(publishPackageMigration).toContain(
      "private.protect_publish_package",
    );
    expect(publishPackageMigration).toContain(
      "function public.create_publish_package_version",
    );
    expect(publishPackageMigration).toContain("security invoker");
    expect(publishPackageMigration).toContain("from public, anon");
    expect(publishPackageMigration).toContain("to authenticated");
  });

  it("stores workspace-scoped YouTube publications and metric snapshots", () => {
    for (const table of ["youtube_publications", "youtube_metric_snapshots"]) {
      expect(youtubeAnalyticsMigration).toContain(
        `create table public.${table}`,
      );
      expect(youtubeAnalyticsMigration).toContain(
        `alter table public.${table} enable row level security`,
      );
    }
    expect(youtubeAnalyticsMigration).toContain(
      "youtube_publications_package_workspace_fkey",
    );
    expect(youtubeAnalyticsMigration).toContain(
      "youtube_metrics_publication_workspace_fkey",
    );
    expect(youtubeAnalyticsMigration).toContain(
      "private.protect_youtube_publication",
    );
    expect(youtubeAnalyticsMigration).toContain(
      "metrics cannot predate publication",
    );
    for (const functionName of [
      "record_youtube_publication",
      "record_youtube_metric_snapshot",
    ]) {
      expect(youtubeAnalyticsMigration).toContain(
        `function public.${functionName}`,
      );
    }
    expect(youtubeAnalyticsMigration).toContain("security invoker");
    expect(youtubeAnalyticsMigration).toContain("from public, anon");
    expect(youtubeAnalyticsMigration).toContain("to authenticated");
    expect(youtubeAnalyticsIndexesMigration).toContain(
      "youtube_publications_episode_workspace_fkey_idx",
    );
  });

  it("allows only one persisted asset for a generation", () => {
    expect(sceneImageAssetsMigration).toContain(
      "create unique index assets_generation_unique",
    );
  });

  it("indexes every composite Asset relationship", () => {
    for (const relationship of ["episode", "generation", "scene"]) {
      expect(sceneImageAssetIndexesMigration).toContain(
        `assets_${relationship}_workspace_fkey_idx`,
      );
    }
  });
});
