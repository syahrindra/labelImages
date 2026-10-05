/**
 * Information about a folder item returned by the directory browser.
 */
export interface DirectoryItem {
  name: string;
  path: string;
}

/**
 * Payload returned by GET /api/browse
 */
export interface DirectoryBrowseResult {
  currentPath: string;
  parentPath: string | null;
  directories: DirectoryItem[];
  drives: string[];
}
