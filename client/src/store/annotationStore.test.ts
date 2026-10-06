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

  describe('Class rename & delete', () => {
    it('should block duplicate names when adding a class', () => {
      const wasAdded = useAnnotationStore.getState().addClass('CAT', '#ffffff');

      expect(wasAdded).toBe(false);
      expect(useAnnotationStore.getState().classes).toHaveLength(2);
    });

    it('should rename a class and keep its id and color', () => {
      const wasRenamed = useAnnotationStore.getState().renameClass(0, 'kitten');

      expect(wasRenamed).toBe(true);

      const classes = useAnnotationStore.getState().classes;
      expect(classes[0].name).toBe('kitten');
      expect(classes[0].id).toBe(0);
      expect(classes[0].color).toBe('#3b82f6');
    });

    it('should block rename to an existing class name', () => {
      const wasRenamed = useAnnotationStore.getState().renameClass(0, 'DOG');

      expect(wasRenamed).toBe(false);
      expect(useAnnotationStore.getState().classes[0].name).toBe('cat');
    });

    it('should delete a class and reindex remaining ids', () => {
      useAnnotationStore.setState({
        classes: [
          { id: 0, name: 'cat', color: '#111111' },
          { id: 1, name: 'dog', color: '#222222' },
          { id: 2, name: 'bird', color: '#333333' },
        ],
        activeClassId: 0,
      });

      useAnnotationStore.getState().deleteClass(0);

      const classes = useAnnotationStore.getState().classes;
      expect(classes).toHaveLength(2);
      expect(classes[0].name).toBe('dog');
      expect(classes[0].id).toBe(0);
      expect(classes[0].color).toBe('#222222');
      expect(classes[1].name).toBe('bird');
      expect(classes[1].id).toBe(1);
    });

    it('should move active class when the active class is deleted', () => {
      useAnnotationStore.setState({ activeClassId: 1 });

      useAnnotationStore.getState().deleteClass(1);

      expect(useAnnotationStore.getState().classes).toHaveLength(1);
      expect(useAnnotationStore.getState().activeClassId).toBe(0);
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
