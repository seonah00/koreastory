import { z } from "zod";

export const scenePlanRequestSchema = z.object({ ideaId: z.uuid() });

export const cameraMotionSchema = z.enum([
  "static",
  "slow-push-in",
  "slow-pull-out",
  "slow-pan-left",
  "slow-pan-right",
  "gentle-tilt",
]);

export const sceneSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(20).max(1200),
  visualPrompt: z.string().min(30).max(2400),
  negativePrompt: z.string().min(5).max(600),
  cameraMotion: cameraMotionSchema,
  ambience: z.string().min(3).max(300),
  durationSeconds: z.number().int().min(10).max(600),
  scriptSegmentPositions: z.array(z.number().int().min(0)).min(1).max(12),
});

export const generatedScenePlanSchema = z.object({
  scenes: z.array(sceneSchema).min(4).max(20),
});

export const approveScenePlanSchema = z.object({
  ideaId: z.uuid(),
  scenePlanId: z.uuid(),
});

export type ScenePlan = z.infer<typeof generatedScenePlanSchema>;

export function validateSceneCoverage(plan: ScenePlan, segmentCount: number) {
  const positions = plan.scenes.flatMap(
    (scene) => scene.scriptSegmentPositions,
  );
  const unique = new Set(positions);
  const expected = Array.from({ length: segmentCount }, (_, index) => index);
  return {
    isComplete:
      unique.size === segmentCount &&
      positions.every((position) => position < segmentCount) &&
      expected.every((position) => unique.has(position)),
    positions,
  };
}

export function recommendedSceneCount(targetMinutes: number) {
  if (targetMinutes <= 15) return 8;
  if (targetMinutes <= 20) return 11;
  if (targetMinutes <= 30) return 14;
  return 18;
}
