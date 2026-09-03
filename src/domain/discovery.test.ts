import { describe, expect, it } from "vitest";

import {
  briefSchema,
  getStarterIdea,
  ideasForCategory,
  starterIdeas,
} from "@/domain/discovery";

describe("category discovery", () => {
  it("keeps at least two starter ideas per category", () => {
    for (const category of [
      "grandmas-tales",
      "strange-tales",
      "korean-legends",
      "stories-for-sleep",
      "old-korean-wisdom",
    ]) {
      expect(ideasForCategory(category)).toHaveLength(2);
    }
  });

  it("uses unique stable starter ids", () => {
    expect(new Set(starterIdeas.map((idea) => idea.id)).size).toBe(
      starterIdeas.length,
    );
    expect(getStarterIdea("princess-bari")?.category).toBe("korean-legends");
  });

  it("validates a production-ready brief", () => {
    expect(
      briefSchema.safeParse({
        ideaId: "f9d41727-ad22-4d39-b09c-c9dc2aa7942e",
        globalHook:
          "A princess returned to save the parents who abandoned her.",
        coreEmotion: "Abandonment to forgiveness",
        adaptationDirection:
          "Soften violence while preserving sacrifice and wonder.",
        audiencePromise:
          "A moving Korean myth told with enough context for a global audience.",
        mood: "Melancholic and mystical",
        targetDurationMinutes: 24,
      }).success,
    ).toBe(true);
  });
});
