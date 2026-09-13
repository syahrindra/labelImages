import { useState, useEffect, useCallback, useRef } from 'react';
import { useAnnotationStore } from './store/annotationStore.js';
import { Header } from './components/Header.js';
import { SidebarLeft } from './components/SidebarLeft.js';
import { SidebarRight } from './components/SidebarRight.js';
import { Canvas } from './components/Canvas.js';
import { Footer } from './components/Footer.js';
import { ClassPicker } from './components/ClassPicker.js';
import {
  fetchImages,
  fetchClasses,
  saveClasses,
  fetchAnnotations,
  saveAnnotations,
  getImageFileUrl,
} from './services/api.js';
import { yoloToPixelBox, pixelBoxToYolo } from './utils/coordinates.js';
import { getNextClassColor } from './utils/colors.js';
import { Dimensions, PixelBox } from './types/annotation.js';

export function App() {
  const datasetDir = useAnnotationStore((state) => state.datasetDir);
  const images = useAnnotationStore((state) => state.images);
  const currentImageIndex = useAnnotationStore((state) => state.currentImageIndex);
  const classes = useAnnotationStore((state) => state.classes);
  const activeClassId = useAnnotationStore((state) => state.activeClassId);
  const boxes = useAnnotationStore((state) => state.boxes);
  const saveStatus = useAnnotationStore((state) => state.saveStatus);

  const setDatasetDir = useAnnotationStore((state) => state.setDatasetDir);
  const setImages = useAnnotationStore((state) => state.setImages);
  const setClasses = useAnnotationStore((state) => state.setClasses);
  const setActiveClassId = useAnnotationStore((state) => state.setActiveClassId);
  const addClass = useAnnotationStore((state) => state.addClass);
  const setBoxes = useAnnotationStore((state) => state.setBoxes);
  const updateBox = useAnnotationStore((state) => state.updateBox);
  const setSaveStatus = useAnnotationStore((state) => state.setSaveStatus);
  const nextImage = useAnnotationStore((state) => state.nextImage);
  const prevImage = useAnnotationStore((state) => state.prevImage);

  // Folder Open Modal state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderPathInput, setFolderPathInput] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  // Active image natural dimensions
  const [naturalDimensions, setNaturalDimensions] = useState<Dimensions | null>(null);

  // Class picker popover state
  const [isClassPickerOpen, setIsClassPickerOpen] = useState(false);
  const [targetBoxId, setTargetBoxId] = useState<string | null>(null);

  // Keep track of active image filename and dimensions for autosaving before navigation
  const activeImageRef = useRef<{ filename: string; dims: Dimensions | null }>({
    filename: '',
    dims: null,
  });

  const currentImage = images[currentImageIndex] || null;

  // Open & load a dataset directory from backend
  const handleOpenDataset = async (dirToLoad: string) => {
    try {
      setLoadError(null);
      const [fetchedImages, fetchedClasses] = await Promise.all([
        fetchImages(dirToLoad),
        fetchClasses(dirToLoad),
      ]);

      setDatasetDir(dirToLoad);
      setImages(fetchedImages);
      setClasses(fetchedClasses);

      if (fetchedClasses.length > 0) {
        setActiveClassId(fetchedClasses[0].id);
      }

      setIsFolderModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load dataset folder';
      setLoadError(msg);
    }
  };

  // Autosave current annotations to backend
  const performSave = useCallback(async () => {
    if (!datasetDir || !activeImageRef.current.filename || !activeImageRef.current.dims) {
      return;
    }

    const { filename, dims } = activeImageRef.current;
    setSaveStatus('saving');

    try {
      // Convert canvas pixel boxes back to normalized YOLO floats
      const yoloBoxes = boxes.map((box) =>
        pixelBoxToYolo(box, dims.width, dims.height)
      );

      await saveAnnotations(datasetDir, filename, yoloBoxes);

      // Update labeled state in image list
      const updatedImages = images.map((img) =>
        img.filename === filename
          ? { ...img, isLabeled: yoloBoxes.length > 0, boxCount: yoloBoxes.length }
          : img
      );
      setImages(updatedImages);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Autosave failed:', err);
      setSaveStatus('error');
    }
  }, [datasetDir, boxes, images, setImages, setSaveStatus]);

  // Handle switching images
  useEffect(() => {
    if (!datasetDir || !currentImage) return;

    // 1. If previous image had unsaved changes, autosave before loading next
    if (saveStatus === 'unsaved' && activeImageRef.current.filename) {
      performSave();
    }

    // 2. Load annotations for the newly selected image
    activeImageRef.current.filename = currentImage.filename;

    let isSubscribed = true;
    fetchAnnotations(datasetDir, currentImage.filename)
      .then((yoloAnnotations) => {
        if (!isSubscribed) return;

        // If dimensions are known, convert right away; otherwise wait for image load
        if (naturalDimensions) {
          const pixelBoxes = yoloAnnotations.map((yolo, index) =>
            yoloToPixelBox(
              yolo,
              naturalDimensions.width,
              naturalDimensions.height,
              `box-${index}-${Date.now()}`
            )
          );
          setBoxes(pixelBoxes);
        }
      })
      .catch((err) => {
        console.error('Failed to load annotations:', err);
        if (isSubscribed) setBoxes([]);
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentImageIndex, datasetDir, currentImage?.filename]);

  // When image natural dimensions load on Canvas
  const handleImageLoaded = (dims: Dimensions) => {
    setNaturalDimensions(dims);
    activeImageRef.current.dims = dims;

    // If annotations were fetched before image loaded, recalculate pixel boxes
    if (datasetDir && currentImage) {
      fetchAnnotations(datasetDir, currentImage.filename).then((yoloAnnotations) => {
        const pixelBoxes = yoloAnnotations.map((yolo, index) =>
          yoloToPixelBox(
            yolo,
            dims.width,
            dims.height,
            `box-${index}-${Date.now()}`
          )
        );
        setBoxes(pixelBoxes);
      });
    }
  };

  // Keyboard navigation: 'd' for next, 'a' for previous
  useEffect(() => {
    const handleNavKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        isClassPickerOpen ||
        isFolderModalOpen
      ) {
        return;
      }

      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        performSave();
        nextImage();
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        performSave();
        prevImage();
      }
    };

    window.addEventListener('keydown', handleNavKey);
    return () => window.removeEventListener('keydown', handleNavKey);
  }, [nextImage, prevImage, performSave, isClassPickerOpen, isFolderModalOpen]);

  // When a box finishes drawing: open the ClassPicker
  const handleBoxDrawn = (box: PixelBox) => {
    setTargetBoxId(box.id);
    setIsClassPickerOpen(true);
  };

  // When user selects an existing class in ClassPicker
  const handleSelectClass = (classId: number) => {
    if (targetBoxId) {
      const box = boxes.find((b) => b.id === targetBoxId);
      if (box) {
        updateBox({ ...box, classId: classId });
      }
    }
    setActiveClassId(classId);
    setIsClassPickerOpen(false);
    setTargetBoxId(null);
  };

  // When user creates a new class in ClassPicker
  const handleCreateClass = async (name: string) => {
    if (!name.trim()) return;

    const newColor = getNextClassColor(classes.length);
    addClass(name.trim(), newColor);

    const newClassId = classes.length;
    if (targetBoxId) {
      const box = boxes.find((b) => b.id === targetBoxId);
      if (box) {
        updateBox({ ...box, classId: newClassId });
      }
    }
    setActiveClassId(newClassId);

    // Persist classes to backend classes.txt
    if (datasetDir) {
      const updatedNames = [...classes.map((c) => c.name), name.trim()];
      saveClasses(datasetDir, updatedNames).catch((err) =>
        console.error('Failed to save classes.txt:', err)
      );
    }

    setIsClassPickerOpen(false);
    setTargetBoxId(null);
  };

  const currentImageUrl =
    datasetDir && currentImage
      ? getImageFileUrl(datasetDir, currentImage.filename)
      : null;

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Header Bar */}
      <Header onOpenFolder={() => setIsFolderModalOpen(true)} />

      {/* 2. Main Three-Pane Workspace */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Pane: Files */}
        <SidebarLeft />

        {/* Center Pane: Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Canvas
            imageUrl={currentImageUrl}
            onBoxDrawn={handleBoxDrawn}
            onImageLoaded={handleImageLoaded}
          />
        </div>

        {/* Right Pane: Classes & Boxes */}
        <SidebarRight />
      </div>

      {/* 3. Footer Bar */}
      <Footer />

      {/* 4. Class Picker Popover */}
      <ClassPicker
        isOpen={isClassPickerOpen}
        classes={classes}
        activeClassId={activeClassId}
        onSelectClass={handleSelectClass}
        onCreateClass={handleCreateClass}
        onClose={() => {
          setIsClassPickerOpen(false);
          setTargetBoxId(null);
        }}
      />

      {/* 5. Open Dataset Folder Modal */}
      {(isFolderModalOpen || !datasetDir) && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1500,
          }}
          onClick={() => {
            if (datasetDir) setIsFolderModalOpen(false);
          }}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '24px',
              width: '420px',
              boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Open Dataset Folder</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Enter the absolute path to your folder of images and YOLO labels.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (folderPathInput.trim()) {
                  handleOpenDataset(folderPathInput.trim());
                }
              }}
            >
              <input
                autoFocus
                type="text"
                placeholder="e.g. D:/Projects/dataset or C:/Users/.../dataset"
                value={folderPathInput}
                onChange={(e) => setFolderPathInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  color: 'var(--color-text)',
                  fontSize: '13px',
                  marginBottom: '12px',
                  outline: 'none',
                }}
              />

              {loadError && (
                <div
                  style={{
                    color: 'var(--color-danger)',
                    fontSize: '12px',
                    marginBottom: '12px',
                  }}
                >
                  {loadError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                {datasetDir && (
                  <button
                    type="button"
                    onClick={() => setIsFolderModalOpen(false)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text)',
                      borderRadius: '4px',
                      padding: '8px 14px',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  style={{
                    background: 'var(--color-accent)',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '4px',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                >
                  Open Dataset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
