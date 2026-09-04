import { z } from "zod";

export const chapterSchema = z.object({
  startSeconds: z.number().int().nonnegative(),
  title: z.string().min(2).max(80),
});

export const publishPackageContentSchema = z.object({
  titleOptions: z.array(z.string().min(20).max(100)).min(3).max(5),
  selectedTitle: z.string().min(20).max(100).nullable().default(null),
  description: z.string().min(100).max(5_000),
  chapters: z
    .array(chapterSchema)
    .min(3)
    .max(30)
    .refine(
      (chapters) =>
        chapters[0]?.startSeconds === 0 &&
        chapters.every(
          (chapter, index) =>
            index === 0 ||
            chapter.startSeconds > chapters[index - 1].startSeconds,
        ),
      { message: "Chapters must start at zero and be strictly increasing." },
    ),
  tags: z.array(z.string().min(1).max(40)).min(5).max(15),
  thumbnail: z.object({
    headline: z.string().min(2).max(32),
    visualHook: z.string().min(10).max(240),
    imagePrompt: z.string().min(80).max(2_000),
  }),
});

export const publishPackageRequestSchema = z.object({ ideaId: z.uuid() });
export const publishPackageVersionSchema = z.object({
  ideaId: z.uuid(),
  publishPackageVersionId: z.uuid(),
});
export const selectPublishTitleSchema = publishPackageVersionSchema.extend({
  selectedTitle: z.string().min(20).max(100),
});

export type PublishPackageContent = z.infer<typeof publishPackageContentSchema>;

export function chapterTimestamp(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function packageToText(content: PublishPackageContent) {
  return [
    content.selectedTitle ?? content.titleOptions[0],
    "",
    content.description,
    "",
    "CHAPTERS",
    ...content.chapters.map(
      (chapter) => `${chapterTimestamp(chapter.startSeconds)} ${chapter.title}`,
    ),
    "",
    `TAGS\n${content.tags.join(", ")}`,
    "",
    `THUMBNAIL\n${content.thumbnail.headline}\n${content.thumbnail.visualHook}`,
  ].join("\n");
}
