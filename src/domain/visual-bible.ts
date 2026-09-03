import { z } from "zod";

export const bibleKindSchema = z.enum([
  "brand",
  "character",
  "world",
  "style",
  "voice",
]);

export const bibleEntryVersionSchema = z.object({
  entryId: z.uuid(),
  kind: bibleKindSchema,
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(2).max(120),
  content: z
    .string()
    .min(2)
    .max(20000)
    .transform((value, context) => {
      try {
        const parsed: unknown = JSON.parse(value);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          context.addIssue({
            code: "custom",
            message: "Content must be a JSON object.",
          });
          return z.NEVER;
        }
        return parsed as Record<string, unknown>;
      } catch {
        context.addIssue({ code: "custom", message: "Invalid JSON." });
        return z.NEVER;
      }
    }),
});

export const approveBibleEntrySchema = z.object({ entryId: z.uuid() });

export const newBibleEntrySchema = bibleEntryVersionSchema.omit({
  entryId: true,
});

export const categoryVisualPresetSchema = z.object({
  categoryId: z.uuid(),
  palette: z.string().trim().min(3).max(300),
  lighting: z.string().trim().min(3).max(400),
  composition: z.string().trim().min(3).max(500),
  atmosphere: z.string().trim().min(3).max(300),
  styleModifiers: z.string().trim().min(3).max(600),
});

export function latestBibleEntries<
  T extends { kind: string; slug: string; version: number },
>(entries: T[]) {
  const latest = new Map<string, T>();
  for (const entry of entries) {
    const key = `${entry.kind}:${entry.slug}`;
    const current = latest.get(key);
    if (!current || entry.version > current.version) latest.set(key, entry);
  }
  return [...latest.values()];
}
