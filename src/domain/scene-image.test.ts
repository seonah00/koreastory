import { describe, expect, it } from "vitest";

import { composeSceneImagePrompt } from "@/domain/scene-image";

describe("scene image prompt", () => {
  const base = {
    bible: {
      master: { stylePrompt: "minhwa watercolor" },
      halmeoni: { hair: "silver bun" },
      house: { interior: "ondol room" },
    },
    categoryRules: { palette: "indigo" },
  };

  it("combines approved style, category, and opening continuity", () => {
    const prompt = composeSceneImagePrompt({
      ...base,
      isFramingScene: true,
      scene: {
        description: "She opens a book.",
        negativePrompt: "no fear",
        position: 0,
        title: "Opening",
        visualPrompt: "warm lamp",
      },
    });
    expect(prompt).toContain("minhwa watercolor");
    expect(prompt).toContain("indigo");
    expect(prompt).toContain("silver bun");
    expect(prompt).toContain("ondol room");
  });

  it("does not force Halmeoni into main-story scenes", () => {
    const prompt = composeSceneImagePrompt({
      ...base,
      isFramingScene: false,
      scene: {
        description: "A tiger crosses the mountain.",
        negativePrompt: null,
        position: 3,
        title: "Tiger",
        visualPrompt: null,
      },
    });
    expect(prompt).toContain("Do not show the narrator unless");
  });
});
