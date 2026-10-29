import { describe, expect, it } from "vitest";
import { isAllowedUploadBlobUrl } from "@/lib/blob-upload";

describe("isAllowedUploadBlobUrl", () => {
  it("accepts https public blob URLs under uploads/", () => {
    expect(
      isAllowedUploadBlobUrl(
        "https://abc123.public.blob.vercel-storage.com/uploads/recording-mp3-xyz"
      )
    ).toBe(true);
  });

  it("rejects non-https URLs", () => {
    expect(
      isAllowedUploadBlobUrl("http://abc.public.blob.vercel-storage.com/uploads/a")
    ).toBe(false);
  });

  it("rejects unrelated hosts", () => {
    expect(isAllowedUploadBlobUrl("https://evil.example.com/uploads/a")).toBe(false);
  });

  it("rejects paths without uploads segment", () => {
    expect(
      isAllowedUploadBlobUrl("https://abc.public.blob.vercel-storage.com/other/file")
    ).toBe(false);
  });
});
