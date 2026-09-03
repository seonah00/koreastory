import { afterEach, describe, expect, it, vi } from "vitest";

import { runOpenAIImage, runOpenAIImageEdit } from "@/server/ai/openai-image";

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

describe("runOpenAIImageEdit", () => {
  it("sends approved references as repeated multipart image fields", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [{ b64_json: Buffer.from("edited").toString("base64") }],
          }),
          { status: 200 },
        ),
      );
    const result = await runOpenAIImageEdit({
      apiKey: "secret",
      model: "gpt-image-2",
      prompt: "keep her face",
      references: [
        {
          bytes: Uint8Array.from([0x89, 0x50]),
          mimeType: "image/png",
          name: "front.png",
        },
        {
          bytes: Uint8Array.from([0xff, 0xd8]),
          mimeType: "image/jpeg",
          name: "profile.jpg",
        },
      ],
    });
    expect(result.bytes.toString()).toBe("edited");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/images/edits");
    expect(init?.body).toBeInstanceOf(FormData);
    const body = init?.body as FormData;
    expect(body.getAll("image[]")).toHaveLength(2);
    expect(body.get("model")).toBe("gpt-image-2");
    expect(
      (init?.headers as Record<string, string>)["Content-Type"],
    ).toBeUndefined();
  });
});
