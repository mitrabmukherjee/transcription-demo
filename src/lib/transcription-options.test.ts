import { describe, expect, it } from "vitest";
import {
  applyVerbatimPreset,
  createDefaultTranscriptionOptions,
} from "@/lib/transcription-options";

describe("createDefaultTranscriptionOptions", () => {
  it("enables diarization-related toggles to match verbatim defaults", () => {
    const opts = createDefaultTranscriptionOptions();
    expect(opts.verbatimMode).toBe(true);
    expect(opts.diarize).toBe(true);
    expect(opts.utterances).toBe(true);
    expect(opts.paragraphs).toBe(true);
    expect(opts.speakerIdentification).toBe(true);
    expect(opts.steoraPunctuation).toBe(true);
    expect(opts.smartFormat).toBe(false);
    expect(opts.fillerWords).toBe(true);
  });
});

describe("applyVerbatimPreset", () => {
  it("forces paragraphs on when applied", () => {
    const next = applyVerbatimPreset({
      summarize: false,
      topics: false,
      smartFormat: true,
      punctuation: false,
      paragraphs: false,
      utterances: false,
      profanityFilter: false,
      redact: false,
      diarize: false,
      fillerWords: false,
      verbatimMode: true,
      speakerIdentification: false,
      steoraPunctuation: false,
      steoraLlmPass: false,
      knownSpeakerNames: "",
    });
    expect(next.paragraphs).toBe(true);
    expect(next.diarize).toBe(true);
  });
});
