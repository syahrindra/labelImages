import { YoloAnnotation } from '../types/annotation.js';

/**
 * Parses a YOLO .txt file string into an array of structured YoloAnnotation objects.
 *
 * Each valid line has the format:
 *   <class_id> <x_center> <y_center> <width> <height>
 *
 * All numbers must be valid and coordinates must fall in the range [0.0, 1.0].
 * Any empty or corrupted lines are safely skipped.
 */
export function parseYoloTxt(content: string): YoloAnnotation[] {
  const annotations: YoloAnnotation[] = [];

  // Split file into individual lines
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Skip empty lines
    if (line.length === 0) {
      continue;
    }

    // Split by one or more whitespace characters (handles both spaces and tabs)
    const tokens = line.split(/\s+/);

    // Each YOLO line must contain exactly 5 values
    if (tokens.length !== 5) {
      continue;
    }

    const classId = parseInt(tokens[0], 10);
    const xCenter = parseFloat(tokens[1]);
    const yCenter = parseFloat(tokens[2]);
    const width = parseFloat(tokens[3]);
    const height = parseFloat(tokens[4]);

    // Validation 1: Ensure all values are valid numbers (not NaN)
    if (
      isNaN(classId) ||
      isNaN(xCenter) ||
      isNaN(yCenter) ||
      isNaN(width) ||
      isNaN(height)
    ) {
      continue;
    }

    // Validation 2: classId must be non-negative integer
    if (classId < 0) {
      continue;
    }

    // Validation 3: Coordinates and dimensions must be within [0.0, 1.0]
    if (
      xCenter < 0 || xCenter > 1 ||
      yCenter < 0 || yCenter > 1 ||
      width <= 0 || width > 1 ||
      height <= 0 || height > 1
    ) {
      continue;
    }

    // Successfully validated: add to result list
    annotations.push({
      classId,
      xCenter,
      yCenter,
      width,
      height,
    });
  }

  return annotations;
}

/**
 * Serializes an array of YoloAnnotation objects back into YOLO .txt format.
 *
 * Each box is written as:
 *   <class_id> <x_center> <y_center> <width> <height>
 * Coordinates are formatted to 6 decimal places.
 */
export function serializeYoloTxt(annotations: YoloAnnotation[]): string {
  if (annotations.length === 0) {
    return '';
  }

  const lines: string[] = [];

  for (const annotation of annotations) {
    const line = [
      annotation.classId.toString(),
      annotation.xCenter.toFixed(6),
      annotation.yCenter.toFixed(6),
      annotation.width.toFixed(6),
      annotation.height.toFixed(6),
    ].join(' ');

    lines.push(line);
  }

  return lines.join('\n');
}
