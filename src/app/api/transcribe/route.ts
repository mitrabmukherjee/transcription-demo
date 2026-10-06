import { NextRequest, NextResponse } from "next/server";
import { AssemblyAI } from "assemblyai";
import type { SubstitutionPolicy, PiiPolicy } from "assemblyai";
import { del } from "@vercel/blob";
import { NormalizedResult, TranscriptionResponse } from "@/lib/types";

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

  const summarize = formData.get("summarize") === "true";
  const topics = formData.get("topics") === "true";
  const smartFormat = formData.get("smartFormat") === "true";
  const punctuation = formData.get("punctuation") === "true";
  const paragraphs = formData.get("paragraphs") === "true";
  const utterances = formData.get("utterances") === "true";
  const silenceThreshold = parseFloat(
    (formData.get("silenceThreshold") as string) || "0.8"
  );
  const profanityFilter = formData.get("profanityFilter") === "true";
  const redact = formData.get("redact") === "true";
  const diarize = formData.get("diarize") === "true";
  const fillerWords = formData.get("fillerWords") === "true";

  const opts = {
    summarize,
    topics,
    smartFormat,
    punctuation,
    paragraphs,
    utterances,
    silenceThreshold,
    profanityFilter,
    redact,
    diarize,
    fillerWords,
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
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    try {
      await del(audioUrl);
    } catch (delErr: unknown) {
      console.warn("[transcribe] failed to delete blob:", delErr);
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
  silenceThreshold: number;
  profanityFilter: boolean;
  redact: boolean;
  diarize: boolean;
  fillerWords: boolean;
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
    ...(opts.smartFormat && { format_text: true }),
    ...(opts.punctuation && { punctuate: true }),
    ...(opts.utterances && { speech_threshold: opts.silenceThreshold }),
    ...(opts.profanityFilter && { filter_profanity: true }),
    ...(opts.redact && {
      redact_pii: true,
      redact_pii_sub: "entity_name" as SubstitutionPolicy,
      redact_pii_policies: piiPolicies,
    }),
    ...(opts.diarize && { speaker_labels: true }),
    ...(opts.fillerWords && { disfluencies: true }),
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

  const utterancesList = (transcript.utterances || []).map((u) => ({
    speaker: `Speaker ${u.speaker}`,
    start: (u.start || 0) / 1000,
    end: (u.end || 0) / 1000,
    text: u.text,
  }));

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

  const normalized: NormalizedResult = {
    transcript: transcript.text || "",
    paragraphs: [],
    summary: transcript.summary || null,
    topics: topicsList,
    piiEntities,
    utterances: utterancesList,
  };

  const response: TranscriptionResponse = {
    raw: transcript,
    normalized,
  };

  return NextResponse.json(response);
}
