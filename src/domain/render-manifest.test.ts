import { describe, expect, it } from "vitest";

import {
  captionStyleForCategory,
  captionsToSrt,
  captionsToWebVtt,
  createCaptionCues,
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

  it("splits narration into timed caption cues and exports VTT/SRT", () => {
    const cues = createCaptionCues({
      durationInFrames: 180,
      fps: 30,
      segmentId: "11111111-1111-4111-8111-111111111111",
      startFrame: 30,
      text: "Come closer. I have an old Korean story to tell you tonight.",
    });
    expect(cues).toHaveLength(2);
    expect(cues[0].startFrame).toBe(30);
    expect(cues.at(-1)?.endFrame).toBe(210);
    expect(captionsToWebVtt(cues, 30)).toContain("00:00:01.000 -->");
    expect(captionsToSrt(cues, 30)).toContain("00:00:01,000 -->");
  });

  it("uses a quieter subtitle treatment for sleep stories", () => {
    const sleep = captionStyleForCategory("stories-for-sleep");
    const strange = captionStyleForCategory("strange-tales");
    expect(sleep.fontSize).toBeLessThan(strange.fontSize);
    expect(sleep.backgroundColor).not.toBe(strange.backgroundColor);
  });
});
