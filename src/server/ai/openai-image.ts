import { z } from "zod";

const imageResponseSchema = z.object({
  data: z
    .array(
      z.object({
        b64_json: z.string().min(1),
        revised_prompt: z.string().optional(),
      }),
    )
    .min(1),
  usage: z
    .object({
      input_tokens: z.number().optional(),
      output_tokens: z.number().optional(),
    })
    .optional(),
});

export async function runOpenAIImage({
  apiKey,
  model,
  prompt,
}: {
  apiKey: string;
  model: string;
  prompt: string;
}) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: "1536x1024",
      quality: "medium",
      output_format: "webp",
      output_compression: 88,
      moderation: "auto",
    }),
    signal: AbortSignal.timeout(300_000),
  });
  const raw: unknown = await response.json();
  if (!response.ok) {
    const message =
      raw && typeof raw === "object" && "error" in raw
        ? JSON.stringify((raw as { error: unknown }).error)
        : response.statusText;
    throw new Error(`OpenAI image generation failed: ${message}`);
  }
  const parsed = imageResponseSchema.parse(raw);
  return {
    bytes: Buffer.from(parsed.data[0].b64_json, "base64"),
    revisedPrompt: parsed.data[0].revised_prompt,
    usage: parsed.usage,
  };
}
