import { z } from "zod";

const uuid = z.string().uuid();

export const captionStyleSchema = z.object({
  textColor: z.string().regex(/^#[a-fA-F0-9]{6}$/),
  backgroundColor: z.string().regex(/^rgba\([^)]+\)$/),
  fontSize: z.number().int().min(32).max(72),
  maxWidthPercent: z.number().int().min(50).max(90),
  bottomPercent: z.number().int().min(4).max(20),
});

export const captionCueSchema = z
  .object({
    segmentId: uuid,
    startFrame: z.number().int().nonnegative(),
    endFrame: z.number().int().positive(),
    text: z.string().min(1).max(180),
  })
  .refine((cue) => cue.endFrame > cue.startFrame, {
    message: "Caption cue must have a positive duration.",
  });

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
  captions: z
    .object({
      language: z.literal("en"),
      style: captionStyleSchema,
      cues: z.array(captionCueSchema),
    })
    .optional(),
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

export function captionStyleForCategory(categorySlug: string) {
  const shared = { fontSize: 48, maxWidthPercent: 78, bottomPercent: 8 };
  switch (categorySlug) {
    case "strange-tales":
      return {
        ...shared,
        textColor: "#F1F1EC",
        backgroundColor: "rgba(8,12,20,0.76)",
      };
    case "korean-legends":
      return {
        ...shared,
        textColor: "#FFF1B8",
        backgroundColor: "rgba(25,18,10,0.72)",
      };
    case "stories-for-sleep":
      return {
        ...shared,
        fontSize: 42,
        textColor: "#E6E3D8",
        backgroundColor: "rgba(12,19,27,0.58)",
      };
    case "old-korean-wisdom":
      return {
        ...shared,
        textColor: "#F5E9D0",
        backgroundColor: "rgba(31,24,17,0.68)",
      };
    default:
      return {
        ...shared,
        textColor: "#FFF8E8",
        backgroundColor: "rgba(35,27,18,0.64)",
      };
  }
}

export function createCaptionCues({
  durationInFrames,
  fps,
  segmentId,
  startFrame,
  text,
}: {
  durationInFrames: number;
  fps: number;
  segmentId: string;
  startFrame: number;
  text: string;
}) {
  const sentences = text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .flatMap((sentence) => {
      if (sentence.length <= 84) return [sentence];
      const words = sentence.split(/\s+/);
      const chunks: string[] = [];
      for (const word of words) {
        const last = chunks.at(-1);
        if (!last || `${last} ${word}`.length > 84) chunks.push(word);
        else chunks[chunks.length - 1] = `${last} ${word}`;
      }
      return chunks;
    })
    .filter(Boolean);
  if (!sentences.length) return [];
  const availableSentences = sentences.slice(0, durationInFrames);
  const weights = availableSentences.map((sentence) =>
    Math.max(1, sentence.length),
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = startFrame;
  return availableSentences.map((sentence, index) => {
    const remainingFrames = startFrame + durationInFrames - cursor;
    const remainingCues = availableSentences.length - index;
    const proportional = Math.round(
      (durationInFrames * weights[index]) / totalWeight,
    );
    const desired = Math.max(Math.min(fps, remainingFrames), proportional);
    const duration =
      index === availableSentences.length - 1
        ? remainingFrames
        : Math.max(1, Math.min(desired, remainingFrames - remainingCues + 1));
    const endFrame = cursor + duration;
    const cue = { segmentId, startFrame: cursor, endFrame, text: sentence };
    cursor = endFrame;
    return cue;
  });
}

function timestampFromFrame(frame: number, fps: number, srt: boolean) {
  const milliseconds = Math.round((frame / fps) * 1_000);
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1_000);
  const millis = milliseconds % 1_000;
  const separator = srt ? "," : ".";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}${separator}${String(millis).padStart(3, "0")}`;
}

export function captionsToWebVtt(
  cues: Array<z.infer<typeof captionCueSchema>>,
  fps: number,
) {
  return `WEBVTT\n\n${cues
    .map(
      (cue) =>
        `${timestampFromFrame(cue.startFrame, fps, false)} --> ${timestampFromFrame(cue.endFrame, fps, false)}\n${cue.text.replaceAll("-->", "→")}`,
    )
    .join("\n\n")}\n`;
}

export function captionsToSrt(
  cues: Array<z.infer<typeof captionCueSchema>>,
  fps: number,
) {
  return `${cues
    .map(
      (cue, index) =>
        `${index + 1}\n${timestampFromFrame(cue.startFrame, fps, true)} --> ${timestampFromFrame(cue.endFrame, fps, true)}\n${cue.text}`,
    )
    .join("\n\n")}\n`;
}
