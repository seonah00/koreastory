import { z } from "zod";

export const scriptRequestSchema = z.object({
  ideaId: z.uuid(),
});

export const scriptSegmentSchema = z.object({
  segmentType: z.enum(["opening", "story", "reflection", "closing"]),
  narration: z.string().min(80).max(5000),
  emotion: z.string().min(2).max(120),
  estimatedDurationSeconds: z.number().int().min(20).max(360),
});

export const generatedScriptSchema = z.object({
  title: z.string().min(8).max(180),
  segments: z.array(scriptSegmentSchema).min(6).max(30),
});

export const manualScriptSchema = z.object({
  ideaId: z.uuid(),
  title: z.string().trim().min(8).max(180),
  fullText: z.string().trim().min(500).max(60000),
});

export const approveScriptSchema = z.object({
  ideaId: z.uuid(),
  scriptId: z.uuid(),
});

export type GeneratedScript = z.infer<typeof generatedScriptSchema>;

export function scriptWordCount(script: GeneratedScript) {
  return script.segments.reduce(
    (total, segment) =>
      total + segment.narration.trim().split(/\s+/).filter(Boolean).length,
    0,
  );
}

export function validateScriptLength(
  script: GeneratedScript,
  targetMinutes: number,
) {
  const minimumWords = Math.max(700, Math.round(targetMinutes * 80));
  return {
    wordCount: scriptWordCount(script),
    minimumWords,
    isLongEnough: scriptWordCount(script) >= minimumWords,
  };
}

export function manualSegments(fullText: string) {
  return fullText
    .split(/\n\s*\n/)
    .map((narration) => narration.trim())
    .filter(Boolean)
    .map((narration, index, all) => ({
      segmentType:
        index === 0
          ? "opening"
          : index === all.length - 1
            ? "closing"
            : "story",
      narration,
      emotion: "Natural, warm, and restrained",
      estimatedDurationSeconds: Math.max(
        20,
        Math.round((narration.split(/\s+/).filter(Boolean).length / 125) * 60),
      ),
    }));
}
