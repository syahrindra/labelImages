import { create } from 'zustand';
import { PixelBox, ClassLabel, ImageFileMeta } from '../types/annotation.js';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

interface AnnotationState {
  // Dataset & Files
  datasetDir: string | null;
  images: ImageFileMeta[];
  currentImageIndex: number;

  // Annotations on the currently active image
  boxes: PixelBox[];
  selectedBoxId: string | null;

  // Classes
  classes: ClassLabel[];
  activeClassId: number;

  // Interaction State
  isDrawingMode: boolean;
  saveStatus: SaveStatus;

  // Undo / Redo History Stacks
  past: PixelBox[][];
  future: PixelBox[][];

  // Actions
  setDatasetDir: (dir: string | null) => void;
  setImages: (images: ImageFileMeta[]) => void;
  selectImageIndex: (index: number) => void;
  nextImage: () => void;
  prevImage: () => void;

  setClasses: (classes: ClassLabel[]) => void;
  setActiveClassId: (id: number) => void;
  addClass: (name: string, color: string) => void;

  setBoxes: (boxes: PixelBox[]) => void;
  addBox: (box: PixelBox) => void;
  updateBox: (box: PixelBox) => void;
  deleteSelectedBox: () => void;
  selectBox: (id: string | null) => void;

  setIsDrawingMode: (isDrawing: boolean) => void;
  toggleDrawingMode: () => void;
  setSaveStatus: (status: SaveStatus) => void;

  undo: () => void;
  redo: () => void;
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  // Initial state
  datasetDir: null,
  images: [],
  currentImageIndex: 0,

  boxes: [],
  selectedBoxId: null,

  classes: [],
  activeClassId: 0,

  isDrawingMode: false,
  saveStatus: 'saved',

  past: [],
  future: [],

  // Dataset Actions
  setDatasetDir: (dir) => set({ datasetDir: dir }),

  setImages: (images) => set({ images: images }),

  selectImageIndex: (index) => {
    const { images } = get();
    if (index >= 0 && index < images.length) {
      set({
        currentImageIndex: index,
        selectedBoxId: null,
        past: [],
        future: [],
      });
    }
  },

  nextImage: () => {
    const { currentImageIndex, images } = get();
    if (images.length === 0) return;
    const nextIndex = Math.min(images.length - 1, currentImageIndex + 1);
    get().selectImageIndex(nextIndex);
  },

  prevImage: () => {
    const { currentImageIndex, images } = get();
    if (images.length === 0) return;
    const prevIndex = Math.max(0, currentImageIndex - 1);
    get().selectImageIndex(prevIndex);
  },

  // Class Actions
  setClasses: (classes) => set({ classes: classes }),

  setActiveClassId: (id) => set({ activeClassId: id }),

  addClass: (name, color) => {
    const { classes } = get();
    const newClass: ClassLabel = {
      id: classes.length,
      name: name,
      color: color,
    };
    set({
      classes: [...classes, newClass],
      activeClassId: newClass.id,
    });
  },

  // Box Actions & History
  setBoxes: (boxes) => {
    set({
      boxes: boxes,
      past: [],
      future: [],
      saveStatus: 'saved',
    });
  },

  addBox: (box) => {
    const { boxes, past } = get();
    set({
      past: [...past, boxes],
      future: [],
      boxes: [...boxes, box],
      selectedBoxId: box.id,
      saveStatus: 'unsaved',
    });
  },

  updateBox: (updatedBox) => {
    const { boxes, past } = get();
    const nextBoxes = boxes.map((box) =>
      box.id === updatedBox.id ? updatedBox : box
    );
    set({
      past: [...past, boxes],
      future: [],
      boxes: nextBoxes,
      saveStatus: 'unsaved',
    });
  },

  deleteSelectedBox: () => {
    const { boxes, selectedBoxId, past } = get();
    if (!selectedBoxId) return;

    const nextBoxes = boxes.filter((box) => box.id !== selectedBoxId);
    set({
      past: [...past, boxes],
      future: [],
      boxes: nextBoxes,
      selectedBoxId: null,
      saveStatus: 'unsaved',
    });
  },

  selectBox: (id) => set({ selectedBoxId: id }),

  setIsDrawingMode: (isDrawing) => set({ isDrawingMode: isDrawing }),

  toggleDrawingMode: () => {
    set((state) => ({ isDrawingMode: !state.isDrawingMode }));
  },

  setSaveStatus: (status) => set({ saveStatus: status }),

  // Undo / Redo
  undo: () => {
    const { past, boxes, future } = get();
    if (past.length === 0) return;

    const previousBoxes = past[past.length - 1];
    const remainingPast = past.slice(0, past.length - 1);

    set({
      past: remainingPast,
      future: [boxes, ...future],
      boxes: previousBoxes,
      selectedBoxId: null,
      saveStatus: 'unsaved',
    });
  },

  redo: () => {
    const { future, boxes, past } = get();
    if (future.length === 0) return;

    const nextBoxes = future[0];
    const remainingFuture = future.slice(1);

    set({
      past: [...past, boxes],
      future: remainingFuture,
      boxes: nextBoxes,
      selectedBoxId: null,
      saveStatus: 'unsaved',
    });
  },
}));
