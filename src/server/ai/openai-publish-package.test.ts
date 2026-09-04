import { afterEach, describe, expect, it, vi } from "vitest";

import { runOpenAIPublishPackage } from "./openai-publish-package";

afterEach(() => vi.restoreAllMocks());

describe("OpenAI publish package adapter", () => {
  it("requests strict structured output and validates the package", async () => {
    const content = {
      titleOptions: [
        "A Korean Tiger Heard a Baby Cry — Then Everything Changed",
        "The Night a Tiger Feared One Strange Korean Word",
        "Why Korea's Fiercest Tiger Ran Into the Mountains",
      ],
      selectedTitle: null,
      description:
        "Come closer for a gentle Korean folktale told by Halmeoni. This old story follows a tiger into an unexpected night of fear and wonder.",
      chapters: [
        { startSeconds: 0, title: "Halmeoni's Welcome" },
        { startSeconds: 62, title: "The Tiger Arrives" },
        { startSeconds: 300, title: "A Quiet Farewell" },
      ],
      tags: ["Korean folklore", "bedtime story", "tiger", "K-Lore", "folktale"],
      thumbnail: {
        headline: "THE TIGER FLED",
        visualHook: "A startled tiger outside a warm hanok at night.",
        imagePrompt:
          "Create a cinematic Korean folk-art inspired watercolor thumbnail showing a startled tiger outside a warm hanok at night, with strong readable silhouettes and no text in the generated image.",
      },
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "response-1",
          status: "completed",
          output: [
            {
              content: [{ type: "output_text", text: JSON.stringify(content) }],
            },
          ],
          usage: { input_tokens: 100, output_tokens: 200 },
        }),
        { status: 200 },
      ),
    );
    const result = await runOpenAIPublishPackage({
      apiKey: "secret",
      categorySlug: "strange-tales",
      model: "gpt-5.5",
      scenes: [
        { startSeconds: 0, title: "Opening", description: "Halmeoni opens" },
        { startSeconds: 62, title: "Tiger", description: "Tiger arrives" },
        { startSeconds: 300, title: "Ending", description: "Story ends" },
      ],
      scriptTitle: "The Tiger and the Dried Persimmon",
      synopsis: "A tiger misunderstands what frightens a crying baby.",
      titleRules: { priority: "curiosity" },
    });
    expect(result.content.titleOptions).toHaveLength(3);
    const request = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(request.text.format.strict).toBe(true);
    expect(request.store).toBe(false);
    expect(request.input).toContain("SCENE TIMELINE");
  });
});
