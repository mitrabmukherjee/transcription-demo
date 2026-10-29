import { describe, expect, it } from "vitest";
import { rawPayloadForDisplay } from "@/lib/sanitize-raw-payload";

describe("rawPayloadForDisplay", () => {
  it("returns raw unchanged when redaction is off", () => {
    const raw = { text: "secret", words: [{ text: "secret" }] };
    expect(rawPayloadForDisplay(raw, { redactEnabled: false })).toBe(raw);
  });

  it("strips words and replaces utterance text when redaction is on", () => {
    const raw = {
      text: "unredacted",
      words: [{ text: "ssn" }],
      utterances: [{ speaker: "A", text: "call me" }],
    };
    const view = rawPayloadForDisplay(raw, {
      redactEnabled: true,
      redactedTranscript: "redacted transcript",
    }) as Record<string, unknown>;

    expect(view.text).toBe("redacted transcript");
    expect(view.words).toBeUndefined();
    expect(view.utterances).toEqual([
      { speaker: "A", text: "[redacted — see Transcript tab]" },
    ]);
    expect(view._displayNote).toContain("PII redaction");
  });
});
