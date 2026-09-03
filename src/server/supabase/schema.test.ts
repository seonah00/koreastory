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
