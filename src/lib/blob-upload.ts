/** Max upload size (matches FileUploader and transcribe limits). */
export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

/** Use multipart client upload above Vercel server body limits. */
export const BLOB_MULTIPART_THRESHOLD_BYTES = 4.5 * 1024 * 1024;

export const BLOB_ALLOWED_CONTENT_TYPES = ["audio/*", "video/*"];

/** MIME types accepted in the file picker and server-direct upload. */
export const UPLOAD_MEDIA_MIME_TYPES = [
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
] as const;

export const UPLOAD_MEDIA_EXTENSIONS = [
  ".mp4",
  ".mov",
  ".mp3",
  ".wav",
  ".m4a",
  ".webm",
] as const;

const PUBLIC_BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

export function blobUploadPathname(filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `uploads/${safe || "media"}`;
}

/** Only delete/transcribe blobs created by this app (public store, uploads/ prefix). */
export function isAllowedUploadBlobUrl(audioUrl: string): boolean {
  try {
    const url = new URL(audioUrl);
    if (url.protocol !== "https:") return false;
    const hostOk =
      url.hostname.endsWith(PUBLIC_BLOB_HOST_SUFFIX) ||
      url.hostname === "public.blob.vercel-storage.com";
    if (!hostOk) return false;
    const path = decodeURIComponent(url.pathname);
    return path.includes("/uploads/");
  } catch {
    return false;
  }
}

export function isAllowedMediaFile(file: File): boolean {
  const mime = file.type.trim();
  if (mime) {
    if (UPLOAD_MEDIA_MIME_TYPES.includes(mime as (typeof UPLOAD_MEDIA_MIME_TYPES)[number])) {
      return true;
    }
    if (mime.startsWith("audio/") || mime.startsWith("video/")) {
      return true;
    }
  }
  const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  return UPLOAD_MEDIA_EXTENSIONS.includes(
    ext as (typeof UPLOAD_MEDIA_EXTENSIONS)[number]
  );
}
