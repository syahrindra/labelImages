export const CLASS_COLOR_PALETTE: string[] = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#6366f1', // Indigo
];

/**
 * Returns a color from the palette for a given class index,
 * wrapping around cleanly if there are more than 10 classes.
 */
export function getClassColor(index: number): string {
  return CLASS_COLOR_PALETTE[index % CLASS_COLOR_PALETTE.length];
}

export function getNextClassColor(existingCount: number): string {
  return getClassColor(existingCount);
}

/**
 * Checks whether a string is a valid 6-digit hex color like "#ef4444".
 */
export function isValidHexColor(value: string): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length !== 7) {
    return false;
  }

  if (trimmedValue.startsWith('#') === false) {
    return false;
  }

  const hexPart = trimmedValue.slice(1);
  const hexPattern = /^[0-9a-fA-F]{6}$/;

  return hexPattern.test(hexPart);
}

/**
 * Returns the given color when it is a valid hex color,
 * otherwise returns the provided fallback color.
 */
export function withValidHexColorOrFallback(
  value: string,
  fallback: string
): string {
  if (isValidHexColor(value)) {
    return value.toLowerCase();
  }

  return fallback;
}
