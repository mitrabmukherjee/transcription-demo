/** Max upload size (matches FileUploader and transcribe limits). */
export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

/** Use multipart client upload above Vercel server body limits. */
export const BLOB_MULTIPART_THRESHOLD_BYTES = 4.5 * 1024 * 1024;

export const BLOB_ALLOWED_CONTENT_TYPES = ["audio/*", "video/*"];

export function blobUploadPathname(filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `uploads/${safe || "media"}`;
}
