import { NextRequest, NextResponse } from "next/server";
import { AssemblyAI } from "assemblyai";
import type { SubstitutionPolicy, PiiPolicy } from "assemblyai";
import { del } from "@vercel/blob";
import { isAllowedUploadBlobUrl } from "@/lib/blob-upload";
import { publicApiErrorMessage } from "@/lib/client-errors";
import { NormalizedResult, TranscriptionResponse, SpeakerSegment } from "@/lib/types";
import {
  buildDiarizationPlainText,
  splitTranscriptIntoParagraphs,
  steoraParagraphsFromUtterances,
} from "@/lib/steoraDocumentFormat";
import { identifySpeakersOnTranscript } from "@/lib/assemblyaiSpeakerId";
import {
  applySteoraDialogueRules,
  applySteoraLlmPunctuation,
  collectCandidateSpeakerNames,
  formatDiarizationSpeakerLabel,
  mergeUtteranceTextWithWordTags,
  tagLowConfidenceWords,
  type TranscriptWordLike,
} from "@/lib/steoraPostProcess";

// Vercel Hobby caps serverless functions at 300s (5 minutes)
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const audioUrl = formData.get("audioUrl") as string | null;

  if (!audioUrl) {
    return NextResponse.json({ error: "No audioUrl provided" }, { status: 400 });
  }

  if (!isAllowedUploadBlobUrl(audioUrl)) {
    return NextResponse.json({ error: "Invalid or unauthorized audio URL" }, { status: 400 });
  }

  const summarize = formData.get("summarize") === "true";
  const topics = formData.get("topics") === "true";
  const smartFormat = formData.get("smartFormat") === "true";
  const punctuation = formData.get("punctuation") === "true";
  const paragraphs = formData.get("paragraphs") === "true";
  const utterances = formData.get("utterances") === "true";
  const profanityFilter = formData.get("profanityFilter") === "true";
  const redact = formData.get("redact") === "true";
  const diarize = formData.get("diarize") === "true";
  const fillerWords = formData.get("fillerWords") === "true";
  const verbatimMode = formData.get("verbatimMode") === "true";
  const speakerIdentification = formData.get("speakerIdentification") === "true";
  const steoraPunctuation = formData.get("steoraPunctuation") === "true";
  const steoraLlmPass = formData.get("steoraLlmPass") === "true";
  const knownSpeakerNames =
    (formData.get("knownSpeakerNames") as string | null)?.trim() ?? "";

  const opts = {
    summarize,
    topics,
    smartFormat,
    punctuation,
    paragraphs,
    utterances,
    profanityFilter,
    redact,
    diarize,
    fillerWords,
    verbatimMode,
    speakerIdentification,
    steoraPunctuation,
    steoraLlmPass,
    knownSpeakerNames,
  };

  try {
    return await transcribeWithAssemblyAI(audioUrl, opts);
  } catch (err: unknown) {
    console.error("[transcribe] error:", err);
    const message = err instanceof Error ? err.message : String(err);
    if (message.toLowerCase().includes("timeout")) {
      return NextResponse.json(
        { error: "API request timed out. Try a shorter audio file." },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: publicApiErrorMessage(err, "Transcription failed. Please try again.") },
      { status: 500 }
    );
  } finally {
    if (isAllowedUploadBlobUrl(audioUrl)) {
      try {
        await del(audioUrl);
      } catch (delErr: unknown) {
        console.warn("[transcribe] failed to delete blob:", delErr);
      }
    }
  }
}

interface ToggleOptions {
  summarize: boolean;
  topics: boolean;
  smartFormat: boolean;
  punctuation: boolean;
  paragraphs: boolean;
  utterances: boolean;
  profanityFilter: boolean;
  redact: boolean;
  diarize: boolean;
  fillerWords: boolean;
  verbatimMode: boolean;
  speakerIdentification: boolean;
  steoraPunctuation: boolean;
  steoraLlmPass: boolean;
  knownSpeakerNames: string;
}

function parseKnownSpeakerNames(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function transcribeWithAssemblyAI(
  audioUrl: string,
  opts: ToggleOptions
) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ASSEMBLYAI_API_KEY is not configured" },
      { status: 400 }
    );
  }

  const effectiveSmartFormat = opts.verbatimMode ? false : opts.smartFormat;
  const effectiveFillerWords = opts.verbatimMode ? true : opts.fillerWords;
  const wantsSteoraFormatting = opts.steoraPunctuation || opts.verbatimMode;
  const enableDiarization =
    opts.diarize || opts.utterances || wantsSteoraFormatting;
  const useSpeakerId = opts.speakerIdentification && enableDiarization;

  const client = new AssemblyAI({ apiKey });

  const piiPolicies: PiiPolicy[] = [
    "credit_card_number",
    "email_address",
    "phone_number",
    "us_social_security_number",
    "banking_information",
  ];

  const transcript = await client.transcripts.transcribe({
    audio_url: audioUrl,
    ...(opts.summarize && {
      summarization: true,
      summary_model: "informative",
      summary_type: "bullets",
    }),
    ...(opts.topics && { iab_categories: true }),
    ...(effectiveSmartFormat && { format_text: true }),
    ...(opts.punctuation && { punctuate: true }),
    ...(opts.profanityFilter && { filter_profanity: true }),
    ...(opts.redact && {
      redact_pii: true,
      redact_pii_sub: "entity_name" as SubstitutionPolicy,
      redact_pii_policies: piiPolicies,
    }),
    ...(enableDiarization && { speaker_labels: true }),
    ...(effectiveFillerWords && { disfluencies: true }),
    ...(useSpeakerId && { entity_detection: true }),
  });

  if (transcript.status === "error") {
    throw new Error(transcript.error || "AssemblyAI transcription error");
  }

  const topicsList: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iabSummary = (transcript as any)?.iab_categories_result?.summary as
    | Record<string, number>
    | undefined;
  if (opts.topics && iabSummary) {
    topicsList.push(...Object.keys(iabSummary).slice(0, 15));
  }

  let utterancesList: SpeakerSegment[] = (transcript.utterances || []).map(
    (u) => ({
      speaker: formatDiarizationSpeakerLabel(u.speaker),
      start: (u.start || 0) / 1000,
      end: (u.end || 0) / 1000,
      text: u.text,
    })
  );

  if (useSpeakerId && transcript.id) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entities = ((transcript as any).entities ?? []) as {
        entity_type: string;
        text: string;
      }[];
      const entityNames = entities
        .filter((e) => e.entity_type === "person_name")
        .map((e) => e.text);

      const candidates = collectCandidateSpeakerNames(
        transcript.text || "",
        entityNames,
        parseKnownSpeakerNames(opts.knownSpeakerNames)
      );

      const identified = await identifySpeakersOnTranscript(
        apiKey,
        transcript.id,
        candidates
      );

      if (identified.utterances.length > 0) {
        utterancesList = identified.utterances.map((u) => ({
          ...u,
          speaker: formatDiarizationSpeakerLabel(u.speaker),
        }));
      }
    } catch (idErr: unknown) {
      console.warn("[transcribe] speaker identification failed:", idErr);
    }
  }

  const words = (transcript.words ?? []) as TranscriptWordLike[];

  if (
    wantsSteoraFormatting &&
    utterancesList.length > 0 &&
    words.length > 0
  ) {
    utterancesList = utterancesList.map((u) => {
      const startMs = u.start * 1000;
      const endMs = u.end * 1000;
      const tagged = tagLowConfidenceWords(startMs, endMs, words);
      return {
        ...u,
        text: mergeUtteranceTextWithWordTags(u.text, tagged),
      };
    });
  }

  if (wantsSteoraFormatting && utterancesList.length > 0) {
    utterancesList = applySteoraDialogueRules(utterancesList);
  }

  const openAiKey = process.env.OPENAI_API_KEY;
  const runLlm =
    opts.steoraLlmPass &&
    wantsSteoraFormatting &&
    utterancesList.length > 0 &&
    openAiKey;

  if (runLlm) {
    try {
      utterancesList = await applySteoraLlmPunctuation(utterancesList, openAiKey);
    } catch (llmErr: unknown) {
      console.warn("[transcribe] Steora LLM punctuation failed:", llmErr);
    }
  }

  const steoraDeliverable = wantsSteoraFormatting && utterancesList.length > 0;

  const transcriptFromUtterances =
    utterancesList.length > 0 && (useSpeakerId || steoraDeliverable);

  let paragraphsList: string[] = [];
  if (transcriptFromUtterances && opts.paragraphs) {
    paragraphsList = steoraParagraphsFromUtterances(utterancesList);
  } else if (!steoraDeliverable && opts.paragraphs && transcript.id) {
    try {
      const paraResponse = await client.transcripts.paragraphs(transcript.id);
      paragraphsList = (paraResponse.paragraphs ?? [])
        .map((p) => p.text?.trim() ?? "")
        .filter(Boolean);
    } catch (paraErr: unknown) {
      console.warn("[transcribe] paragraphs fetch failed:", paraErr);
    }
  }
  if (
    !steoraDeliverable &&
    opts.paragraphs &&
    paragraphsList.length === 0 &&
    transcript.text
  ) {
    paragraphsList = splitTranscriptIntoParagraphs(transcript.text);
  }

  const piiEntities: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entities = (transcript as any)?.entities as
    | { entity_type: string }[]
    | undefined;
  if (opts.redact && entities) {
    for (const entity of entities) {
      if (!piiEntities.includes(entity.entity_type)) {
        piiEntities.push(entity.entity_type);
      }
    }
  }

  let transcriptText = transcript.text || "";
  if (transcriptFromUtterances) {
    transcriptText = buildDiarizationPlainText(utterancesList);
  }

  const normalized: NormalizedResult = {
    transcript: transcriptText,
    paragraphs: paragraphsList,
    summary: transcript.summary || null,
    topics: topicsList,
    piiEntities,
    utterances: utterancesList,
    meta: {
      verbatimMode: opts.verbatimMode,
      speakerIdentification: useSpeakerId,
      steoraPunctuation: opts.steoraPunctuation || opts.verbatimMode,
      steoraLlmPass: Boolean(runLlm),
    },
  };

  const response: TranscriptionResponse = {
    raw: transcript,
    normalized,
  };

  return NextResponse.json(response);
}
