import { useState, useEffect, type FormEvent } from 'react';
import { browseDirectory } from '../services/api.js';
import { DirectoryItem } from '../types/directory.js';
import './FolderBrowserModal.css';

interface FolderBrowserModalProps {
  isOpen: boolean;
  initialPath?: string | null;
  onSelectFolder: (folderPath: string) => void;
  onClose: () => void;
  canCancel: boolean;
}

export function FolderBrowserModal({
  isOpen,
  initialPath,
  onSelectFolder,
  onClose,
  canCancel,
}: FolderBrowserModalProps) {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [drives, setDrives] = useState<string[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [pathInput, setPathInput] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadDirectory = async (target?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await browseDirectory(target);
      setCurrentPath(result.currentPath);
      setParentPath(result.parentPath);
      setDirectories(result.directories);
      setDrives(result.drives);
      setSelectedPath(result.currentPath);
      setPathInput(result.currentPath);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to browse folder';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial directory when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDirectory(initialPath || undefined);
    }
  }, [isOpen, initialPath]);

  if (!isOpen) return null;

  const handlePathSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (pathInput.trim()) {
      loadDirectory(pathInput.trim());
    }
  };

  const handleDriveChange = (drive: string) => {
    loadDirectory(drive);
  };

  const handleFolderClick = (item: DirectoryItem) => {
    setSelectedPath(item.path);
  };

  const handleFolderDoubleClick = (item: DirectoryItem) => {
    loadDirectory(item.path);
  };

  const handleConfirm = () => {
    if (selectedPath) {
      onSelectFolder(selectedPath);
    }
  };

  return (
    <div
      className="folder-browser-overlay"
      onClick={() => {
        if (canCancel) onClose();
      }}
    >
      <div className="folder-browser-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="folder-browser-header">
          <span className="folder-browser-title">Select Dataset Folder</span>
          {canCancel && (
            <button className="folder-browser-close-btn" onClick={onClose}>
              ✕
            </button>
          )}
        </div>

        {/* Navigation Bar */}
        <div className="folder-browser-nav-bar">
          {/* Drive selector (for Windows) */}
          {drives.length > 1 && (
            <select
              className="folder-browser-drive-select"
              value={drives.find((d) => currentPath.toUpperCase().startsWith(d.toUpperCase())) || drives[0]}
              onChange={(e) => handleDriveChange(e.target.value)}
            >
              {drives.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}

          {/* Up to Parent button */}
          <button
            className="folder-browser-btn"
            disabled={!parentPath || isLoading}
            onClick={() => parentPath && loadDirectory(parentPath)}
            title="Go to parent directory"
          >
            ⬆ Up
          </button>

          {/* Editable Path Input */}
          <form onSubmit={handlePathSubmit} style={{ flex: 1, display: 'flex' }}>
            <input
              type="text"
              className="folder-browser-path-input"
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              placeholder="Enter folder path..."
            />
          </form>
        </div>

        {/* Directory List View */}
        <div className="folder-browser-list">
          {isLoading ? (
            <div className="folder-browser-empty">Loading folder...</div>
          ) : error ? (
            <div className="folder-browser-empty" style={{ color: 'var(--color-danger)' }}>
              {error}
            </div>
          ) : directories.length === 0 ? (
            <div className="folder-browser-empty">
              No subfolders found in this directory.
            </div>
          ) : (
            directories.map((item) => {
              const isSelected = item.path === selectedPath;
              return (
                <div
                  key={item.path}
                  className={`folder-browser-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleFolderClick(item)}
                  onDoubleClick={() => handleFolderDoubleClick(item)}
                  title="Double-click to open, single click to select"
                >
                  <div className="folder-browser-item-left">
                    <span className="folder-icon">📁</span>
                    <span className="folder-name">{item.name}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="folder-browser-footer">
          <div className="folder-browser-current-selected" title={selectedPath}>
            Target: <strong>{selectedPath || currentPath}</strong>
          </div>

          <div className="folder-browser-actions">
            {canCancel && (
              <button
                type="button"
                className="folder-browser-btn"
                onClick={onClose}
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              className="folder-browser-btn"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#ffffff',
                fontWeight: 600,
                border: 'none',
              }}
              onClick={handleConfirm}
              disabled={isLoading || (!selectedPath && !currentPath)}
            >
              Select This Folder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
