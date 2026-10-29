import type { TranscriptionOptions } from "@/lib/types";

/** Align dependent toggles when Steora verbatim deliverable is enabled. */
export function applyVerbatimPreset(
  options: TranscriptionOptions
): TranscriptionOptions {
  return {
    ...options,
    smartFormat: false,
    fillerWords: true,
    diarize: true,
    utterances: true,
    punctuation: true,
    paragraphs: true,
    speakerIdentification: true,
    steoraPunctuation: true,
  };
}

/** Initial workspace options (verbatim on by default, UI matches server behavior). */
export function createDefaultTranscriptionOptions(): TranscriptionOptions {
  return applyVerbatimPreset({
    summarize: false,
    topics: false,
    smartFormat: true,
    punctuation: true,
    paragraphs: false,
    utterances: false,
    profanityFilter: false,
    redact: false,
    diarize: false,
    fillerWords: false,
    verbatimMode: true,
    speakerIdentification: true,
    steoraPunctuation: true,
    steoraLlmPass: false,
    knownSpeakerNames: "",
  });
}
