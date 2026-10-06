import { useState, useEffect, useCallback, useRef } from 'react';
import { useAnnotationStore } from './store/annotationStore.js';
import { Header } from './components/Header.js';
import { SidebarLeft } from './components/SidebarLeft.js';
import { SidebarRight } from './components/SidebarRight.js';
import { Canvas } from './components/Canvas.js';
import { Gallery } from './components/Gallery.js';
import { Footer } from './components/Footer.js';
import { ClassPicker } from './components/ClassPicker.js';
import { FolderBrowserModal } from './components/FolderBrowserModal.js';
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
  const selectedBoxId = useAnnotationStore((state) => state.selectedBoxId);
  const isDrawingMode = useAnnotationStore((state) => state.isDrawingMode);
  const saveStatus = useAnnotationStore((state) => state.saveStatus);

  const setDatasetDir = useAnnotationStore((state) => state.setDatasetDir);
  const setImages = useAnnotationStore((state) => state.setImages);
  const selectImageIndex = useAnnotationStore((state) => state.selectImageIndex);
  const setClasses = useAnnotationStore((state) => state.setClasses);
  const setActiveClassId = useAnnotationStore((state) => state.setActiveClassId);
  const addClass = useAnnotationStore((state) => state.addClass);
  const setBoxes = useAnnotationStore((state) => state.setBoxes);
  const updateBox = useAnnotationStore((state) => state.updateBox);
  const setSaveStatus = useAnnotationStore((state) => state.setSaveStatus);
  const nextImage = useAnnotationStore((state) => state.nextImage);
  const prevImage = useAnnotationStore((state) => state.prevImage);

  // App View Mode: 'gallery' or 'labeling'
  const [viewMode, setViewMode] = useState<'gallery' | 'labeling'>('gallery');

  // Folder Open Modal state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);

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
      setViewMode('gallery'); // Open in gallery overview
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load dataset folder';
      console.error('Error loading dataset:', msg);
      alert(`Error loading folder: ${msg}`);
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

  // Keyboard navigation and shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        isClassPickerOpen ||
        isFolderModalOpen
      ) {
        return;
      }

      if (viewMode === 'labeling') {
        // d: next image with autosave
        if (e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          performSave();
          nextImage();
        }
        // a: prev image with autosave
        else if (e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          performSave();
          prevImage();
        }
        // Escape when idle returns to Gallery
        else if (e.key === 'Escape' && !selectedBoxId && !isDrawingMode) {
          performSave();
          setViewMode('gallery');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    viewMode,
    nextImage,
    prevImage,
    performSave,
    selectedBoxId,
    isDrawingMode,
    isClassPickerOpen,
    isFolderModalOpen,
  ]);

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
    const trimmed = name.trim();

    if (!trimmed) {
      return;
    }

    const isDuplicate = classes.some((classLabel) => {
      return classLabel.name.toLowerCase() === trimmed.toLowerCase();
    });

    if (isDuplicate) {
      return;
    }

    const newColor = getNextClassColor(classes.length);
    const wasAdded = addClass(trimmed, newColor);

    if (!wasAdded) {
      return;
    }

    const newClassId = classes.length;
    if (targetBoxId) {
      const box = boxes.find((b) => b.id === targetBoxId);
      if (box) {
        updateBox({ ...box, classId: newClassId });
      }
    }
    setActiveClassId(newClassId);

    if (datasetDir) {
      const updatedNames = [...classes.map((c) => c.name), trimmed];
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
      <Header
        viewMode={viewMode}
        onToggleView={() => {
          if (viewMode === 'labeling') performSave();
          setViewMode((prev) => (prev === 'gallery' ? 'labeling' : 'gallery'));
        }}
        onOpenFolder={() => setIsFolderModalOpen(true)}
      />

      {/* 2. Main Workspace (Contextual between Gallery and Labeling) */}
      {viewMode === 'gallery' && datasetDir ? (
        <Gallery
          datasetDir={datasetDir}
          images={images}
          onSelectImage={(index) => {
            selectImageIndex(index);
            setViewMode('labeling');
          }}
          onChangeFolder={() => setIsFolderModalOpen(true)}
        />
      ) : (
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
      )}

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

      {/* 5. In-App Visual Folder Browser Modal */}
      <FolderBrowserModal
        isOpen={isFolderModalOpen || !datasetDir}
        initialPath={datasetDir}
        onSelectFolder={handleOpenDataset}
        onClose={() => setIsFolderModalOpen(false)}
        canCancel={!!datasetDir}
      />
    </div>
  );
}
