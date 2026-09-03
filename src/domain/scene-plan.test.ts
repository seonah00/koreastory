import { describe, expect, it } from "vitest";

import {
  recommendedSceneCount,
  validateSceneCoverage,
  type ScenePlan,
} from "@/domain/scene-plan";

const scene = (positions: number[]) => ({
  title: "Moonlit forest",
  description: "A quiet Korean pine forest seen beneath restrained moonlight.",
  visualPrompt:
    "Korean folk-art inspired watercolor, moonlit pine forest, handmade paper texture.",
  negativePrompt: "modern objects, text, watermark",
  cameraMotion: "slow-push-in" as const,
  ambience: "soft wind through pine needles",
  durationSeconds: 90,
  scriptSegmentPositions: positions,
});

describe("scene plan", () => {
  it("covers every script segment and permits repeated visual beats", () => {
    const complete = {
      scenes: [scene([0]), scene([1, 2]), scene([2, 3]), scene([4])],
    } as ScenePlan;
    const unknown = {
      scenes: [scene([0, 1]), scene([2]), scene([3]), scene([4, 5])],
    } as ScenePlan;
    expect(validateSceneCoverage(complete, 5).isComplete).toBe(true);
    expect(validateSceneCoverage(unknown, 5).isComplete).toBe(false);
  });

  it("keeps image counts intentionally low for long-form videos", () => {
    expect(recommendedSceneCount(15)).toBe(8);
    expect(recommendedSceneCount(20)).toBe(11);
    expect(recommendedSceneCount(30)).toBe(14);
    expect(recommendedSceneCount(40)).toBe(18);
  });
});
