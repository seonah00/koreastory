import { describe, expect, it } from "vitest";

import {
  matchFindingsToSources,
  normalizeSourceUrl,
  researchResultSchema,
} from "@/domain/research";

const validResult = {
  summary:
    "This is a sufficiently detailed summary of the story tradition and its most important documented variations.",
  culturalContext:
    "The tale reflects a documented cultural setting and should be explained carefully to global viewers.",
  contentRisks: ["Regional variants differ"],
  findings: [
    {
      claim: "The story has several recorded regional variants.",
      evidenceExcerpt:
        "Collected versions differ in their ending and central character.",
      confidence: 0.82,
      sourceUrl: "https://example.org/source#section",
    },
    {
      claim: "The modern title is not used consistently in older sources.",
      evidenceExcerpt:
        "Catalog records list multiple titles for closely related narratives.",
      confidence: 0.74,
      sourceUrl: "https://archive.example/item",
    },
  ],
};

describe("research evidence", () => {
  it("validates structured research output", () => {
    expect(researchResultSchema.safeParse(validResult).success).toBe(true);
  });

  it("normalizes fragments before matching citations", () => {
    expect(normalizeSourceUrl("https://example.org/source#section")).toBe(
      "https://example.org/source",
    );
    const findings = matchFindingsToSources(validResult, [
      { title: "Source", url: "https://example.org/source" },
    ]);
    expect(findings).toHaveLength(1);
  });
});
