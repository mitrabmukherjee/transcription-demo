import { describe, expect, it } from "vitest";
import { getSpeakerColorClass, speakerColorIndex } from "@/lib/speaker-display";

describe("speakerColorIndex", () => {
  it("maps letter speaker labels to distinct buckets", () => {
    expect(speakerColorIndex("Speaker A")).not.toBe(speakerColorIndex("Speaker B"));
  });

  it("maps different names to different buckets", () => {
    expect(speakerColorIndex("Judith Klimovsky")).not.toBe(
      speakerColorIndex("Alex Rivera")
    );
  });
});

describe("getSpeakerColorClass", () => {
  it("returns a stable tailwind class string", () => {
    const cls = getSpeakerColorClass("Speaker C");
    expect(cls).toContain("bg-");
    expect(getSpeakerColorClass("Speaker C")).toBe(cls);
  });
});
