import { describe, expect, it } from "vitest";

import {
  categoryRecommendation,
  extractYouTubeVideoId,
  weightedAverage,
} from "./youtube-analytics";

describe("YouTube analytics", () => {
  it("extracts canonical, short, and Shorts video identifiers", () => {
    expect(
      extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(
      extractYouTubeVideoId("https://youtube.com/shorts/dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
    expect(
      extractYouTubeVideoId("https://example.com/watch?v=dQw4w9WgXcQ"),
    ).toBeNull();
  });

  it("weights CTR by impressions", () => {
    expect(
      weightedAverage([
        { value: 10, weight: 100 },
        { value: 5, weight: 300 },
      ]),
    ).toBe(6.25);
  });

  it("turns metric patterns into an actionable category recommendation", () => {
    expect(
      categoryRecommendation({
        clickThroughRate: 3.5,
        averagePercentageViewed: 45,
        subscribersPerThousandViews: 2,
      }),
    ).toContain("썸네일");
  });
});
