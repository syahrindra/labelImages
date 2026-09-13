import { describe, it, expect } from 'vitest';
import { parseYoloTxt, serializeYoloTxt } from './yoloParser.js';
import { YoloAnnotation } from '../types/annotation.js';

describe('yoloParser', () => {
  describe('parseYoloTxt', () => {
    it('should parse valid YOLO text lines into annotations', () => {
      const rawText = `0 0.500000 0.500000 0.200000 0.300000
1 0.750000 0.250000 0.100000 0.150000`;

      const annotations = parseYoloTxt(rawText);

      expect(annotations).toHaveLength(2);
      expect(annotations[0]).toEqual({
        classId: 0,
        xCenter: 0.5,
        yCenter: 0.5,
        width: 0.2,
        height: 0.3,
      });
      expect(annotations[1]).toEqual({
        classId: 1,
        xCenter: 0.75,
        yCenter: 0.25,
        width: 0.1,
        height: 0.15,
      });
    });

    it('should return an empty array when given an empty or whitespace-only string', () => {
      expect(parseYoloTxt('')).toEqual([]);
      expect(parseYoloTxt('   \n  \t\n  ')).toEqual([]);
    });

    it('should handle extra spaces and tabs between tokens gracefully', () => {
      const rawText = `0    0.500000 \t 0.500000   0.200000  0.300000`;
      const annotations = parseYoloTxt(rawText);

      expect(annotations).toHaveLength(1);
      expect(annotations[0].classId).toBe(0);
      expect(annotations[0].xCenter).toBe(0.5);
    });

    it('should ignore corrupt or malformed lines without crashing', () => {
      const rawText = `0 0.5 0.5 0.2 0.3
this is a corrupt line
1 0.2 0.2
2 0.1 0.1 -0.5 0.5
3 0.1 0.1 0.2 1.5`;

      const annotations = parseYoloTxt(rawText);

      // Only the first line is valid (the others are corrupt, incomplete, or out of bounds)
      expect(annotations).toHaveLength(1);
      expect(annotations[0].classId).toBe(0);
    });
  });

  describe('serializeYoloTxt', () => {
    it('should serialize annotations to YOLO formatted string', () => {
      const annotations: YoloAnnotation[] = [
        { classId: 0, xCenter: 0.5, yCenter: 0.5, width: 0.2, height: 0.3 },
        { classId: 1, xCenter: 0.75, yCenter: 0.25, width: 0.1, height: 0.15 },
      ];

      const serialized = serializeYoloTxt(annotations);

      const expected = `0 0.500000 0.500000 0.200000 0.300000\n1 0.750000 0.250000 0.100000 0.150000`;
      expect(serialized).toBe(expected);
    });

    it('should return an empty string for an empty annotations array', () => {
      expect(serializeYoloTxt([])).toBe('');
    });
  });
});
