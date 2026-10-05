import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { DirectoryBrowseResult, DirectoryItem } from '../types/directory.js';

const naturalSorter = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

// Common directories to hide for safety and cleanliness
const IGNORED_DIRECTORY_NAMES = new Set([
  'node_modules',
  'System Volume Information',
  '$Recycle.Bin',
  'Recovery',
]);

/**
 * Lists available filesystem drive roots.
 * On Windows, checks mounted letters (C:, D:, etc.).
 * On Unix/macOS, returns root ('/').
 */
export async function getAvailableDrives(): Promise<string[]> {
  if (process.platform !== 'win32') {
    return ['/'];
  }

  const drives: string[] = [];

  // Check drive letters from C: to Z:, plus A: and B:
  for (let i = 65; i <= 90; i++) {
    const letter = String.fromCharCode(i);
    const driveRoot = `${letter}:\\`;
    try {
      await fs.access(driveRoot);
      drives.push(`${letter}:`);
    } catch {
      // Drive is not available or not mounted
    }
  }

  // Fallback to C: if none detected
  if (drives.length === 0) {
    drives.push('C:');
  }

  return drives;
}

/**
 * Explores a directory, returning its subfolders and navigation metadata.
 */
export async function browseDirectory(
  targetPath?: string
): Promise<DirectoryBrowseResult> {
  let resolvedPath: string;

  if (targetPath && targetPath.trim().length > 0) {
    let cleanPath = targetPath.trim();
    // On Windows, if user passes "C:", ensure trailing slash for drive root
    if (/^[a-zA-Z]:$/.test(cleanPath)) {
      cleanPath = `${cleanPath}\\`;
    }
    resolvedPath = path.resolve(cleanPath);
  } else {
    // Default to current working directory, or user's home directory
    resolvedPath = path.resolve(process.cwd() || os.homedir());
  }

  // Ensure path exists and is a directory
  const stat = await fs.stat(resolvedPath);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${resolvedPath}`);
  }

  // Determine parent path (null if currently at drive or root)
  const parent = path.dirname(resolvedPath);
  const parentPath = parent === resolvedPath ? null : parent;

  // Read subfolders
  const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
  const directories: DirectoryItem[] = [];

  for (const entry of entries) {
    // Skip hidden files/folders (starting with '.') and ignored system directories
    if (entry.name.startsWith('.') || IGNORED_DIRECTORY_NAMES.has(entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      directories.push({
        name: entry.name,
        path: path.join(resolvedPath, entry.name),
      });
    }
  }

  // Natural sort subfolders
  directories.sort((a, b) => naturalSorter.compare(a.name, b.name));

  const drives = await getAvailableDrives();

  return {
    currentPath: resolvedPath,
    parentPath: parentPath,
    directories: directories,
    drives: drives,
  };
}
