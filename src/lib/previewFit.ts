/**
 * Preview stage fitting.
 *
 * The mobile editor viewport is the phone screen, not the wide desktop canvas.
 * The frame must stay centred in the visible viewport and hug the SOURCE aspect
 * ratio (9:16 for a vertical reel) so the video is not stranded inside a wide
 * 16:9 letterbox with large black areas.
 */

/** Default aspect ratio (vertical reel) used until metadata is known. */
export const DEFAULT_PREVIEW_ASPECT = 9 / 16;

/** CSS aspect-ratio fallback string, kept in sync with DEFAULT_PREVIEW_ASPECT. */
export const DEFAULT_PREVIEW_ASPECT_CSS = "9 / 16";

/**
 * CSS `aspect-ratio` value for a source video.
 *
 * Falls back to the 9:16 default when the intrinsic size is unknown or invalid,
 * so the layout is correct on first paint (before `loadedmetadata`).
 */
export function previewAspectCss(
  width?: number | null,
  height?: number | null,
  fallback: string = DEFAULT_PREVIEW_ASPECT_CSS,
): string {
  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return fallback;
  }
  return `${Math.round(width)} / ${Math.round(height)}`;
}

export interface FittedSize {
  width: number;
  height: number;
}

/**
 * Largest box of `aspect` that fits inside `available` without overflowing.
 * Returns `{width: 0, height: 0}` for a non-positive area.
 *
 * This is the reference model for the mobile rule: it proves the frame can be
 * centred without cropping (`object-contain` fills it exactly) and without
 * exceeding the viewport.
 */
export function fitWithin(
  availableWidth: number,
  availableHeight: number,
  aspect: number,
): FittedSize {
  if (
    !Number.isFinite(availableWidth) ||
    !Number.isFinite(availableHeight) ||
    !Number.isFinite(aspect) ||
    availableWidth <= 0 ||
    availableHeight <= 0 ||
    aspect <= 0
  ) {
    return { width: 0, height: 0 };
  }
  const byWidth: FittedSize = {
    width: availableWidth,
    height: availableWidth / aspect,
  };
  if (byWidth.height <= availableHeight) {
    return { width: Math.floor(byWidth.width), height: Math.floor(byWidth.height) };
  }
  return {
    width: Math.floor(availableHeight * aspect),
    height: Math.floor(availableHeight),
  };
}
