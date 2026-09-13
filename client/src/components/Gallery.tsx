import { useState } from 'react';
import { ImageFileMeta } from '../types/annotation.js';
import { getImageFileUrl } from '../services/api.js';
import './Gallery.css';

interface GalleryProps {
  datasetDir: string;
  images: ImageFileMeta[];
  onSelectImage: (index: number) => void;
  onChangeFolder: () => void;
}

type FilterMode = 'all' | 'unlabeled' | 'labeled';

export function Gallery({
  datasetDir,
  images,
  onSelectImage,
  onChangeFolder,
}: GalleryProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const totalCount = images.length;
  const labeledCount = images.filter((img) => img.isLabeled).length;
  const percentComplete = totalCount > 0 ? Math.round((labeledCount / totalCount) * 100) : 0;

  // Find first unlabeled image to start labeling quickly
  const firstUnlabeledIndex = images.findIndex((img) => !img.isLabeled);
  const startTargetIndex = firstUnlabeledIndex >= 0 ? firstUnlabeledIndex : 0;

  // Filter images based on selected mode
  const filteredImages = images
    .map((img, originalIndex) => ({ img, originalIndex }))
    .filter(({ img }) => {
      if (filterMode === 'labeled') return img.isLabeled;
      if (filterMode === 'unlabeled') return !img.isLabeled;
      return true;
    });

  return (
    <div className="gallery-container">
      {/* Top Toolbar & Stats */}
      <div className="gallery-toolbar">
        <div className="gallery-stats">
          <div className="gallery-counts">
            <span>
              {labeledCount} / {totalCount} labeled ({percentComplete}%)
            </span>
          </div>

          <div className="gallery-progress-track">
            <div
              className="gallery-progress-bar"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

        <div className="gallery-actions">
          <button className="gallery-btn-secondary" onClick={onChangeFolder}>
            Change Folder
          </button>

          <select
            className="gallery-filter-select"
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as FilterMode)}
          >
            <option value="all">Filter: All ({totalCount})</option>
            <option value="unlabeled">Unlabeled only ({totalCount - labeledCount})</option>
            <option value="labeled">Labeled only ({labeledCount})</option>
          </select>

          {totalCount > 0 && (
            <button
              className="gallery-btn-primary"
              onClick={() => onSelectImage(startTargetIndex)}
            >
              {labeledCount === totalCount ? 'Review Dataset' : 'Start Labeling →'}
            </button>
          )}
        </div>
      </div>

      {/* Thumbnails Grid */}
      <div className="gallery-grid-wrapper">
        {filteredImages.length === 0 ? (
          <div className="gallery-empty">
            {totalCount === 0
              ? 'No images found in this folder. Make sure it contains .jpg or .png files.'
              : 'No images match the current filter.'}
          </div>
        ) : (
          <div className="gallery-grid">
            {filteredImages.map(({ img, originalIndex }) => {
              const thumbUrl = getImageFileUrl(datasetDir, img.filename);

              return (
                <div
                  key={img.id}
                  className="gallery-card"
                  onClick={() => onSelectImage(originalIndex)}
                  title={`Open ${img.filename}`}
                >
                  <div className="gallery-thumbnail-wrap">
                    <img
                      src={thumbUrl}
                      alt={img.filename}
                      className="gallery-thumbnail"
                      loading="lazy"
                    />

                    <span
                      className={`gallery-badge ${img.isLabeled ? 'labeled' : 'unlabeled'}`}
                    >
                      {img.isLabeled ? `✓ ${img.boxCount}` : 'Unlabeled'}
                    </span>
                  </div>

                  <div className="gallery-card-info">
                    {img.filename}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
