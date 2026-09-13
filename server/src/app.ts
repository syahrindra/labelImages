import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import {
  scanDatasetImages,
  loadAnnotationsForImage,
  saveAnnotationsForImage,
  loadClassLabels,
  saveClassLabels,
} from './services/datasetService.js';

export function createApp(): express.Application {
  const app = express();

  // Enable CORS so the React client (Vite on port 5173) can talk to this server
  app.use(cors());

  // Parse incoming JSON request bodies (for saving annotations and classes)
  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  /**
   * Helper middleware to validate the `dir` query parameter and protect against path traversal.
   */
  function extractDir(req: Request, res: Response): string | null {
    const dir = req.query.dir;
    if (!dir || typeof dir !== 'string') {
      res.status(400).json({ error: 'Query parameter "dir" is required' });
      return null;
    }
    return path.resolve(dir);
  }

  /**
   * GET /api/images?dir=...
   * Returns a list of all images with metadata and labeling status.
   */
  app.get('/api/images', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dir = extractDir(req, res);
      if (!dir) return;

      const images = await scanDatasetImages(dir);
      res.json(images);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/images/:filename/file?dir=...
   * Streams the actual image bytes to the browser.
   */
  app.get('/api/images/:filename/file', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dir = extractDir(req, res);
      if (!dir) return;

      const filename = req.params.filename;

      // Security check: Prevent path traversal (e.g. "../../../etc/passwd")
      if (path.basename(filename) !== filename) {
        res.status(400).json({ error: 'Invalid filename' });
        return;
      }

      const filePath = path.join(dir, filename);

      // Verify file exists
      try {
        await fs.access(filePath);
      } catch {
        res.status(404).json({ error: 'Image file not found' });
        return;
      }

      // Send the file directly to the client with appropriate content-type headers
      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/images/:filename/annotations?dir=...
   * Loads annotations for a specific image file.
   */
  app.get('/api/images/:filename/annotations', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dir = extractDir(req, res);
      if (!dir) return;

      const filename = req.params.filename;
      if (path.basename(filename) !== filename) {
        res.status(400).json({ error: 'Invalid filename' });
        return;
      }

      const annotations = await loadAnnotationsForImage(dir, filename);
      res.json(annotations);
    } catch (error) {
      next(error);
    }
  });

  /**
   * PUT /api/images/:filename/annotations?dir=...
   * Saves annotations for a specific image file (autosave).
   * Request body: { annotations: YoloAnnotation[] }
   */
  app.put('/api/images/:filename/annotations', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dir = extractDir(req, res);
      if (!dir) return;

      const filename = req.params.filename;
      if (path.basename(filename) !== filename) {
        res.status(400).json({ error: 'Invalid filename' });
        return;
      }

      const { annotations } = req.body;
      if (!Array.isArray(annotations)) {
        res.status(400).json({ error: 'Request body must contain an "annotations" array' });
        return;
      }

      await saveAnnotationsForImage(dir, filename, annotations);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/classes?dir=...
   * Loads class definitions from classes.txt.
   */
  app.get('/api/classes', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dir = extractDir(req, res);
      if (!dir) return;

      const classes = await loadClassLabels(dir);
      res.json(classes);
    } catch (error) {
      next(error);
    }
  });

  /**
   * PUT /api/classes?dir=...
   * Saves updated class names to classes.txt.
   * Request body: { classes: string[] }
   */
  app.put('/api/classes', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dir = extractDir(req, res);
      if (!dir) return;

      const { classes } = req.body;
      if (!Array.isArray(classes)) {
        res.status(400).json({ error: 'Request body must contain a "classes" array' });
        return;
      }

      await saveClassLabels(dir, classes);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  return app;
}
