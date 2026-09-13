import {
  YoloAnnotation,
  PixelBox,
  Point,
  Dimensions,
  ViewTransform,
  ResizeHandle,
} from '../types/annotation.js';

/**
 * Restricts a number to be between min and max.
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Converts a normalized YOLO annotation (0.0 to 1.0) into pixel coordinates
 * relative to the natural image width and height.
 */
export function yoloToPixelBox(
  yolo: YoloAnnotation,
  imgWidth: number,
  imgHeight: number,
  id: string = Math.random().toString(36).substring(2, 9)
): PixelBox {
  const boxWidth = yolo.width * imgWidth;
  const boxHeight = yolo.height * imgHeight;
  const boxX = yolo.xCenter * imgWidth - boxWidth / 2;
  const boxY = yolo.yCenter * imgHeight - boxHeight / 2;

  return {
    id: id,
    classId: yolo.classId,
    x: boxX,
    y: boxY,
    width: boxWidth,
    height: boxHeight,
  };
}

/**
 * Converts a pixel box back into normalized YOLO annotation format (0.0 to 1.0).
 */
export function pixelBoxToYolo(
  box: PixelBox,
  imgWidth: number,
  imgHeight: number
): YoloAnnotation {
  const xCenter = (box.x + box.width / 2) / imgWidth;
  const yCenter = (box.y + box.height / 2) / imgHeight;
  const normalizedWidth = box.width / imgWidth;
  const normalizedHeight = box.height / imgHeight;

  return {
    classId: box.classId,
    xCenter: clamp(xCenter, 0, 1),
    yCenter: clamp(yCenter, 0, 1),
    width: clamp(normalizedWidth, 0, 1),
    height: clamp(normalizedHeight, 0, 1),
  };
}

/**
 * Converts image pixel coordinates to canvas element pixel coordinates.
 */
export function imageToCanvasCoords(
  point: Point,
  transform: ViewTransform
): Point {
  return {
    x: point.x * transform.scale + transform.offsetX,
    y: point.y * transform.scale + transform.offsetY,
  };
}

/**
 * Converts canvas element pixel coordinates back to image pixel coordinates.
 */
export function canvasToImageCoords(
  point: Point,
  transform: ViewTransform
): Point {
  return {
    x: (point.x - transform.offsetX) / transform.scale,
    y: (point.y - transform.offsetY) / transform.scale,
  };
}

/**
 * Calculates the view transform (scale and offset) to fit an image neatly
 * inside the canvas viewport, centered with optional padding.
 */
export function calculateFitTransform(
  canvas: Dimensions,
  image: Dimensions,
  padding: number = 24
): ViewTransform {
  const availableWidth = Math.max(10, canvas.width - padding * 2);
  const availableHeight = Math.max(10, canvas.height - padding * 2);

  const scaleX = availableWidth / image.width;
  const scaleY = availableHeight / image.height;
  const scale = Math.min(scaleX, scaleY);

  const scaledWidth = image.width * scale;
  const scaledHeight = image.height * scale;

  const offsetX = (canvas.width - scaledWidth) / 2;
  const offsetY = (canvas.height - scaledHeight) / 2;

  return {
    scale: scale,
    offsetX: offsetX,
    offsetY: offsetY,
  };
}

/**
 * Checks whether a 2D point is located inside a pixel bounding box.
 */
export function isPointInBox(point: Point, box: PixelBox): boolean {
  const minX = Math.min(box.x, box.x + box.width);
  const maxX = Math.max(box.x, box.x + box.width);
  const minY = Math.min(box.y, box.y + box.height);
  const maxY = Math.max(box.y, box.y + box.height);

  return (
    point.x >= minX &&
    point.x <= maxX &&
    point.y >= minY &&
    point.y <= maxY
  );
}

/**
 * Converts any two diagonal points (start and end of a mouse drag)
 * into a normalized bounding box where width and height are guaranteed to be positive.
 */
export function normalizeRect(
  start: Point,
  end: Point
): { x: number; y: number; width: number; height: number } {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return { x, y, width, height };
}

/**
 * Detects whether a point in canvas coordinates is over one of the 4 corner handles of a selected box.
 */
export function getHandleUnderPoint(
  canvasPoint: Point,
  box: PixelBox,
  transform: ViewTransform,
  hitRadius: number = 8
): ResizeHandle | null {
  const topLeft = imageToCanvasCoords({ x: box.x, y: box.y }, transform);
  const boxCanvasWidth = box.width * transform.scale;
  const boxCanvasHeight = box.height * transform.scale;

  const handles: { handle: ResizeHandle; point: Point }[] = [
    { handle: 'topLeft', point: { x: topLeft.x, y: topLeft.y } },
    { handle: 'topRight', point: { x: topLeft.x + boxCanvasWidth, y: topLeft.y } },
    { handle: 'bottomLeft', point: { x: topLeft.x, y: topLeft.y + boxCanvasHeight } },
    { handle: 'bottomRight', point: { x: topLeft.x + boxCanvasWidth, y: topLeft.y + boxCanvasHeight } },
  ];

  for (const { handle, point } of handles) {
    const dx = Math.abs(canvasPoint.x - point.x);
    const dy = Math.abs(canvasPoint.y - point.y);
    if (dx <= hitRadius && dy <= hitRadius) {
      return handle;
    }
  }

  return null;
}

/**
 * Resizes a box by dragging one of its 4 corner handles to currentImagePoint.
 * Anchors the opposite corner and uses normalizeRect to handle flips.
 */
export function resizeBox(
  box: PixelBox,
  handle: ResizeHandle,
  currentImagePoint: Point
): PixelBox {
  let anchorPoint: Point;

  switch (handle) {
    case 'topLeft':
      anchorPoint = { x: box.x + box.width, y: box.y + box.height };
      break;
    case 'topRight':
      anchorPoint = { x: box.x, y: box.y + box.height };
      break;
    case 'bottomLeft':
      anchorPoint = { x: box.x + box.width, y: box.y };
      break;
    case 'bottomRight':
      anchorPoint = { x: box.x, y: box.y };
      break;
  }

  const rect = normalizeRect(anchorPoint, currentImagePoint);

  return {
    ...box,
    x: rect.x,
    y: rect.y,
    width: Math.max(5, rect.width),
    height: Math.max(5, rect.height),
  };
}

/**
 * Moves a box by (dx, dy) in image pixel coordinates, clamped within image bounds.
 */
export function moveBox(
  box: PixelBox,
  dx: number,
  dy: number,
  imgWidth: number,
  imgHeight: number
): PixelBox {
  const newX = clamp(box.x + dx, 0, Math.max(0, imgWidth - box.width));
  const newY = clamp(box.y + dy, 0, Math.max(0, imgHeight - box.height));

  return {
    ...box,
    x: newX,
    y: newY,
  };
}

