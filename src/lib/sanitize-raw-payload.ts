const REDACTED_UTTERANCE_TEXT = "[redacted — see Transcript tab]";

/**
 * Safe Raw JSON view when PII redaction was requested — omits word-level text
 * that may still appear in the provider payload.
 */
export function rawPayloadForDisplay(
  raw: unknown,
  options: { redactEnabled: boolean; redactedTranscript?: string }
): unknown {
  if (!options.redactEnabled || raw == null || typeof raw !== "object") {
    return raw;
  }

  const source = raw as Record<string, unknown>;
  const copy: Record<string, unknown> = { ...source };

  if (typeof options.redactedTranscript === "string") {
    copy.text = options.redactedTranscript;
  }

  delete copy.words;

  if (Array.isArray(copy.utterances)) {
    copy.utterances = copy.utterances.map((entry) => {
      if (entry == null || typeof entry !== "object") return entry;
      const u = entry as Record<string, unknown>;
      return {
        ...u,
        text: u.text != null ? REDACTED_UTTERANCE_TEXT : u.text,
      };
    });
  }

  copy._displayNote =
    "PII redaction was enabled. Word-level timing and raw utterance text are omitted from this view.";

  return copy;
}
