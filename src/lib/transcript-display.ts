import type { NormalizedResult } from "@/lib/types";

/** Preview/copy paragraph list when API paragraphs are empty. */
export function resolveTranscriptParagraphs(normalized: NormalizedResult): string[] {
  if (normalized.paragraphs.length > 0) {
    return normalized.paragraphs;
  }
  const text = normalized.transcript;
  if (!text.trim()) return [];

  const steoraFormatted =
    Boolean(normalized.meta?.steoraPunctuation || normalized.meta?.verbatimMode) &&
    normalized.utterances.length > 0;

  if (steoraFormatted) {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return [text];
}
