import type { SpeakerSegment } from "@/lib/types";

/** Word object shape from AssemblyAI transcript.words */
export interface TranscriptWordLike {
  text: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: string | null;
}

const INDISCERNIBLE_THRESHOLD = 0.55;
const INTERRUPTION_GAP_MS = 250;
const TRAILING_OFF_PATTERN = /[.!?…"')\]]$/;

/**
 * Replace low-confidence tokens in an utterance with [indiscernible].
 */
export function tagLowConfidenceWords(
  utteranceStartMs: number,
  utteranceEndMs: number,
  words: TranscriptWordLike[]
): string {
  const slice = words.filter(
    (w) =>
      w.end > utteranceStartMs - 50 && w.start < utteranceEndMs + 50
  );
  if (slice.length === 0) return "";

  return slice
    .map((w) => {
      const token = w.text.trim();
      if (!token) return "";
      if (w.confidence < INDISCERNIBLE_THRESHOLD) {
        return "[indiscernible]";
      }
      return token;
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function mergeUtteranceTextWithWordTags(
  originalText: string,
  taggedFromWords: string
): string {
  if (!taggedFromWords) return originalText;
  const indiscernibleCount = (taggedFromWords.match(/\[indiscernible\]/g) ?? [])
    .length;
  if (indiscernibleCount === 0) return originalText;
  return taggedFromWords;
}

/**
 * Steora-style dialogue punctuation from timing and speaker turns (heuristic).
 */
export function applySteoraDialogueRules(
  utterances: SpeakerSegment[]
): SpeakerSegment[] {
  if (utterances.length === 0) return utterances;

  const result = utterances.map((u) => ({ ...u }));

  for (let i = 0; i < result.length; i++) {
    const current = result[i];
    const next = result[i + 1];
    let text = current.text.trim();

    if (next) {
      const gapMs = (next.start - current.end) * 1000;
      const speakerChanged = next.speaker !== current.speaker;

      if (
        speakerChanged &&
        gapMs >= 0 &&
        gapMs < INTERRUPTION_GAP_MS &&
        !text.endsWith("—")
      ) {
        text = text.replace(/\s*[,.]?\s*$/, "") + "—";
      } else if (
        speakerChanged &&
        !TRAILING_OFF_PATTERN.test(text) &&
        text.length > 0
      ) {
        text = text + "…";
      }
    }

    result[i] = { ...current, text };
  }

  return result;
}

const STEORA_LLM_SYSTEM = `You edit transcript utterances to match Steora client style. Preserve meaning and speaker labels.
Rules:
- Use … for trailing off or incomplete thoughts.
- Use — for abrupt interruption or cut-off (often at end of line before another speaker).
- Use [indiscernible] only where audio is unclear (keep existing tags).
- Use [ph] sparingly for deliberate phonetic spellings of names/terms when the plain spelling would be wrong.
- Do not add content. Do not remove disfluencies (uh, um). Return ONLY a JSON array of strings, one string per input utterance, same order and count.`;

const STEORA_LLM_CHUNK_SIZE = 40;

async function applySteoraLlmPunctuationChunk(
  utterances: SpeakerSegment[],
  apiKey: string
): Promise<SpeakerSegment[]> {
  if (utterances.length === 0) return utterances;

  const payload = utterances.map((u) => u.text);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: STEORA_LLM_SYSTEM },
        {
          role: "user",
          content: JSON.stringify(payload),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Steora LLM pass failed: ${response.status} ${errText.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  let raw = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Steora LLM pass returned non-JSON content");
  }

  if (!Array.isArray(parsed) || parsed.length !== utterances.length) {
    throw new Error("Steora LLM pass returned invalid utterance array");
  }

  return utterances.map((u, i) => ({
    ...u,
    text: typeof parsed[i] === "string" ? parsed[i] : u.text,
  }));
}

export async function applySteoraLlmPunctuation(
  utterances: SpeakerSegment[],
  apiKey: string
): Promise<SpeakerSegment[]> {
  if (utterances.length === 0) return utterances;

  const result: SpeakerSegment[] = [];
  for (let i = 0; i < utterances.length; i += STEORA_LLM_CHUNK_SIZE) {
    const chunk = utterances.slice(i, i + STEORA_LLM_CHUNK_SIZE);
    const polished = await applySteoraLlmPunctuationChunk(chunk, apiKey);
    result.push(...polished);
  }
  return result;
}

/** Extract likely person names from transcript text + entities. */
export function collectCandidateSpeakerNames(
  transcriptText: string,
  entityTexts: string[],
  knownFromUser: string[]
): string[] {
  const names = new Set<string>();

  for (const n of knownFromUser) {
    const t = n.trim();
    if (t) names.add(t);
  }
  for (const n of entityTexts) {
    const t = n.trim();
    if (t.length >= 2) names.add(t);
  }

  const introPatterns = [
    /\bmy name is ([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/gi,
    /\bI am ([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g,
    /\bI'm ([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g,
  ];
  for (const re of introPatterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(transcriptText)) !== null) {
      names.add(m[1].trim());
    }
  }

  return [...names].slice(0, 15);
}

export function formatDiarizationSpeakerLabel(
  rawSpeaker: string | null | undefined
): string {
  const label = (rawSpeaker ?? "A").trim();
  if (!label) return "Unidentified Speaker";
  if (/^speaker\s+/i.test(label)) return label;
  if (/^[A-Z]$/.test(label) || /^\d+$/.test(label)) {
    return `Speaker ${label}`;
  }
  return label;
}
