"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TranscriptionResponse } from "@/lib/types";
import { AlertTriangle, FileText, Mic2, Brain, Code2 } from "lucide-react";

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const SPEAKER_COLORS = [
  "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
];

function getSpeakerColor(speaker: string) {
  const num = parseInt(speaker.replace(/\D/g, "")) || 0;
  return SPEAKER_COLORS[num % SPEAKER_COLORS.length];
}

interface ResultsTabsProps {
  result: TranscriptionResponse;
}

export function ResultsTabs({ result }: ResultsTabsProps) {
  const { normalized } = result;
  const [showFillers, setShowFillers] = useState(true);

  const transcriptText = showFillers
    ? normalized.transcript
    : normalized.transcript.replace(/\b(uh|um|uh-huh|mm-hmm|hmm)\b/gi, "").replace(/\s+/g, " ").trim();

  const displayParagraphs =
    normalized.paragraphs.length > 0
      ? normalized.paragraphs
      : [transcriptText];

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
            <div className="flex items-center gap-2">
              <Switch
                id="filler-toggle"
                checked={showFillers}
                onCheckedChange={setShowFillers}
              />
              <Label htmlFor="filler-toggle" className="text-xs cursor-pointer">
                Show filler words
              </Label>
            </div>
          </CardHeader>
          <CardContent>
            {normalized.transcript ? (
              <div className="space-y-4">
                {displayParagraphs.map((para, i) => (
                  <p key={i} className="text-sm leading-relaxed text-foreground">
                    {para}
                  </p>
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
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Diarization & Utterances</CardTitle>
          </CardHeader>
          <CardContent>
            {normalized.utterances.length > 0 ? (
              <div className="space-y-2">
                {normalized.utterances.map((u, i) => (
                  <div
                    key={i}
                    className="flex gap-3 rounded-lg p-3 border hover:bg-muted/30 transition-colors"
                  >
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full h-fit whitespace-nowrap mt-0.5 ${getSpeakerColor(
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
          {/* Summary */}
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

          {/* Topics */}
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

          {/* PII / Redaction */}
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
              Full AssemblyAI response object
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            <div
              className="min-w-0 max-w-full overflow-auto rounded-lg border bg-muted/40 max-h-[min(32rem,60vh)]"
            >
              <pre className="min-w-0 p-4 text-xs leading-relaxed font-mono text-foreground whitespace-pre-wrap break-words">
                {JSON.stringify(result.raw, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
