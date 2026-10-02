import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import {
  blobUploadPathname,
  MAX_UPLOAD_BYTES,
} from "@/lib/blob-upload";

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

  const bytes =
    file.size > MAX_UPLOAD_BYTES
      ? file.slice(0, MAX_UPLOAD_BYTES)
      : file;

  try {
    const blob = await put(blobUploadPathname(file.name), bytes, {
      access: "public",
      contentType: file.type || undefined,
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error: unknown) {
    console.error("[upload-direct]", error);
    const message =
      error instanceof Error ? error.message : "Server upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
