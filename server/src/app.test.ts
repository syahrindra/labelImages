import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { createApp } from './app.js';

describe('Express REST API Endpoints', () => {
  let tempDir: string;
  const app = createApp();

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'api-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('Validation & Security', () => {
    it('should return 400 when dir query parameter is missing', async () => {
      const res = await request(app).get('/api/images');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('dir');
    });

    it('should prevent path traversal attacks in filename parameter', async () => {
      const res = await request(app).get(
        `/api/images/..%2F..%2Fsecret.txt/file?dir=${encodeURIComponent(tempDir)}`
      );
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid filename');
    });
  });

  describe('GET /api/images', () => {
    it('should return images in the dataset', async () => {
      await fs.writeFile(path.join(tempDir, 'photo.jpg'), '');

      const res = await request(app).get(
        `/api/images?dir=${encodeURIComponent(tempDir)}`
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].filename).toBe('photo.jpg');
      expect(res.body[0].isLabeled).toBe(false);
    });
  });

  describe('GET & PUT /api/images/:filename/annotations', () => {
    it('should save and retrieve annotations for an image', async () => {
      await fs.writeFile(path.join(tempDir, 'photo.jpg'), '');

      const annotations = [
        { classId: 0, xCenter: 0.5, yCenter: 0.5, width: 0.3, height: 0.4 },
      ];

      // Save annotations
      const putRes = await request(app)
        .put(`/api/images/photo.jpg/annotations?dir=${encodeURIComponent(tempDir)}`)
        .send({ annotations });

      expect(putRes.status).toBe(200);
      expect(putRes.body.success).toBe(true);

      // Fetch annotations back
      const getRes = await request(app).get(
        `/api/images/photo.jpg/annotations?dir=${encodeURIComponent(tempDir)}`
      );

      expect(getRes.status).toBe(200);
      expect(getRes.body).toEqual(annotations);
    });
  });

  describe('GET & PUT /api/classes', () => {
    it('should save and retrieve class labels', async () => {
      const classes = ['cat', 'dog'];

      // Save classes
      const putRes = await request(app)
        .put(`/api/classes?dir=${encodeURIComponent(tempDir)}`)
        .send({ classes });

      expect(putRes.status).toBe(200);
      expect(putRes.body.success).toBe(true);

      // Fetch classes
      const getRes = await request(app).get(
        `/api/classes?dir=${encodeURIComponent(tempDir)}`
      );

      expect(getRes.status).toBe(200);
      expect(getRes.body).toHaveLength(2);
      expect(getRes.body[0].name).toBe('cat');
      expect(getRes.body[1].name).toBe('dog');
    });
  });
});
