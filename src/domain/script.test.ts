import { describe, expect, it } from "vitest";

import {
  generatedScriptSchema,
  manualSegments,
  validateScriptLength,
} from "@/domain/script";

describe("script domain", () => {
  it("rejects scripts that are too short for the target duration", () => {
    const segment = {
      segmentType: "story" as const,
      narration: "word ".repeat(100),
      emotion: "gentle",
      estimatedDurationSeconds: 60,
    };
    const script = generatedScriptSchema.parse({
      title: "A sufficiently descriptive English title",
      segments: Array.from({ length: 7 }, () => segment),
    });

    expect(validateScriptLength(script, 20)).toEqual({
      wordCount: 700,
      minimumWords: 1600,
      isLongEnough: false,
    });
  });

  it("turns edited paragraphs into ordered manual segments", () => {
    const segments = manualSegments(
      "Opening words.\n\nMiddle words.\n\nClosing words.",
    );
    expect(segments.map((segment) => segment.segmentType)).toEqual([
      "opening",
      "story",
      "closing",
    ]);
  });
});
