export const SPEAKER_COLOR_CLASSES = [
  "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
] as const;

/** Stable bucket for timeline badge colors (letters, numbers, or hashed names). */
export function speakerColorIndex(speaker: string): number {
  const trimmed = speaker.trim();
  const letterLabel = trimmed.match(/^Speaker\s+([A-Z]|\d+)$/i);
  if (letterLabel) {
    const token = letterLabel[1];
    if (/^\d+$/.test(token)) return parseInt(token, 10);
    return token.toUpperCase().charCodeAt(0) - 65;
  }

  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash * 31 + trimmed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getSpeakerColorClass(speaker: string): string {
  const index = speakerColorIndex(speaker) % SPEAKER_COLOR_CLASSES.length;
  return SPEAKER_COLOR_CLASSES[index < 0 ? index + SPEAKER_COLOR_CLASSES.length : index];
}
