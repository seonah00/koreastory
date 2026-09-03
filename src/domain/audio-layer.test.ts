import { describe, expect, it } from "vitest";

import { audioLayerSchema, soundAssetUploadSchema } from "@/domain/audio-layer";

describe("audio layer contracts", () => {
  it("requires provenance for third-party sounds", () => {
    expect(
      soundAssetUploadSchema.safeParse({
        title: "Rain",
        rights: "licensed",
        sourceUrl: "",
        attribution: "",
      }).success,
    ).toBe(false);
    expect(
      soundAssetUploadSchema.safeParse({
        title: "Rain",
        rights: "cc0",
        sourceUrl: "https://example.com/rain",
        attribution: "Creator",
      }).success,
    ).toBe(true);
  });

  it("rejects an invalid timeline range", () => {
    const base = {
      ideaId: "00000000-0000-4000-8000-000000000001",
      assetId: "00000000-0000-4000-8000-000000000002",
      sceneId: "",
      layerType: "bgm",
      label: "Warm bed",
      startSeconds: 20,
      endSeconds: 10,
      volumeDb: -24,
      fadeInSeconds: 1,
      fadeOutSeconds: 1,
      loop: true,
      notes: "",
    };
    expect(audioLayerSchema.safeParse(base).success).toBe(false);
    expect(
      audioLayerSchema.safeParse({ ...base, endSeconds: 60 }).success,
    ).toBe(true);
  });
});
