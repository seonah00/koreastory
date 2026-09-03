import { describe, expect, it } from "vitest";

import {
  dbToLinearVolume,
  millisecondsToFrames,
  renderManifestSchema,
} from "./render-manifest";

const asset = {
  id: "11111111-1111-4111-8111-111111111111",
  bucket: "k-lore-assets",
  path: "workspace/image.webp",
  mimeType: "image/webp",
  checksumSha256: "a".repeat(64),
};

describe("render manifest", () => {
  it("accepts a deterministic Remotion composition contract", () => {
    const result = renderManifestSchema.safeParse({
      schemaVersion: 1,
      composition: {
        id: "KLoreEpisode",
        width: 1920,
        height: 1080,
        fps: 30,
        durationInFrames: 300,
      },
      source: {
        episodeId: "22222222-2222-4222-8222-222222222222",
        scenePlanVersionId: "33333333-3333-4333-8333-333333333333",
        scriptVersionId: "44444444-4444-4444-8444-444444444444",
      },
      scenes: [
        {
          id: "55555555-5555-4555-8555-555555555555",
          position: 0,
          title: "Opening",
          startFrame: 0,
          durationInFrames: 300,
          cameraMotion: "slow_push_in",
          image: asset,
          narration: [],
        },
      ],
      audioLayers: [],
    });
    expect(result.success).toBe(true);
  });

  it("converts timeline units without zero-frame clips", () => {
    expect(millisecondsToFrames(0)).toBe(1);
    expect(millisecondsToFrames(1_000)).toBe(30);
    expect(dbToLinearVolume(-6)).toBeCloseTo(0.501, 3);
  });
});
