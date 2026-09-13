import { useAnnotationStore } from '../store/annotationStore.js';
import './Header.css';

interface HeaderProps {
  onOpenFolder?: () => void;
}

export function Header({ onOpenFolder }: HeaderProps) {
  const images = useAnnotationStore((state) => state.images);
  const currentImageIndex = useAnnotationStore((state) => state.currentImageIndex);
  const saveStatus = useAnnotationStore((state) => state.saveStatus);
  const nextImage = useAnnotationStore((state) => state.nextImage);
  const prevImage = useAnnotationStore((state) => state.prevImage);
  const undo = useAnnotationStore((state) => state.undo);
  const redo = useAnnotationStore((state) => state.redo);
  const past = useAnnotationStore((state) => state.past);
  const future = useAnnotationStore((state) => state.future);

  const currentImage = images[currentImageIndex] || null;
  const canGoPrev = currentImageIndex > 0;
  const canGoNext = currentImageIndex < images.length - 1;
  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const renderStatus = () => {
    switch (saveStatus) {
      case 'saved':
        return <span className="header-status-badge saved">✓ Saved</span>;
      case 'saving':
        return <span className="header-status-badge saving">⟳ Saving...</span>;
      case 'unsaved':
        return <span className="header-status-badge unsaved">● Unsaved</span>;
      case 'error':
        return <span className="header-status-badge error">⚠ Save Error</span>;
    }
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <span className="header-title">labelImages</span>
        {onOpenFolder && (
          <button className="header-action-btn" onClick={onOpenFolder}>
            Open Folder
          </button>
        )}
      </div>

      <div className="header-center">
        <button
          className="header-nav-btn"
          onClick={prevImage}
          disabled={!canGoPrev}
          title="Previous Image (A)"
        >
          ◄
        </button>

        {currentImage ? (
          <div className="header-file-info">
            <span className="header-filename">{currentImage.filename}</span>
            <span className="header-file-counter">
              · {currentImageIndex + 1}/{images.length}
            </span>
          </div>
        ) : (
          <span className="header-file-counter">No images loaded</span>
        )}

        <button
          className="header-nav-btn"
          onClick={nextImage}
          disabled={!canGoNext}
          title="Next Image (D)"
        >
          ►
        </button>
      </div>

      <div className="header-right">
        {renderStatus()}

        <button
          className="header-action-btn"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          ↶ Undo
        </button>
        <button
          className="header-action-btn"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          ↷ Redo
        </button>
      </div>
    </header>
  );
}
