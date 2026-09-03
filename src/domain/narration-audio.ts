import { z } from "zod";

export const narrationAudioRequestSchema = z.object({
  ideaId: z.uuid(),
  scriptSegmentId: z.uuid(),
});

const voiceNames = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "onyx",
  "nova",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar",
] as const;

const voiceConfigSchema = z.object({
  providerVoice: z.enum(voiceNames).default("sage"),
  speakingRate: z.coerce.number().min(0.25).max(4).default(0.85),
  tone: z.string().min(1).max(500).default("warm, calm, restrained"),
  paragraphPauseSeconds: z.coerce.number().min(0).max(5).default(1.2),
  bedtimeSoftness: z.string().max(120).default("high"),
  acting: z
    .string()
    .max(500)
    .default("natural with no exaggerated performance"),
  whisper: z.boolean().default(false),
});

export function parseHalmeoniVoice(value: unknown) {
  const parsed = voiceConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : voiceConfigSchema.parse({});
}

export function composeVoiceInstructions(
  config: ReturnType<typeof parseHalmeoniVoice>,
  emotion?: string | null,
) {
  return [
    "Narrate as the recurring K-Lore Halmeoni, an older Korean grandmother speaking natural, globally understandable English.",
    `Tone: ${config.tone}. Acting: ${config.acting}.`,
    `Bedtime softness: ${config.bedtimeSoftness}. Emotion for this segment: ${emotion ?? "warm and restrained"}.`,
    `Use approximately ${config.paragraphPauseSeconds} seconds of breathing space between paragraphs.`,
    config.whisper
      ? "Use a gentle whisper."
      : "Do not whisper. Keep articulation clear and intimate.",
    "Keep the same vocal identity, accent, pacing, and emotional restraint across every segment. Do not add words.",
  ].join(" ");
}
