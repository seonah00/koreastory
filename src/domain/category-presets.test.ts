import { describe, expect, it } from "vitest";

import { categoryPresets, getCategoryPreset } from "./category-presets";

describe("category presets", () => {
  it("defines the five MVP categories", () => {
    expect(categoryPresets.map(({ key }) => key)).toEqual([
      "grandma",
      "strange",
      "legends",
      "sleep",
      "wisdom",
    ]);
  });

  it("resolves a preset by key", () => {
    expect(getCategoryPreset("sleep")?.role).toBe("시청시간");
  });
});
