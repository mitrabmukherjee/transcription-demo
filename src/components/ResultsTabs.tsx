"use client";

import { Fragment, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { TranscriptionResponse } from "@/lib/types";
import { getSpeakerColorClass } from "@/lib/speaker-display";
import { rawPayloadForDisplay } from "@/lib/sanitize-raw-payload";
import { resolveTranscriptParagraphs } from "@/lib/transcript-display";
import { AlertTriangle, FileText, Mic2, Brain, Code2, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import {
  buildDiarizationDocxParagraphs,
  buildDiarizationHtml,
  buildDiarizationPlainText,
  buildTranscriptDocxParagraphs,
  buildTranscriptHtml,
  buildTranscriptPlainText,
  packSteoraDocx,
} from "@/lib/steoraDocumentFormat";

function stripFillerWords(text: string): string {
  return text
    .replace(/\b(uh|um|uh-huh|mm-hmm|hmm)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function applyFillerPolicy(
  text: string,
  showFillers: boolean,
  verbatim: boolean
): string {
  if (showFillers || verbatim) return text;
  return stripFillerWords(text);
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface ResultsTabsProps {
  result: TranscriptionResponse;
}

export function ResultsTabs({ result }: ResultsTabsProps) {
  const { normalized } = result;
  const [showFillers, setShowFillers] = useState(true);
  const [diarizationTimelineView, setDiarizationTimelineView] = useState(false);

  const verbatim = normalized.meta?.verbatimMode ?? false;

  const rawDisplay = rawPayloadForDisplay(result.raw, {
    redactEnabled: normalized.meta?.redact ?? false,
    redactedTranscript: normalized.transcript,
  });

  const baseParagraphs = resolveTranscriptParagraphs(normalized);

  const displayParagraphs = baseParagraphs
    .map((p) => applyFillerPolicy(p, showFillers, verbatim))
    .filter(Boolean);

  const displayUtterances = normalized.utterances.map((u) => ({
    ...u,
    text: applyFillerPolicy(u.text, showFillers, verbatim),
  }));

  const handleCopy = async (type: "transcript" | "diarization") => {
    try {
      let plainText = "";
      let htmlText = "";

      if (type === "diarization" && displayUtterances.length > 0) {
        plainText = buildDiarizationPlainText(displayUtterances);
        htmlText = buildDiarizationHtml(displayUtterances);
      } else {
        plainText = buildTranscriptPlainText(displayParagraphs);
        htmlText = buildTranscriptHtml(displayParagraphs);
      }

      const clipboardItem = new ClipboardItem({
        "text/plain": new Blob([plainText], { type: "text/plain" }),
        "text/html": new Blob([htmlText], { type: "text/html" }),
      });

      await navigator.clipboard.write([clipboardItem]);
      toast.success("Copied to clipboard with formatting");
    } catch (err) {
      console.error(err);
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleDownload = async (type: "transcript" | "diarization") => {
    try {
      const paragraphs =
        type === "diarization" && displayUtterances.length > 0
          ? buildDiarizationDocxParagraphs(displayUtterances)
          : buildTranscriptDocxParagraphs(displayParagraphs);

      const blob = await packSteoraDocx(paragraphs);
      saveAs(blob, `${type === "diarization" ? "Diarization" : "Transcript"}_Steora.docx`);
      toast.success("Document downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate document");
    }
  };

  const transcriptParagraphsForPreview = displayParagraphs
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <Tabs defaultValue="transcript" className="w-full min-w-0 max-w-full">
      <TabsList className="flex w-full mb-4 h-auto">
        <TabsTrigger value="transcript" className="gap-1.5 text-xs sm:text-sm">
          <FileText className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Transcript</span>
          <span className="sm:hidden">Text</span>
        </TabsTrigger>
        <TabsTrigger value="diarization" className="gap-1.5 text-xs sm:text-sm">
          <Mic2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Diarization</span>
          <span className="sm:hidden">Speakers</span>
        </TabsTrigger>
        <TabsTrigger value="intelligence" className="gap-1.5 text-xs sm:text-sm">
          <Brain className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Intelligence</span>
          <span className="sm:hidden">AI</span>
        </TabsTrigger>
        <TabsTrigger value="raw" className="gap-1.5 text-xs sm:text-sm">
          <Code2 className="h-3.5 w-3.5" />
          <span>Raw JSON</span>
        </TabsTrigger>
      </TabsList>

      {/* ── Transcript ── */}
      <TabsContent value="transcript">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Transcript</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="filler-toggle"
                  checked={showFillers}
                  onCheckedChange={setShowFillers}
                />
                <Label htmlFor="filler-toggle" className="text-xs cursor-pointer">
                  Show filler words
                </Label>
                {verbatim && (
                  <span className="text-xs text-muted-foreground">(verbatim)</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleCopy("transcript")}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDownload("transcript")}>
                  <Download className="h-3.5 w-3.5 mr-1" /> DOCX
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {normalized.transcript ? (
              <div className="steora-draft">
                {transcriptParagraphsForPreview.map((para, i) => (
                  <Fragment key={i}>
                    <p>{para}</p>
                    {i < transcriptParagraphsForPreview.length - 1 && (
                      <p className="steora-draft-spacer" aria-hidden="true">
                        &nbsp;
                      </p>
                    )}
                  </Fragment>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No transcript available.
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Diarization & Utterances ── */}
      <TabsContent value="diarization">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">Diarization & Utterances</CardTitle>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch
                  id="timeline-toggle"
                  checked={diarizationTimelineView}
                  onCheckedChange={setDiarizationTimelineView}
                />
                <Label htmlFor="timeline-toggle" className="text-xs cursor-pointer">
                  Timeline view
                </Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleCopy("diarization")}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDownload("diarization")}>
                  <Download className="h-3.5 w-3.5 mr-1" /> DOCX
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {displayUtterances.length > 0 ? (
              diarizationTimelineView ? (
                <div className="space-y-2">
                  {displayUtterances.map((u, i) => (
                    <div
                      key={i}
                      className="flex gap-3 rounded-lg p-3 border hover:bg-muted/30 transition-colors"
                    >
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full h-fit whitespace-nowrap mt-0.5 ${getSpeakerColorClass(
                          u.speaker
                        )}`}
                      >
                        {u.speaker}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-relaxed">{u.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(u.start)} → {formatTime(u.end)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="steora-draft">
                  {displayUtterances.map((u, i) => (
                    <p key={i}>{`${u.speaker}: ${u.text}`}</p>
                  ))}
                </div>
              )
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No utterance / diarization data. Enable Diarization or Utterance
                Segmentation to see results here.
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Audio Intelligence ── */}
      <TabsContent value="intelligence">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {normalized.summary ? (
                <div className="text-sm leading-relaxed whitespace-pre-line">
                  {normalized.summary}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No summary available. Enable Summarization to see results here.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Detected Topics</CardTitle>
            </CardHeader>
            <CardContent>
              {normalized.topics.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {normalized.topics.map((t, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No topics detected. Enable Topic Detection to see results here.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Redacted PII Entities
              </CardTitle>
            </CardHeader>
            <CardContent>
              {normalized.piiEntities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {normalized.piiEntities.map((e, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="text-xs border-amber-400 text-amber-700 dark:text-amber-400"
                    >
                      {e}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No PII entities found. Enable Redaction to see results here.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ── Raw JSON ── */}
      <TabsContent value="raw">
        <Card className="min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Raw JSON Payload</CardTitle>
            <CardDescription>
              {normalized.meta?.redact
                ? "Redacted view — word-level text omitted; use Transcript for redacted content."
                : "Full AssemblyAI response object"}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            <div
              className="min-w-0 max-w-full overflow-auto rounded-lg border bg-muted/40 max-h-[min(32rem,60vh)]"
            >
              <pre className="min-w-0 p-4 text-xs leading-relaxed font-mono text-foreground whitespace-pre-wrap break-words">
                {JSON.stringify(rawDisplay, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
