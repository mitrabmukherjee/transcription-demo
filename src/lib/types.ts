export type ProviderType = "deepgram" | "assemblyai";

export interface TranscriptionOptions {
  provider: ProviderType;
  summarize: boolean;
  topics: boolean;
  smartFormat: boolean;
  punctuation: boolean;
  paragraphs: boolean;
  utterances: boolean;
  silenceThreshold: number;
  profanityFilter: boolean;
  redact: boolean;
  diarize: boolean;
  fillerWords: boolean;
}

export interface SpeakerSegment {
  speaker: string;
  start: number;
  end: number;
  text: string;
}

export interface NormalizedResult {
  transcript: string;
  paragraphs: string[];
  summary: string | null;
  topics: string[];
  piiEntities: string[];
  utterances: SpeakerSegment[];
}

export interface TranscriptionResponse {
  provider: ProviderType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any;
  normalized: NormalizedResult;
}
