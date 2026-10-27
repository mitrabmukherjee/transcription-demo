export interface TranscriptionOptions {
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
  /** Steora verbatim: disfluencies on, smart format off, richer punctuation pass */
  verbatimMode: boolean;
  /** AssemblyAI speech understanding speaker ID (requires diarization) */
  speakerIdentification: boolean;
  /** Rule-based Steora dialogue tags and punctuation */
  steoraPunctuation: boolean;
  /** Optional OpenAI pass for Steora punctuation (requires OPENAI_API_KEY) */
  steoraLlmPass: boolean;
  /** Comma-separated hint names for speaker identification */
  knownSpeakerNames: string;
}

export interface TranscriptionMeta {
  verbatimMode: boolean;
  speakerIdentification: boolean;
  steoraPunctuation: boolean;
  steoraLlmPass: boolean;
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
  meta: TranscriptionMeta;
}

export interface TranscriptionResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any;
  normalized: NormalizedResult;
}
