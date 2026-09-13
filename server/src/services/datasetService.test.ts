import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  scanDatasetImages,
  loadAnnotationsForImage,
  saveAnnotationsForImage,
  loadClassLabels,
  saveClassLabels,
} from './datasetService.js';
import { YoloAnnotation } from '../types/annotation.js';

describe('datasetService', () => {
  let tempDir: string;

  // Create a clean temporary directory before each test
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'label-test-'));
  });

  // Clean up the temporary directory after each test
  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('scanDatasetImages', () => {
    it('should only list valid jpg and png files, naturally sorted', async () => {
      // Create test files in temp directory
      await fs.writeFile(path.join(tempDir, 'image_10.jpg'), '');
      await fs.writeFile(path.join(tempDir, 'image_2.png'), '');
      await fs.writeFile(path.join(tempDir, 'image_1.JPEG'), '');
      await fs.writeFile(path.join(tempDir, 'document.pdf'), ''); // should be ignored
      await fs.writeFile(path.join(tempDir, 'notes.txt'), '');     // should be ignored

      const images = await scanDatasetImages(tempDir);

      expect(images).toHaveLength(3);
      // Natural sort verification: image_1 -> image_2 -> image_10
      expect(images[0].filename).toBe('image_1.JPEG');
      expect(images[1].filename).toBe('image_2.png');
      expect(images[2].filename).toBe('image_10.jpg');
    });

    it('should correctly identify labeled images and count boxes', async () => {
      // Image 1: has 2 annotations
      await fs.writeFile(path.join(tempDir, 'cat.jpg'), '');
      await fs.writeFile(
        path.join(tempDir, 'cat.txt'),
        '0 0.5 0.5 0.2 0.2\n1 0.7 0.7 0.1 0.1\n'
      );

      // Image 2: unlabeled (no txt file)
      await fs.writeFile(path.join(tempDir, 'dog.png'), '');

      // Image 3: has an empty txt file (0 boxes -> unlabeled)
      await fs.writeFile(path.join(tempDir, 'bird.jpg'), '');
      await fs.writeFile(path.join(tempDir, 'bird.txt'), '   \n');

      const images = await scanDatasetImages(tempDir);

      const catMeta = images.find((img) => img.filename === 'cat.jpg');
      const dogMeta = images.find((img) => img.filename === 'dog.png');
      const birdMeta = images.find((img) => img.filename === 'bird.jpg');

      expect(catMeta?.isLabeled).toBe(true);
      expect(catMeta?.boxCount).toBe(2);

      expect(dogMeta?.isLabeled).toBe(false);
      expect(dogMeta?.boxCount).toBe(0);

      expect(birdMeta?.isLabeled).toBe(false);
      expect(birdMeta?.boxCount).toBe(0);
    });
  });

  describe('loadAnnotationsForImage & saveAnnotationsForImage', () => {
    it('should save annotations to txt and load them back', async () => {
      const sampleAnnotations: YoloAnnotation[] = [
        { classId: 0, xCenter: 0.25, yCenter: 0.35, width: 0.1, height: 0.2 },
      ];

      await saveAnnotationsForImage(tempDir, 'cat.jpg', sampleAnnotations);

      // Verify the txt file was actually written to disk
      const txtContent = await fs.readFile(path.join(tempDir, 'cat.txt'), 'utf-8');
      expect(txtContent).toContain('0 0.250000 0.350000 0.100000 0.200000');

      // Load back using our service
      const loaded = await loadAnnotationsForImage(tempDir, 'cat.jpg');
      expect(loaded).toEqual(sampleAnnotations);
    });

    it('should return empty array if no annotation file exists for the image', async () => {
      const loaded = await loadAnnotationsForImage(tempDir, 'non_existent.jpg');
      expect(loaded).toEqual([]);
    });
  });

  describe('loadClassLabels & saveClassLabels', () => {
    it('should return empty array when classes.txt does not exist', async () => {
      const classes = await loadClassLabels(tempDir);
      expect(classes).toEqual([]);
    });

    it('should save and load classes with assigned color palette', async () => {
      const classNames = ['cat', 'dog', 'bird'];
      await saveClassLabels(tempDir, classNames);

      const loaded = await loadClassLabels(tempDir);

      expect(loaded).toHaveLength(3);
      expect(loaded[0]).toEqual({
        id: 0,
        name: 'cat',
        color: expect.any(String),
      });
      expect(loaded[1]).toEqual({
        id: 1,
        name: 'dog',
        color: expect.any(String),
      });
      expect(loaded[2]).toEqual({
        id: 2,
        name: 'bird',
        color: expect.any(String),
      });

      // Colors should be distinct
      expect(loaded[0].color).not.toBe(loaded[1].color);
    });
  });
});
