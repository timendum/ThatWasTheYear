/**
 * Shared normalization helpers for title/artist comparison across scripts.
 * These mirror the logic used in check-songs.ts checkSong().
 */

/** Strip ", Pt. N" suffix */
const RE_PT = /,\s*Pt\.\s*\d+\s*$/iu;

/** Strip "[nnnn Remaster]" suffix */
const RE_REMASTER_BRACKET = /\s*\[\d{4}\s+Remaster\]\s*$/iu;

/** Strip trailing parenthetical e.g. "(Remastered 2012)" */
const RE_TRAILING_PAREN = /\s*\([^)]+\)\s*$/u;

/** Detect feat. inside trailing parenthetical */
const RE_FEAT = /\s*\((feat\.?\s+[^)]+)\)\s*$/u;

/** Normalize a title for similarity comparison. */
export function normalizeTitle(s: string): string {
  return s
    .replace(RE_PT, "")
    .replace(RE_REMASTER_BRACKET, "")
    .replace(RE_TRAILING_PAREN, "")
    .toLowerCase();
}

/**
 * Normalize a track title as returned by iTunes for comparison with the local song title.
 * Applies the same stripping as normalizeTitle but without the trailing-paren removal
 * (that's handled separately when feat. matching is needed).
 */
export function normalizeTrackTitle(s: string): string {
  return s
    .replace(RE_PT, "")
    .replace(RE_REMASTER_BRACKET, "")
    .toLowerCase();
}

/** Extract feat. info from a track title's trailing parenthetical, if present. */
export function extractFeat(s: string): RegExpMatchArray | null {
  return s.toLowerCase().match(RE_FEAT);
}

/** Remove trailing parenthetical from a string (lowercased). */
export function stripTrailingParen(s: string): string {
  return s.replace(RE_TRAILING_PAREN, "");
}
