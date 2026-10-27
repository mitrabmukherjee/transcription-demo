import type { SpeakerSegment } from "@/lib/types";

export interface UnderstandingUtterance {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

export interface SpeakerIdentificationResult {
  utterances: SpeakerSegment[];
  mapping?: Record<string, string>;
}

/**
 * AssemblyAI LLM Gateway — speaker identification on a completed transcript.
 * @see https://www.assemblyai.com/docs/speech-understanding/speaker-identification
 */
export async function identifySpeakersOnTranscript(
  apiKey: string,
  transcriptId: string,
  candidateNames: string[]
): Promise<SpeakerIdentificationResult> {
  const uniqueNames = [...new Set(candidateNames.map((n) => n.trim()).filter(Boolean))];

  const speakers: { name: string; description?: string }[] = uniqueNames.map(
    (name) => ({ name })
  );
  speakers.push({
    name: "Unidentified Speaker",
    description:
      "Moderator, interviewer, host, or participant who cannot be matched to a named speaker.",
  });

  const body = {
    transcript_id: transcriptId,
    speech_understanding: {
      request: {
        speaker_identification: {
          speaker_type: "name" as const,
          speakers,
          effort: "medium" as const,
        },
      },
    },
  };

  const res = await fetch("https://llm-gateway.assemblyai.com/v1/understanding", {
    method: "POST",
    headers: {
      authorization: apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `Speaker identification failed (${res.status}): ${errText.slice(0, 500)}`
    );
  }

  const data = (await res.json()) as {
    utterances?: UnderstandingUtterance[];
    speech_understanding?: {
      response?: {
        speaker_identification?: {
          mapping?: Record<string, string>;
        };
      };
    };
  };

  const mapping =
    data.speech_understanding?.response?.speaker_identification?.mapping;

  const utterances: SpeakerSegment[] = (data.utterances ?? []).map((u) => ({
    speaker: u.speaker,
    text: u.text,
    start: (u.start || 0) / 1000,
    end: (u.end || 0) / 1000,
  }));

  return { utterances, mapping };
}
