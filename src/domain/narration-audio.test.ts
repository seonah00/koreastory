import { describe, expect, it } from "vitest";

import {
  composeVoiceInstructions,
  parseHalmeoniVoice,
} from "@/domain/narration-audio";

describe("Halmeoni narration voice", () => {
  it("uses safe defaults for an incomplete Bible entry", () => {
    const voice = parseHalmeoniVoice({ tone: "soft and wise" });
    expect(voice.providerVoice).toBe("sage");
    expect(voice.speakingRate).toBe(0.85);
    expect(composeVoiceInstructions(voice, "mysterious")).toContain(
      "mysterious",
    );
  });
});
