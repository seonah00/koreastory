import { afterEach, describe, expect, it, vi } from "vitest";

import { runOpenAIImage } from "@/server/ai/openai-image";

afterEach(() => vi.restoreAllMocks());

describe("OpenAI image adapter", () => {
  it("decodes a persisted image response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              b64_json: Buffer.from("image").toString("base64"),
              revised_prompt: "revised",
            },
          ],
          usage: { input_tokens: 10, output_tokens: 20 },
        }),
        { status: 200 },
      ),
    );
    const result = await runOpenAIImage({
      apiKey: "test",
      model: "gpt-image-2",
      prompt: "draw",
    });
    expect(result.bytes.toString()).toBe("image");
    expect(result.revisedPrompt).toBe("revised");
  });
});
