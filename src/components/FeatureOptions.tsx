"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { applyVerbatimPreset } from "@/lib/transcription-options";
import { TranscriptionOptions } from "@/lib/types";

interface FeatureOptionsProps {
  options: TranscriptionOptions;
  onChange: (options: TranscriptionOptions) => void;
}

interface FeatureDef {
  key: keyof TranscriptionOptions;
  label: string;
  description: string;
}

const features: FeatureDef[] = [
  {
    key: "verbatimMode",
    label: "Steora Verbatim Deliverable",
    description:
      "Disfluencies on, smart format off, diarization + speaker ID + Steora punctuation rules (Genmab-style).",
  },
  {
    key: "speakerIdentification",
    label: "Speaker Identification",
    description:
      "Map diarization labels to names from the transcript (plus “Unidentified Speaker”). Requires Diarization.",
  },
  {
    key: "steoraPunctuation",
    label: "Steora Punctuation Rules",
    description:
      "Low-confidence [indiscernible], … and — for pauses and interruptions between turns. Requires Diarization.",
  },
  {
    key: "steoraLlmPass",
    label: "Steora LLM Polish (optional)",
    description:
      "Sends utterance text to OpenAI (when OPENAI_API_KEY is set) for punctuation polish. Adds latency, cost, and third-party processing.",
  },
  {
    key: "summarize",
    label: "Summarization",
    description: "Generate executive summary of the content.",
  },
  {
    key: "topics",
    label: "Topic Detection",
    description: "Identify key topics and categories across sections.",
  },
  {
    key: "smartFormat",
    label: "Smart Format",
    description: "Apply intelligent formatting for dates, times, and numbers.",
  },
  {
    key: "punctuation",
    label: "Punctuation",
    description: "Include automatic capitalization and punctuation.",
  },
  {
    key: "paragraphs",
    label: "Paragraphs",
    description: "Split transcript into readable paragraphs.",
  },
  {
    key: "utterances",
    label: "Utterance Segmentation",
    description:
      "Turn-by-turn segments in the Diarization tab (via AssemblyAI speaker labels). Requires Diarization.",
  },
  {
    key: "profanityFilter",
    label: "Profanity Filter",
    description: "Automatically filter/censor profanity.",
  },
  {
    key: "redact",
    label: "Redaction",
    description: "Redact sensitive PII data with asterisks (*).",
  },
  {
    key: "diarize",
    label: "Diarization",
    description:
      "Identify speaker changes and turn-by-turn utterances (required for Steora formatting and speaker identification).",
  },
  {
    key: "fillerWords",
    label: "Filler Words",
    description: 'Keep disfluencies like "uh" and "um" (auto-enabled in verbatim mode).',
  },
];

export function FeatureOptions({ options, onChange }: FeatureOptionsProps) {
  const set = (key: keyof TranscriptionOptions, value: boolean | number | string) => {
    let next = { ...options, [key]: value } as TranscriptionOptions;

    if (key === "verbatimMode" && value === true) {
      next = applyVerbatimPreset(next);
    }

    if (key === "speakerIdentification" && value === true && !next.diarize) {
      next = { ...next, diarize: true };
    }

    if (key === "utterances" && value === true && !next.diarize) {
      next = { ...next, diarize: true };
    }

    if (
      (key === "steoraPunctuation" || key === "steoraLlmPass") &&
      value === true &&
      !next.diarize
    ) {
      next = { ...next, diarize: true, utterances: true };
    }

    if (key === "diarize" && value === true) {
      next = { ...next, utterances: true };
    }

    if (key === "diarize" && value === false) {
      next = {
        ...next,
        speakerIdentification: false,
        utterances: false,
        steoraPunctuation: false,
        steoraLlmPass: false,
      };
    }

    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2">
        {features.map((f) => (
          <div
            key={f.key}
            className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors"
          >
            <Switch
              id={f.key}
              checked={options[f.key] as boolean}
              onCheckedChange={(v) => set(f.key, v)}
              className="mt-0.5 shrink-0"
              disabled={
                (f.key === "smartFormat" && options.verbatimMode) ||
                (f.key === "fillerWords" && options.verbatimMode) ||
                (f.key === "speakerIdentification" && !options.diarize) ||
                (f.key === "steoraPunctuation" && !options.diarize) ||
                (f.key === "steoraLlmPass" && !options.diarize)
              }
            />
            <div className="flex-1 min-w-0">
              <Label htmlFor={f.key} className="text-sm font-medium cursor-pointer">
                {f.label}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                {f.description}
              </p>
              {f.key === "speakerIdentification" && options.speakerIdentification && (
                <div className="mt-2 space-y-1">
                  <Label
                    htmlFor="knownSpeakerNames"
                    className="text-xs text-muted-foreground"
                  >
                    Known speaker names (optional, comma-separated)
                  </Label>
                  <Input
                    id="knownSpeakerNames"
                    type="text"
                    placeholder="Judith Klimovsky, Host Name"
                    value={options.knownSpeakerNames}
                    onChange={(e) => set("knownSpeakerNames", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
