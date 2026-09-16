/**
 * Music value normalisation.
 *
 * The editor persists the selected music in `localStorage.selectedMusic`. A
 * missing/cleared selection can round-trip through storage as the STRING "null"
 * (or "undefined"), which is truthy — so a naive `if (projectData.music)` check
 * treats "no music" as a real track and renders the literal text `Music: null`
 * to the user. Never render a literal null-ish value.
 */

/** Values that mean "no music selected". Compared case-insensitively after trim. */
const EMPTY_MUSIC_VALUES = new Set([
  "",
  "null",
  "undefined",
  "none",
  "n/a",
  "na",
  "nan",
  "false",
]);

/**
 * Normalise an arbitrary stored music value.
 * @returns the trimmed track name, or `null` when there is no real selection.
 */
export function normalizeMusic(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const raw = typeof value === "string" ? value : String(value);
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (EMPTY_MUSIC_VALUES.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

/** True only when a real music selection exists. */
export function hasMusic(value: unknown): boolean {
  return normalizeMusic(value) !== null;
}

/**
 * Human-facing music label. Never returns a literal null-ish string.
 * @param emptyLabel shown when there is no music (default "No music").
 */
export function musicLabel(value: unknown, emptyLabel = "No music"): string {
  return normalizeMusic(value) ?? emptyLabel;
}

/** Track name for a real selection, or null when the track should not be created. */
export function musicTrackName(value: unknown): string | null {
  const name = normalizeMusic(value);
  return name ? `Music: ${name}` : null;
}
