/**
 * Normalized YOLO coordinates (0.0 to 1.0 relative to natural image dimensions).
 */
export interface YoloAnnotation {
  classId: number;
  xCenter: number;
  yCenter: number;
  width: number;
  height: number;
}

/**
 * Bounding box in un-normalized image pixel coordinates.
 * (x, y) is the top-left corner of the box.
 */
export interface PixelBox {
  id: string; // client-side unique id for UI selection / keying
  classId: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 2D point coordinate.
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Dimensions of a 2D surface.
 */
export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Canvas pan & zoom transformation.
 */
export interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Class label definition.
 */
export interface ClassLabel {
  id: number;
  name: string;
  color: string;
}

/**
 * Image metadata from server.
 */
export interface ImageFileMeta {
  id: string;
  filename: string;
  relativePath: string;
  isLabeled: boolean;
  boxCount: number;
}

/**
 * Handles for resizing boxes.
 */
export type ResizeHandle =
  | 'topLeft'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomRight';
