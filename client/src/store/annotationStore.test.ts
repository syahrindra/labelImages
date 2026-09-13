import { describe, it, expect, beforeEach } from 'vitest';
import { useAnnotationStore } from './annotationStore.js';
import { PixelBox } from '../types/annotation.js';

describe('useAnnotationStore', () => {
  beforeEach(() => {
    // Reset store to a clean state before each test
    useAnnotationStore.setState({
      datasetDir: null,
      images: [],
      currentImageIndex: 0,
      classes: [
        { id: 0, name: 'cat', color: '#3b82f6' },
        { id: 1, name: 'dog', color: '#10b981' },
      ],
      activeClassId: 0,
      boxes: [],
      selectedBoxId: null,
      isDrawingMode: false,
      saveStatus: 'saved',
      past: [],
      future: [],
    });
  });

  describe('Box manipulation & History (Undo / Redo)', () => {
    const box1: PixelBox = { id: 'box-1', classId: 0, x: 10, y: 10, width: 50, height: 50 };
    const box2: PixelBox = { id: 'box-2', classId: 1, x: 70, y: 70, width: 30, height: 30 };

    it('should add a box and track it in undo history', () => {
      const store = useAnnotationStore.getState();

      store.addBox(box1);

      const stateAfterAdd = useAnnotationStore.getState();
      expect(stateAfterAdd.boxes).toHaveLength(1);
      expect(stateAfterAdd.boxes[0]).toEqual(box1);
      expect(stateAfterAdd.saveStatus).toBe('unsaved');
      expect(stateAfterAdd.past).toHaveLength(1); // One history state recorded
    });

    it('should support undo and redo', () => {
      const store = useAnnotationStore.getState();

      store.addBox(box1);
      store.addBox(box2);

      expect(useAnnotationStore.getState().boxes).toHaveLength(2);

      // Undo box2
      useAnnotationStore.getState().undo();
      expect(useAnnotationStore.getState().boxes).toHaveLength(1);
      expect(useAnnotationStore.getState().boxes[0].id).toBe('box-1');

      // Undo box1
      useAnnotationStore.getState().undo();
      expect(useAnnotationStore.getState().boxes).toHaveLength(0);

      // Redo box1
      useAnnotationStore.getState().redo();
      expect(useAnnotationStore.getState().boxes).toHaveLength(1);
      expect(useAnnotationStore.getState().boxes[0].id).toBe('box-1');

      // Redo box2
      useAnnotationStore.getState().redo();
      expect(useAnnotationStore.getState().boxes).toHaveLength(2);
      expect(useAnnotationStore.getState().boxes[1].id).toBe('box-2');
    });

    it('should delete selected box and record in undo history', () => {
      const store = useAnnotationStore.getState();

      store.addBox(box1);
      store.selectBox('box-1');
      store.deleteSelectedBox();

      const state = useAnnotationStore.getState();
      expect(state.boxes).toHaveLength(0);
      expect(state.selectedBoxId).toBeNull();
      expect(state.saveStatus).toBe('unsaved');

      // Undo deletion
      state.undo();
      expect(useAnnotationStore.getState().boxes).toHaveLength(1);
    });
  });

  describe('Image navigation', () => {
    beforeEach(() => {
      useAnnotationStore.setState({
        images: [
          { id: '1.jpg', filename: '1.jpg', relativePath: '1.jpg', isLabeled: true, boxCount: 1 },
          { id: '2.jpg', filename: '2.jpg', relativePath: '2.jpg', isLabeled: false, boxCount: 0 },
          { id: '3.jpg', filename: '3.jpg', relativePath: '3.jpg', isLabeled: false, boxCount: 0 },
        ],
        currentImageIndex: 0,
      });
    });

    it('should navigate to next and previous images within bounds', () => {
      const store = useAnnotationStore.getState();

      store.nextImage();
      expect(useAnnotationStore.getState().currentImageIndex).toBe(1);

      store.nextImage();
      expect(useAnnotationStore.getState().currentImageIndex).toBe(2);

      // Should clamp at the end
      store.nextImage();
      expect(useAnnotationStore.getState().currentImageIndex).toBe(2);

      // Navigate back
      store.prevImage();
      expect(useAnnotationStore.getState().currentImageIndex).toBe(1);

      store.prevImage();
      expect(useAnnotationStore.getState().currentImageIndex).toBe(0);

      // Should clamp at the beginning
      store.prevImage();
      expect(useAnnotationStore.getState().currentImageIndex).toBe(0);
    });
  });
});
