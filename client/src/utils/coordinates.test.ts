import { describe, it, expect } from 'vitest';
import {
  yoloToPixelBox,
  pixelBoxToYolo,
  imageToCanvasCoords,
  canvasToImageCoords,
  calculateFitTransform,
  isPointInBox,
  normalizeRect,
} from './coordinates.js';
import { YoloAnnotation, PixelBox, ViewTransform } from '../types/annotation.js';

describe('coordinates utils', () => {
  const imageDims = { width: 1000, height: 800 };

  describe('yoloToPixelBox and pixelBoxToYolo (bidirectional conversion)', () => {
    it('should accurately convert a centered YOLO box to pixel coordinates', () => {
      // Box centered at (500, 400), width 200, height 160
      const yolo: YoloAnnotation = {
        classId: 0,
        xCenter: 0.5,
        yCenter: 0.5,
        width: 0.2,
        height: 0.2,
      };

      const pixelBox = yoloToPixelBox(yolo, imageDims.width, imageDims.height, 'test-1');

      expect(pixelBox.id).toBe('test-1');
      expect(pixelBox.classId).toBe(0);
      expect(pixelBox.x).toBeCloseTo(400); // 500 - (200 / 2)
      expect(pixelBox.y).toBeCloseTo(320); // 400 - (160 / 2)
      expect(pixelBox.width).toBeCloseTo(200);
      expect(pixelBox.height).toBeCloseTo(160);
    });

    it('should round-trip cleanly from pixel box to YOLO and back', () => {
      const originalBox: PixelBox = {
        id: 'box-1',
        classId: 2,
        x: 100,
        y: 200,
        width: 300,
        height: 150,
      };

      const yolo = pixelBoxToYolo(originalBox, imageDims.width, imageDims.height);
      const convertedBack = yoloToPixelBox(yolo, imageDims.width, imageDims.height, originalBox.id);

      expect(convertedBack.x).toBeCloseTo(originalBox.x);
      expect(convertedBack.y).toBeCloseTo(originalBox.y);
      expect(convertedBack.width).toBeCloseTo(originalBox.width);
      expect(convertedBack.height).toBeCloseTo(originalBox.height);
      expect(convertedBack.classId).toBe(originalBox.classId);
    });
  });

  describe('canvas <-> image coordinate transformations', () => {
    const transform: ViewTransform = {
      scale: 2.0, // 2x zoom
      offsetX: 50,
      offsetY: 100,
    };

    it('should correctly convert image coords to canvas coords', () => {
      const imgPoint = { x: 10, y: 20 };
      const canvasPoint = imageToCanvasCoords(imgPoint, transform);

      // canvasX = (10 * 2) + 50 = 70
      // canvasY = (20 * 2) + 100 = 140
      expect(canvasPoint.x).toBe(70);
      expect(canvasPoint.y).toBe(140);
    });

    it('should correctly invert canvas coords back to image coords', () => {
      const canvasPoint = { x: 70, y: 140 };
      const imgPoint = canvasToImageCoords(canvasPoint, transform);

      expect(imgPoint.x).toBeCloseTo(10);
      expect(imgPoint.y).toBeCloseTo(20);
    });
  });

  describe('calculateFitTransform', () => {
    it('should scale image proportionally to fit inside canvas with centering', () => {
      const canvas = { width: 800, height: 600 };
      const image = { width: 1600, height: 800 }; // 2:1 aspect ratio

      const fit = calculateFitTransform(canvas, image, 0);

      // Width ratio = 800 / 1600 = 0.5
      // Height ratio = 600 / 800 = 0.75
      // Min scale = 0.5
      expect(fit.scale).toBe(0.5);

      // Scaled image is 800x400
      // Centered: offsetX = (800 - 800) / 2 = 0
      // Centered: offsetY = (600 - 400) / 2 = 100
      expect(fit.offsetX).toBe(0);
      expect(fit.offsetY).toBe(100);
    });
  });

  describe('isPointInBox', () => {
    const box: PixelBox = {
      id: '1',
      classId: 0,
      x: 100,
      y: 100,
      width: 200,
      height: 100,
    };

    it('should return true when point is inside box', () => {
      expect(isPointInBox({ x: 150, y: 150 }, box)).toBe(true);
    });

    it('should return false when point is outside box', () => {
      expect(isPointInBox({ x: 50, y: 50 }, box)).toBe(false);
      expect(isPointInBox({ x: 350, y: 150 }, box)).toBe(false);
    });
  });

  describe('normalizeRect', () => {
    it('should handle dragging backward (bottom-right to top-left)', () => {
      const start = { x: 300, y: 200 };
      const end = { x: 100, y: 50 };

      const rect = normalizeRect(start, end);

      expect(rect.x).toBe(100);
      expect(rect.y).toBe(50);
      expect(rect.width).toBe(200);
      expect(rect.height).toBe(150);
    });
  });
});
