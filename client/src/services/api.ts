import {
  ImageFileMeta,
  ClassLabel,
  YoloAnnotation,
} from '../types/annotation.js';

const API_BASE = '/api';

/**
 * Fetches the list of all images and their labeled status in a dataset folder.
 */
export async function fetchImages(dir: string): Promise<ImageFileMeta[]> {
  const res = await fetch(`${API_BASE}/images?dir=${encodeURIComponent(dir)}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch images');
  }
  return res.json();
}

/**
 * Fetches the list of class definitions for a dataset folder.
 */
export async function fetchClasses(dir: string): Promise<ClassLabel[]> {
  const res = await fetch(`${API_BASE}/classes?dir=${encodeURIComponent(dir)}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch classes');
  }
  return res.json();
}

/**
 * Saves updated class names to classes.txt.
 */
export async function saveClasses(dir: string, classNames: string[]): Promise<void> {
  const res = await fetch(`${API_BASE}/classes?dir=${encodeURIComponent(dir)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ classes: classNames }),
  });
  if (!res.ok) {
    throw new Error('Failed to save classes');
  }
}

/**
 * Fetches annotations for a specific image file in YOLO format.
 */
export async function fetchAnnotations(
  dir: string,
  filename: string
): Promise<YoloAnnotation[]> {
  const res = await fetch(
    `${API_BASE}/images/${encodeURIComponent(filename)}/annotations?dir=${encodeURIComponent(dir)}`
  );
  if (!res.ok) {
    throw new Error('Failed to fetch annotations');
  }
  return res.json();
}

/**
 * Saves annotations for a specific image file.
 */
export async function saveAnnotations(
  dir: string,
  filename: string,
  annotations: YoloAnnotation[]
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/images/${encodeURIComponent(filename)}/annotations?dir=${encodeURIComponent(dir)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ annotations }),
    }
  );
  if (!res.ok) {
    throw new Error('Failed to save annotations');
  }
}

/**
 * Constructs the URL for streaming image bytes to the browser.
 */
export function getImageFileUrl(dir: string, filename: string): string {
  return `${API_BASE}/images/${encodeURIComponent(filename)}/file?dir=${encodeURIComponent(dir)}`;
}
