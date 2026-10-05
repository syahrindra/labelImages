export interface DirectoryItem {
  name: string;
  path: string;
}

export interface DirectoryBrowseResult {
  currentPath: string;
  parentPath: string | null;
  directories: DirectoryItem[];
  drives: string[];
}
