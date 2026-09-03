import { z } from "zod";

const uuid = z.string().uuid();

export const renderAssetSchema = z.object({
  id: uuid,
  bucket: z.string().min(1),
  path: z.string().min(1),
  mimeType: z.string().min(1),
  checksumSha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .nullable(),
});

export const renderManifestSchema = z.object({
  schemaVersion: z.literal(1),
  composition: z.object({
    id: z.literal("KLoreEpisode"),
    width: z.literal(1920),
    height: z.literal(1080),
    fps: z.literal(30),
    durationInFrames: z.number().int().positive(),
  }),
  source: z.object({
    episodeId: uuid,
    scenePlanVersionId: uuid,
    scriptVersionId: uuid,
  }),
  scenes: z
    .array(
      z.object({
        id: uuid,
        position: z.number().int().nonnegative(),
        title: z.string(),
        startFrame: z.number().int().nonnegative(),
        durationInFrames: z.number().int().positive(),
        cameraMotion: z.enum(["slow_push_in", "slow_pan", "static"]),
        image: renderAssetSchema,
        narration: z.array(
          z.object({
            segmentId: uuid,
            startFrame: z.number().int().nonnegative(),
            durationInFrames: z.number().int().positive(),
            asset: renderAssetSchema,
          }),
        ),
      }),
    )
    .min(1),
  audioLayers: z.array(
    z.object({
      id: uuid,
      type: z.enum(["bgm", "ambience", "sfx"]),
      label: z.string().min(1),
      startFrame: z.number().int().nonnegative(),
      durationInFrames: z.number().int().positive(),
      volumeDb: z.number().min(-60).max(6),
      fadeInFrames: z.number().int().nonnegative(),
      fadeOutFrames: z.number().int().nonnegative(),
      loop: z.boolean(),
      asset: renderAssetSchema,
    }),
  ),
});

export const renderVersionRequestSchema = z.object({ ideaId: uuid });
export const renderVersionApprovalSchema = z.object({
  ideaId: uuid,
  renderVersionId: uuid,
});

export type RenderManifest = z.infer<typeof renderManifestSchema>;
export type RenderAsset = z.infer<typeof renderAssetSchema>;
export type ResolvedRenderAsset = RenderAsset & { url: string };
export type ResolvedRenderManifest = Omit<
  RenderManifest,
  "scenes" | "audioLayers"
> & {
  scenes: Array<
    Omit<RenderManifest["scenes"][number], "image" | "narration"> & {
      image: ResolvedRenderAsset;
      narration: Array<
        Omit<RenderManifest["scenes"][number]["narration"][number], "asset"> & {
          asset: ResolvedRenderAsset;
        }
      >;
    }
  >;
  audioLayers: Array<
    Omit<RenderManifest["audioLayers"][number], "asset"> & {
      asset: ResolvedRenderAsset;
    }
  >;
};

export function millisecondsToFrames(milliseconds: number, fps = 30) {
  return Math.max(1, Math.round((milliseconds / 1000) * fps));
}

export function dbToLinearVolume(db: number) {
  return Math.min(2, Math.max(0, 10 ** (db / 20)));
}
