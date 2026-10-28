import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import {
  blobUploadPathname,
  isAllowedMediaFile,
  MAX_UPLOAD_BYTES,
} from "@/lib/blob-upload";
import { publicApiErrorMessage } from "@/lib/client-errors";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (!process.env.BLOB_STORE_ID) {
    return NextResponse.json(
      {
        error:
          "Blob store is not configured. Set BLOB_STORE_ID (from Vercel Storage) or BLOB_READ_WRITE_TOKEN for client uploads.",
      },
      { status: 400 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (!isAllowedMediaFile(file)) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload audio or video." },
      { status: 415 }
    );
  }

  if (
    file.size > MAX_UPLOAD_BYTES &&
    file.type.startsWith("video/")
  ) {
    return NextResponse.json(
      {
        error:
          "Video files larger than 500 MB are not supported. Please trim the video or export audio only.",
      },
      { status: 413 }
    );
  }

  const truncated = file.size > MAX_UPLOAD_BYTES;
  const bytes = truncated ? file.slice(0, MAX_UPLOAD_BYTES) : file;

  try {
    const blob = await put(blobUploadPathname(file.name), bytes, {
      access: "public",
      contentType: file.type || undefined,
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url, truncated });
  } catch (error: unknown) {
    console.error("[upload-direct]", error);
    return NextResponse.json(
      { error: publicApiErrorMessage(error, "Server upload failed") },
      { status: 500 }
    );
  }
}
