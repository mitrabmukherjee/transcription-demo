import { describe, expect, it } from "vitest";
import { resolveTranscriptParagraphs } from "@/lib/transcript-display";
import type { NormalizedResult } from "@/lib/types";

function baseNormalized(overrides: Partial<NormalizedResult> = {}): NormalizedResult {
  return {
    transcript: "",
    paragraphs: [],
    summary: null,
    topics: [],
    piiEntities: [],
    utterances: [],
    meta: {
      verbatimMode: false,
      speakerIdentification: false,
      steoraPunctuation: false,
      steoraLlmPass: false,
      redact: false,
    },
    ...overrides,
  };
}

describe("resolveTranscriptParagraphs", () => {
  it("uses API paragraphs when present", () => {
    const result = resolveTranscriptParagraphs(
      baseNormalized({ paragraphs: ["One", "Two"] })
    );
    expect(result).toEqual(["One", "Two"]);
  });

  it("splits Steora multiline transcript when paragraphs are empty", () => {
    const result = resolveTranscriptParagraphs(
      baseNormalized({
        transcript: "Speaker A: Hello\nSpeaker B: Hi",
        utterances: [{ speaker: "Speaker A", start: 0, end: 1, text: "Hello" }],
        meta: {
          verbatimMode: true,
          speakerIdentification: false,
          steoraPunctuation: true,
          steoraLlmPass: false,
          redact: false,
        },
      })
    );
    expect(result).toEqual(["Speaker A: Hello", "Speaker B: Hi"]);
  });
});
