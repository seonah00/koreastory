import { z } from "zod";

export const sceneImageRequestSchema = z.object({
  ideaId: z.uuid(),
  sceneId: z.uuid(),
});

export const assetApprovalSchema = z.object({ assetId: z.uuid() });

type Rules = Record<string, unknown>;

function text(value: unknown) {
  if (typeof value === "string") return value;
  if (Array.isArray(value))
    return value.filter((item) => typeof item === "string").join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return "";
}

export function composeSceneImagePrompt({
  bible,
  categoryRules,
  isFramingScene,
  scene,
}: {
  bible: { master?: Rules; halmeoni?: Rules; house?: Rules };
  categoryRules: Rules;
  isFramingScene: boolean;
  scene: {
    description: string;
    negativePrompt: string | null;
    position: number;
    title: string | null;
    visualPrompt: string | null;
  };
}) {
  const continuity = isFramingScene
    ? `Recurring narrator: ${text(bible.halmeoni)}\nRecurring room: ${text(bible.house)}`
    : "Do not show the narrator unless the scene explicitly calls for her.";

  return [
    "Draw a cinematic 16:9 K-Lore storybook illustration.",
    `MASTER STYLE\n${text(bible.master)}`,
    `CATEGORY PRESET\n${text(categoryRules)}`,
    `SCENE ${scene.position + 1}: ${scene.title ?? "Untitled"}\n${scene.description}\n${scene.visualPrompt ?? ""}`,
    `CONTINUITY\n${continuity}`,
    `AVOID\n${scene.negativePrompt ?? ""}\nNo text, subtitles, logo, watermark, modern objects, photorealism, glossy 3D, anime, generic Chinese or Japanese architecture.`,
  ].join("\n\n");
}

export const sceneImageCostUsd = 0.041;
