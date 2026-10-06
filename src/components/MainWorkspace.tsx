"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Wand2 } from "lucide-react";
import { FileUploader } from "@/components/FileUploader";
import { FeatureOptions } from "@/components/FeatureOptions";
import { ResultsTabs } from "@/components/ResultsTabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TranscriptionOptions, TranscriptionResponse } from "@/lib/types";
import type { BlobUploadMode } from "@/lib/upload-media";
import { uploadMediaFile } from "@/lib/upload-media";

const DEFAULT_OPTIONS: TranscriptionOptions = {
  summarize: false,
  topics: false,
  smartFormat: true,
  punctuation: true,
  paragraphs: false,
  utterances: false,
  silenceThreshold: 0.8,
  profanityFilter: false,
  redact: false,
  diarize: false,
  fillerWords: false,
};

const STATUS_MESSAGES = [
  "Uploading media...",
  "Calling API...",
  "Processing audio...",
  "Parsing intelligence...",
  "Almost done...",
];

interface MainWorkspaceProps {
  blobUploadMode: BlobUploadMode;
}

export default function MainWorkspace({ blobUploadMode }: MainWorkspaceProps) {
  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState<TranscriptionOptions>(DEFAULT_OPTIONS);
  const [loading, setLoading] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [result, setResult] = useState<TranscriptionResponse | null>(null);

  const handleTranscribe = async () => {
    if (!file) {
      toast.error("Please upload a file first.");
      return;
    }

    setLoading(true);
    setResult(null);
    setStatusIndex(0);

    // Cycle through status messages
    const interval = setInterval(() => {
      setStatusIndex((i) => Math.min(i + 1, STATUS_MESSAGES.length - 1));
    }, 3500);

    try {
      const audioUrl = await uploadMediaFile(file, blobUploadMode);

      setStatusIndex(1);

      const fd = new FormData();
      fd.append("audioUrl", audioUrl);
      fd.append("summarize", String(options.summarize));
      fd.append("topics", String(options.topics));
      fd.append("smartFormat", String(options.smartFormat));
      fd.append("punctuation", String(options.punctuation));
      fd.append("paragraphs", String(options.paragraphs));
      fd.append("utterances", String(options.utterances));
      fd.append("silenceThreshold", String(options.silenceThreshold));
      fd.append("profanityFilter", String(options.profanityFilter));
      fd.append("redact", String(options.redact));
      fd.append("diarize", String(options.diarize));
      fd.append("fillerWords", String(options.fillerWords));

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error || `Request failed (${res.status})`;

        if (
          res.status === 400 &&
          (msg.includes("API_KEY") || msg.includes("BLOB_READ_WRITE_TOKEN"))
        ) {
          toast.error("Server configuration missing", {
            description: msg,
          });
        } else if (res.status === 413) {
          toast.error("File too large", {
            description: msg,
          });
        } else if (res.status === 504) {
          toast.error("Request timed out", {
            description: msg,
          });
        } else {
          toast.error("Transcription failed", { description: msg });
        }
        return;
      }

      const data: TranscriptionResponse = await res.json();
      setResult(data);
      toast.success("Transcription complete!", {
        description: "Processed by AssemblyAI Universal-1",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      const isBlob = msg.includes("Vercel Blob") || msg.includes("BLOB_READ_WRITE");
      toast.error(isBlob ? "Upload failed" : "Request failed", {
        description: msg,
      });
    } finally {
      clearInterval(interval);
      setLoading(false);
      setStatusIndex(0);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start">
      {/* ── Left column: Controls ── */}
      <div className="space-y-5">
        {/* File upload */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Upload Media</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUploader onFileChange={setFile} />
          </CardContent>
        </Card>

        {/* Feature options */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Feature Options</CardTitle>
          </CardHeader>
          <CardContent>
            <FeatureOptions options={options} onChange={setOptions} />
          </CardContent>
        </Card>

        {/* Transcribe button */}
        <Button
          className="w-full gap-2"
          size="lg"
          onClick={handleTranscribe}
          disabled={loading || !file}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {STATUS_MESSAGES[statusIndex]}
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" />
              Transcribe
            </>
          )}
        </Button>
      </div>

      {/* ── Right column: Results ── */}
      <div className="min-h-[400px] min-w-0">
        {loading && (
          <Card className="h-full flex items-center justify-center min-h-[400px]">
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <div className="relative">
                <div className="h-14 w-14 rounded-full border-4 border-blue-200 dark:border-blue-900" />
                <Loader2 className="h-14 w-14 animate-spin text-blue-600 absolute inset-0" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">{STATUS_MESSAGES[statusIndex]}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This may take a moment depending on file length.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !result && (
          <Card className="min-h-[400px] flex items-center justify-center border-dashed">
            <CardContent className="text-center py-12">
              <div className="rounded-full bg-muted p-4 inline-flex mb-4">
                <Wand2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Results will appear here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Upload a file and click Transcribe to get started.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && result && <ResultsTabs result={result} />}
      </div>
    </div>
  );
}
