import { useState } from 'react';
import { useAnnotationStore } from '../store/annotationStore.js';
import './Sidebar.css';

export function SidebarLeft() {
  const images = useAnnotationStore((state) => state.images);
  const currentImageIndex = useAnnotationStore((state) => state.currentImageIndex);
  const selectImageIndex = useAnnotationStore((state) => state.selectImageIndex);

  const [filterText, setFilterText] = useState('');

  const filteredImages = images.map((img, index) => ({ img, originalIndex: index }))
    .filter(({ img }) =>
      img.filename.toLowerCase().includes(filterText.trim().toLowerCase())
    );

  const labeledCount = images.filter((img) => img.isLabeled).length;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>Files ({labeledCount}/{images.length})</span>
      </div>

      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--color-border)' }}>
        <input
          type="text"
          placeholder="Filter files..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            color: 'var(--color-text)',
            padding: '4px 8px',
            fontSize: '12px',
            outline: 'none',
          }}
        />
      </div>

      <ul className="sidebar-list">
        {filteredImages.length === 0 ? (
          <div className="sidebar-empty">
            {images.length === 0 ? 'No images in folder' : 'No matches'}
          </div>
        ) : (
          filteredImages.map(({ img, originalIndex }) => {
            const isActive = originalIndex === currentImageIndex;
            return (
              <li
                key={img.id}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => selectImageIndex(originalIndex)}
              >
                <div className="sidebar-item-left">
                  <span className="sidebar-item-index">
                    {String(originalIndex + 1).padStart(3, '0')}
                  </span>
                  <span className="sidebar-item-label" title={img.filename}>
                    {img.filename}
                  </span>
                </div>

                {img.isLabeled && (
                  <span className="sidebar-badge" title={`${img.boxCount} boxes`}>
                    ✓ {img.boxCount}
                  </span>
                )}
              </li>
            );
          })
        )}
      </ul>
    </aside>
  );
}
