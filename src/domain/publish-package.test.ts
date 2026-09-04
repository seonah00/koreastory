import { describe, expect, it } from "vitest";

import { chapterTimestamp, packageToText } from "./publish-package";

describe("publish package", () => {
  it("formats YouTube chapter timestamps", () => {
    expect(chapterTimestamp(0)).toBe("0:00");
    expect(chapterTimestamp(65)).toBe("1:05");
    expect(chapterTimestamp(3_665)).toBe("1:01:05");
  });

  it("exports the selected title and chapter list", () => {
    const text = packageToText({
      titleOptions: [
        "A Korean Tiger Heard a Baby Cry — Then Everything Changed",
        "The Night a Tiger Feared One Strange Korean Word",
        "Why Korea's Fiercest Tiger Ran Into the Mountains",
      ],
      selectedTitle: "The Night a Tiger Feared One Strange Korean Word",
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
    });
    expect(text).toContain("The Night a Tiger Feared");
    expect(text).toContain("1:02 The Tiger Arrives");
  });
});
