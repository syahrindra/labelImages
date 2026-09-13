import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ImageFileMeta, YoloAnnotation, ClassLabel } from '../types/annotation.js';
import { parseYoloTxt, serializeYoloTxt } from './yoloParser.js';


// A fixed 10-color palette for bounding boxes and class chips.
const CLASS_COLOR_PALETTE: string[] = [
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
 * Valid image file extensions (checked case-insensitively).
 */
const SUPPORTED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);

/**
 * Natural sorter: sorts filenames like human expects (e.g. image_2 before image_10).
 */
const naturalSorter = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

/**
 * Converts an image filename to its corresponding YOLO annotation text filename.
 * Example: "cat_001.jpg" -> "cat_001.txt"
 */
export function getAnnotationFilename(imageFilename: string): string {
  const parsed = path.parse(imageFilename);
  return `${parsed.name}.txt`;
}

/**
 * Scans a dataset directory and returns metadata for all supported images,
 * including whether each image is labeled and how many boxes it has.
 */
export async function scanDatasetImages(datasetDir: string): Promise<ImageFileMeta[]> {
  const dirEntries = await fs.readdir(datasetDir, { withFileTypes: true });

  const imageFiles: string[] = [];

  for (const entry of dirEntries) {
    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED_IMAGE_EXTENSIONS.has(ext)) {
        imageFiles.push(entry.name);
      }
    }
  }

  // Sort files naturally (img1, img2, img10 instead of img1, img10, img2)
  imageFiles.sort((a, b) => naturalSorter.compare(a, b));

  const imageMetas: ImageFileMeta[] = [];

  for (const filename of imageFiles) {
    const annotationFilename = getAnnotationFilename(filename);
    const annotationPath = path.join(datasetDir, annotationFilename);

    let boxCount = 0;

    try {
      const fileContent = await fs.readFile(annotationPath, 'utf-8');
      const annotations = parseYoloTxt(fileContent);
      boxCount = annotations.length;
    } catch {
      // If the annotation file does not exist or cannot be read, boxCount remains 0
      boxCount = 0;
    }

    imageMetas.push({
      id: filename,
      filename: filename,
      relativePath: filename,
      isLabeled: boxCount > 0,
      boxCount: boxCount,
    });
  }

  return imageMetas;
}

/**
 * Loads the YOLO annotations for a specific image in the dataset directory.
 * Returns an empty array if no annotation file exists.
 */
export async function loadAnnotationsForImage(
  datasetDir: string,
  imageFilename: string
): Promise<YoloAnnotation[]> {
  const annotationFilename = getAnnotationFilename(imageFilename);
  const annotationPath = path.join(datasetDir, annotationFilename);

  try {
    const content = await fs.readFile(annotationPath, 'utf-8');
    return parseYoloTxt(content);
  } catch {
    // Return empty list if file doesn't exist
    return [];
  }
}

/**
 * Saves annotations for a specific image as a YOLO .txt file.
 */
export async function saveAnnotationsForImage(
  datasetDir: string,
  imageFilename: string,
  annotations: YoloAnnotation[]
): Promise<void> {
  const annotationFilename = getAnnotationFilename(imageFilename);
  const annotationPath = path.join(datasetDir, annotationFilename);

  const serializedContent = serializeYoloTxt(annotations);

  // If there are no annotations and the file doesn't exist, we don't need to write anything.
  // But if the user deleted all boxes from a previously labeled image, we write an empty file.
  await fs.writeFile(annotationPath, serializedContent, 'utf-8');
}

/**
 * Loads class labels from classes.txt in the dataset directory.
 * Each line corresponds to an integer ID (line 0 = class 0, line 1 = class 1).
 */
export async function loadClassLabels(datasetDir: string): Promise<ClassLabel[]> {
  const classesPath = path.join(datasetDir, 'classes.txt');

  try {
    const content = await fs.readFile(classesPath, 'utf-8');
    const lines = content.split(/\r?\n/);

    const labels: ClassLabel[] = [];

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index].trim();
      if (line.length > 0) {
        const color = CLASS_COLOR_PALETTE[labels.length % CLASS_COLOR_PALETTE.length];
        labels.push({
          id: labels.length,
          name: line,
          color: color,
        });
      }
    }

    return labels;
  } catch {
    // If classes.txt does not exist yet, return empty list
    return [];
  }
}

/**
 * Saves an array of class names to classes.txt in the dataset directory.
 */
export async function saveClassLabels(
  datasetDir: string,
  classNames: string[]
): Promise<void> {
  const classesPath = path.join(datasetDir, 'classes.txt');
  const content = classNames.join('\n');
  await fs.writeFile(classesPath, content, 'utf-8');
}
