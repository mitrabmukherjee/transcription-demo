"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, X, FileAudio, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACCEPTED_TYPES = [
  "audio/mp3",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/m4a",
  "audio/mp4",
  "audio/webm",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

const ACCEPTED_EXTENSIONS = [".mp4", ".mov", ".mp3", ".wav", ".m4a", ".webm"];

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface FileUploaderProps {
  onFileChange: (file: File | null) => void;
}

export function FileUploader({ onFileChange }: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const handleFile = useCallback(
    (f: File) => {
      setError(null);
      setTruncated(false);

      const MAX = 500 * 1024 * 1024;
      const isVideo = f.type.startsWith("video/");

      if (f.size > MAX && isVideo) {
        setError(
          "Video files larger than 500 MB are not supported. Please trim your video or export audio only before uploading."
        );
        return;
      }

      let processedFile = f;
      if (f.size > MAX) {
        // Audio-only: slice to first 500 MB (stream formats degrade gracefully)
        const sliced = f.slice(0, MAX, f.type);
        processedFile = new File([sliced], f.name, { type: f.type });
        setTruncated(true);
      }

      const ext = "." + processedFile.name.split(".").pop()?.toLowerCase();
      const validMime = ACCEPTED_TYPES.includes(processedFile.type);
      const validExt = ACCEPTED_EXTENSIONS.includes(ext);

      if (!validMime && !validExt) {
        setError("Unsupported file type. Please upload audio or video.");
        return;
      }

      // Revoke previous object URL
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }

      const url = URL.createObjectURL(processedFile);
      objectUrlRef.current = url;

      setFile(processedFile);
      setDuration(null);
      onFileChange(processedFile);

      // Load metadata to get duration
      const media = processedFile.type.startsWith("video/")
        ? document.createElement("video")
        : document.createElement("audio");
      media.src = url;
      media.preload = "metadata";
      media.onloadedmetadata = () => {
        setDuration(media.duration);
      };
      mediaRef.current = media;
    },
    [onFileChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  const handleRemove = () => {
    setFile(null);
    setDuration(null);
    setError(null);
    setTruncated(false);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (inputRef.current) inputRef.current.value = "";
    onFileChange(null);
  };

  const isVideo = file?.type.startsWith("video/");

  return (
    <div className="space-y-3">
      {!file ? (
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
              : "border-muted-foreground/30 hover:border-blue-400 hover:bg-muted/40"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">
            Drag & drop or{" "}
            <span className="text-blue-500 underline underline-offset-2">
              browse
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports: MP4, MOV, MP3, WAV, M4A, WEBM · Max 500 MB
          </p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={ACCEPTED_EXTENSIONS.join(",")}
            onChange={handleInputChange}
          />
        </div>
      ) : (
        <div className="border rounded-xl p-4 space-y-3">
          {/* File info row */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 shrink-0">
              {isVideo ? (
                <FileVideo className="h-5 w-5 text-blue-600" />
              ) : (
                <FileAudio className="h-5 w-5 text-blue-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(file.size)}
                {duration !== null && ` · ${formatDuration(duration)}`}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Audio player */}
          {objectUrlRef.current && (
            <audio
              controls
              src={objectUrlRef.current}
              className="w-full h-9 rounded"
            />
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
      {truncated && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          ⚠️ File is larger than 500 MB — only the first 500 MB will be transcribed.
        </p>
      )}
    </div>
  );
}
