import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { browseDirectory, getAvailableDrives } from './directoryService.js';

describe('directoryService', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dir-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('browseDirectory', () => {
    it('should list subdirectories naturally sorted and filter out files and hidden folders', async () => {
      // Create test subfolders and files
      await fs.mkdir(path.join(tempDir, 'folder_10'));
      await fs.mkdir(path.join(tempDir, 'folder_2'));
      await fs.mkdir(path.join(tempDir, 'alpha'));
      await fs.mkdir(path.join(tempDir, '.hidden_folder')); // hidden, should be ignored
      await fs.mkdir(path.join(tempDir, 'node_modules'));   // ignored
      await fs.writeFile(path.join(tempDir, 'file.txt'), ''); // file, should be ignored

      const result = await browseDirectory(tempDir);

      expect(result.currentPath).toBe(path.resolve(tempDir));
      expect(result.directories).toHaveLength(3);

      // Natural sort verification: alpha -> folder_2 -> folder_10
      expect(result.directories[0].name).toBe('alpha');
      expect(result.directories[1].name).toBe('folder_2');
      expect(result.directories[2].name).toBe('folder_10');

      // Verify full paths
      expect(result.directories[0].path).toBe(path.join(tempDir, 'alpha'));
    });

    it('should calculate parentPath correctly for a subfolder', async () => {
      const subDir = path.join(tempDir, 'nested');
      await fs.mkdir(subDir);

      const result = await browseDirectory(subDir);

      expect(result.currentPath).toBe(path.resolve(subDir));
      expect(result.parentPath).toBe(path.resolve(tempDir));
    });

    it('should default to home directory or cwd if no path is provided', async () => {
      const result = await browseDirectory();

      expect(result.currentPath).toBeDefined();
      expect(result.directories).toBeInstanceOf(Array);
      expect(result.drives).toBeInstanceOf(Array);
    });

    it('should throw an error if the directory does not exist', async () => {
      const fakePath = path.join(tempDir, 'does-not-exist');

      await expect(browseDirectory(fakePath)).rejects.toThrow();
    });
  });

  describe('getAvailableDrives', () => {
    it('should return a non-empty array of drives', async () => {
      const drives = await getAvailableDrives();

      expect(drives.length).toBeGreaterThan(0);
      if (process.platform === 'win32') {
        // On Windows, drives should end with ':' (e.g. 'C:', 'D:')
        expect(drives.some((d) => d.endsWith(':'))).toBe(true);
      } else {
        expect(drives).toContain('/');
      }
    });
  });
});
