import { afterEach, describe, expect, it, vi } from "vitest";

import { runOpenAISpeech } from "@/server/ai/openai-speech";

afterEach(() => vi.restoreAllMocks());

describe("OpenAI speech adapter", () => {
  it("requests a stable MP3 narration voice", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(Uint8Array.from([0x49, 0x44, 0x33])));
    const result = await runOpenAISpeech({
      apiKey: "secret",
      model: "gpt-4o-mini-tts",
      input: "Long ago in Korea...",
      voice: "sage",
      instructions: "Warm and restrained.",
      speed: 0.85,
    });
    expect(result.bytes.byteLength).toBe(3);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/audio/speech");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "gpt-4o-mini-tts",
      voice: "sage",
      speed: 0.85,
      response_format: "mp3",
    });
  });
});
