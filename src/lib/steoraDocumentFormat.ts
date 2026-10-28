import {
  Document,
  LineRuleType,
  Packer,
  Paragraph,
  TextRun,
  convertInchesToTwip,
  type IRunOptions,
} from "docx";
import type { SpeakerSegment } from "@/lib/types";

/** Steora reference DOCX body typography (OOXML docDefaults). */
export const STEORA_FONT = "Calibri";
export const STEORA_FONT_SIZE_HALF_POINTS = 24;
export const STEORA_SPACING_AFTER_TWIPS = 160;
export const STEORA_LINE_TWIPS = 278;
export const STEORA_MARGIN_TWIPS = convertInchesToTwip(1);
export const STEORA_LANG = "en-US";

export const STEORA_CLIPBOARD_PARAGRAPH_STYLE =
  "font-family: Calibri, sans-serif; font-size: 12pt; line-height: 1.158; margin-bottom: 8pt; margin-top: 0;";

export function steoraParagraphSpacing() {
  return {
    after: STEORA_SPACING_AFTER_TWIPS,
    line: STEORA_LINE_TWIPS,
    lineRule: LineRuleType.AUTO,
  };
}

export function steoraTextRun(text: string, overrides?: Partial<IRunOptions>) {
  return new TextRun({
    text,
    font: STEORA_FONT,
    size: STEORA_FONT_SIZE_HALF_POINTS,
    language: { value: STEORA_LANG },
    ...overrides,
  });
}

export function steoraEmptyParagraph(): Paragraph {
  return new Paragraph({
    children: [],
    spacing: steoraParagraphSpacing(),
  });
}

export function steoraContentParagraph(children: TextRun[]): Paragraph {
  return new Paragraph({
    children,
    spacing: steoraParagraphSpacing(),
  });
}

export function steoraSectionProperties() {
  return {
    page: {
      margin: {
        top: STEORA_MARGIN_TWIPS,
        right: STEORA_MARGIN_TWIPS,
        bottom: STEORA_MARGIN_TWIPS,
        left: STEORA_MARGIN_TWIPS,
      },
    },
  };
}

export function buildSteoraDocument(children: Paragraph[]): Document {
  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: STEORA_FONT,
            size: STEORA_FONT_SIZE_HALF_POINTS,
            language: { value: STEORA_LANG },
          },
          paragraph: {
            spacing: steoraParagraphSpacing(),
          },
        },
      },
    },
    sections: [
      {
        properties: steoraSectionProperties(),
        children,
      },
    ],
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Genmab-style: one paragraph per utterance, `Speaker N: text`, no bold. */
export function buildDiarizationDocxParagraphs(
  utterances: SpeakerSegment[]
): Paragraph[] {
  return utterances.map((u) => {
    const speaker = u.speaker;
    const speech = u.text;
    return steoraContentParagraph([
      steoraTextRun(speaker),
      steoraTextRun(":"),
      steoraTextRun(" "),
      steoraTextRun(speech),
    ]);
  });
}

/** Leroy-style: content paragraph then blank paragraph between blocks. */
export function buildTranscriptDocxParagraphs(paragraphs: string[]): Paragraph[] {
  const docxParagraphs: Paragraph[] = [];
  const nonEmpty = paragraphs.map((p) => p.trim()).filter(Boolean);
  nonEmpty.forEach((text, index) => {
    docxParagraphs.push(steoraContentParagraph([steoraTextRun(text)]));
    if (index < nonEmpty.length - 1) {
      docxParagraphs.push(steoraEmptyParagraph());
    }
  });
  return docxParagraphs;
}

/** One Genmab-style line per utterance (`Speaker: text`). */
export function steoraParagraphsFromUtterances(
  utterances: SpeakerSegment[]
): string[] {
  return utterances.map((u) => `${u.speaker}: ${u.text}`);
}

export function buildDiarizationPlainText(utterances: SpeakerSegment[]): string {
  return steoraParagraphsFromUtterances(utterances).join("\n");
}

export function buildDiarizationHtml(utterances: SpeakerSegment[]): string {
  return utterances
    .map(
      (u) =>
        `<p style="${STEORA_CLIPBOARD_PARAGRAPH_STYLE}">${escapeHtml(
          `${u.speaker}: ${u.text}`
        )}</p>`
    )
    .join("");
}

export function buildTranscriptPlainText(paragraphs: string[]): string {
  return paragraphs
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function buildTranscriptHtml(paragraphs: string[]): string {
  const parts: string[] = [];
  const nonEmpty = paragraphs.map((p) => p.trim()).filter(Boolean);
  nonEmpty.forEach((text, index) => {
    parts.push(
      `<p style="${STEORA_CLIPBOARD_PARAGRAPH_STYLE}">${escapeHtml(text)}</p>`
    );
    if (index < nonEmpty.length - 1) {
      parts.push(`<p style="${STEORA_CLIPBOARD_PARAGRAPH_STYLE}">&nbsp;</p>`);
    }
  });
  return parts.join("");
}

export async function packSteoraDocx(paragraphs: Paragraph[]): Promise<Blob> {
  const doc = buildSteoraDocument(paragraphs);
  return Packer.toBlob(doc);
}

/** Fallback when AssemblyAI paragraphs endpoint returns nothing. */
export function splitTranscriptIntoParagraphs(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const byBlank = trimmed
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (byBlank.length > 1) return byBlank;

  const sentences = trimmed.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [
    trimmed,
  ];
  const paragraphs: string[] = [];
  let buffer = "";
  for (const sentence of sentences) {
    if (buffer.length + sentence.length > 600 && buffer) {
      paragraphs.push(buffer.trim());
      buffer = sentence;
    } else {
      buffer += sentence;
    }
  }
  if (buffer.trim()) paragraphs.push(buffer.trim());
  return paragraphs.length > 0 ? paragraphs : [trimmed];
}
