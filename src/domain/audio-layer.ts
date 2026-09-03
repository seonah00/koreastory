import { z } from "zod";

export const soundAssetUploadSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    rights: z.enum(["owned", "licensed", "public_domain", "cc0"]),
    sourceUrl: z.union([z.url(), z.literal("")]),
    attribution: z.string().trim().max(500),
  })
  .refine((value) => value.rights === "owned" || Boolean(value.sourceUrl), {
    message: "Licensed and public audio require a source URL.",
    path: ["sourceUrl"],
  });

export const audioLayerSchema = z
  .object({
    ideaId: z.uuid(),
    assetId: z.uuid(),
    sceneId: z.union([z.uuid(), z.literal("")]),
    layerType: z.enum(["bgm", "ambience", "sfx"]),
    label: z.string().trim().min(1).max(120),
    startSeconds: z.coerce.number().min(0).max(21600),
    endSeconds: z.union([
      z.coerce.number().positive().max(21600),
      z.literal(""),
    ]),
    volumeDb: z.coerce.number().min(-60).max(6),
    fadeInSeconds: z.coerce.number().min(0).max(30),
    fadeOutSeconds: z.coerce.number().min(0).max(30),
    loop: z.coerce.boolean(),
    notes: z.string().trim().max(1000),
  })
  .refine(
    (value) => value.endSeconds === "" || value.endSeconds > value.startSeconds,
    { message: "End must be after start.", path: ["endSeconds"] },
  );

export const audioLayerApprovalSchema = z.object({
  ideaId: z.uuid(),
  layerId: z.uuid(),
});
