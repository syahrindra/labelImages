/**
 * Represents a bounding box in normalized YOLO coordinates.
 * All coordinates (xCenter, yCenter, width, height) are normalized between 0.0 and 1.0
 * relative to the image's natural width and height.
 */
export interface YoloAnnotation {
  classId: number;
  xCenter: number;
  yCenter: number;
  width: number;
  height: number;
}

/**
 * Metadata for an image file in the dataset.
 */
export interface ImageFileMeta {
  id: string;              // unique identifier, e.g. "cat_001.jpg"
  filename: string;        // "cat_001.jpg"
  relativePath: string;    // relative to the active dataset root
  isLabeled: boolean;      // true if an annotation file exists with >= 1 box
  boxCount: number;        // count of annotated bounding boxes
}

/**
 * Dataset class label definition.
 */
export interface ClassLabel {
  id: number;              // zero-indexed integer class id (matches YOLO classId)
  name: string;            // human readable class name, e.g. "cat"
  color: string;           // hex color code for UI rendering
}
