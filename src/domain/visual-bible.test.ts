import { describe, expect, it } from "vitest";

import {
  bibleEntryVersionSchema,
  latestBibleEntries,
} from "@/domain/visual-bible";

describe("visual bible", () => {
  it("parses version content as an object", () => {
    const parsed = bibleEntryVersionSchema.parse({
      entryId: "00000000-0000-4000-8000-000000000001",
      kind: "character",
      slug: "halmeoni",
      name: "K-Lore Halmeoni",
      content: '{"hair":"silver low bun"}',
    });
    expect(parsed.content).toEqual({ hair: "silver low bun" });
  });

  it("keeps only the newest version of each kind and slug", () => {
    const entries = [
      { kind: "character", slug: "halmeoni", version: 1 },
      { kind: "world", slug: "house", version: 1 },
      { kind: "character", slug: "halmeoni", version: 2 },
    ];
    expect(latestBibleEntries(entries)).toEqual([entries[2], entries[1]]);
  });
});
