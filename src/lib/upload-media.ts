import { upload } from "@vercel/blob/client";
import {
  BLOB_MULTIPART_THRESHOLD_BYTES,
  blobUploadPathname,
} from "@/lib/blob-upload";

export type BlobUploadMode = "client" | "server";

export async function uploadMediaFile(
  file: File,
  mode: BlobUploadMode
): Promise<string> {
  if (mode === "client") {
    const blob = await upload(blobUploadPathname(file.name), file, {
      access: "public",
      handleUploadUrl: "/api/upload",
      multipart: file.size > BLOB_MULTIPART_THRESHOLD_BYTES,
      contentType: file.type || undefined,
    });
    return blob.url;
  }

  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch("/api/upload-direct", {
    method: "POST",
    body: fd,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error || `Upload failed (${res.status})`
    );
  }

  const data = (await res.json()) as { url: string };
  if (!data.url) {
    throw new Error("Upload succeeded but no blob URL was returned");
  }

  return data.url;
}
