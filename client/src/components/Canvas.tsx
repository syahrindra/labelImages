import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type MouseEvent,
  type WheelEvent,
} from 'react';
import { useAnnotationStore } from '../store/annotationStore.js';
import {
  calculateFitTransform,
  canvasToImageCoords,
  imageToCanvasCoords,
  isPointInBox,
  normalizeRect,
  getHandleUnderPoint,
  resizeBox,
  moveBox,
  clamp,
} from '../utils/coordinates.js';
import {
  ViewTransform,
  Dimensions,
  Point,
  PixelBox,
  ResizeHandle,
} from '../types/annotation.js';
import './Canvas.css';

interface CanvasProps {
  imageUrl: string | null;
  onBoxDrawn?: (box: PixelBox) => void;
  onImageLoaded?: (dims: Dimensions) => void;
}

const HANDLE_SIZE = 8; // Size of corner resize handles in canvas pixels

type ActiveInteraction =
  | {
      type: 'draw';
      startImagePoint: Point;
      currentRect: { x: number; y: number; width: number; height: number };
    }
  | {
      type: 'resize';
      handle: ResizeHandle;
      initialBox: PixelBox;
    }
  | {
      type: 'move';
      startImagePoint: Point;
      initialBox: PixelBox;
    };

export function Canvas({
  imageUrl,
  onBoxDrawn,
  onImageLoaded,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Loaded image element & its original pixel dimensions
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [naturalDimensions, setNaturalDimensions] = useState<Dimensions | null>(null);

  // Current view transformation (zoom & pan)
  const [transform, setTransform] = useState<ViewTransform>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

  // Canvas element dimensions in DOM pixels
  const [canvasDimensions, setCanvasDimensions] = useState<Dimensions>({
    width: 800,
    height: 600,
  });

  // Pan interaction state
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const lastPanPoint = useRef<Point>({ x: 0, y: 0 });

  // Current mouse interaction (drawing, resizing, or moving)
  const [activeInteraction, setActiveInteraction] = useState<ActiveInteraction | null>(null);
  const [hoverCursor, setHoverCursor] = useState<string>('default');

  // Zustand Store selectors
  const boxes = useAnnotationStore((state) => state.boxes);
  const selectedBoxId = useAnnotationStore((state) => state.selectedBoxId);
  const classes = useAnnotationStore((state) => state.classes);
  const activeClassId = useAnnotationStore((state) => state.activeClassId);
  const isDrawingMode = useAnnotationStore((state) => state.isDrawingMode);

  const selectBox = useAnnotationStore((state) => state.selectBox);
  const addBox = useAnnotationStore((state) => state.addBox);
  const updateBox = useAnnotationStore((state) => state.updateBox);
  const deleteSelectedBox = useAnnotationStore((state) => state.deleteSelectedBox);
  const setIsDrawingMode = useAnnotationStore((state) => state.setIsDrawingMode);
  const toggleDrawingMode = useAnnotationStore((state) => state.toggleDrawingMode);
  const undo = useAnnotationStore((state) => state.undo);
  const redo = useAnnotationStore((state) => state.redo);

  const selectedBox = boxes.find((b) => b.id === selectedBoxId) || null;

  // 1. Keep canvas dimensions synchronized with its parent container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCanvasDimensions({ width, height });
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // 2. Load the active image whenever imageUrl changes
  useEffect(() => {
    if (!imageUrl) {
      setImageElement(null);
      setNaturalDimensions(null);
      return;
    }

    const img = new Image();
    img.src = imageUrl;

    img.onload = () => {
      setImageElement(img);
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      setNaturalDimensions(dims);

      // Auto-fit image in canvas on initial load
      const fit = calculateFitTransform(canvasDimensions, dims);
      setTransform(fit);
      onImageLoaded?.(dims);
    };

    img.onerror = () => {
      console.error('Failed to load image from:', imageUrl);
      setImageElement(null);
      setNaturalDimensions(null);
    };
  }, [imageUrl, canvasDimensions.width, canvasDimensions.height]);

  // Helper to convert mouse event client coordinates to canvas pixel coordinates
  const getCanvasPointFromEvent = useCallback((e: MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // 3. Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = '#0f1115';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw image if loaded
    if (imageElement && naturalDimensions) {
      const renderWidth = naturalDimensions.width * transform.scale;
      const renderHeight = naturalDimensions.height * transform.scale;

      ctx.drawImage(
        imageElement,
        transform.offsetX,
        transform.offsetY,
        renderWidth,
        renderHeight
      );

      // Draw all existing bounding boxes
      for (const box of boxes) {
        const isSelected = box.id === selectedBoxId;

        // Find class color and name
        const classMeta = classes.find((c) => c.id === box.classId);
        const boxColor = classMeta ? classMeta.color : '#4f8cff';
        const boxLabel = classMeta ? classMeta.name : `Class ${box.classId}`;

        // Convert image pixel box coordinates to canvas coordinates
        const topLeft = imageToCanvasCoords({ x: box.x, y: box.y }, transform);
        const boxCanvasWidth = box.width * transform.scale;
        const boxCanvasHeight = box.height * transform.scale;

        // Box semi-transparent fill
        ctx.fillStyle = `${boxColor}26`; // 15% opacity
        ctx.fillRect(topLeft.x, topLeft.y, boxCanvasWidth, boxCanvasHeight);

        // Box border outline
        ctx.strokeStyle = boxColor;
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeRect(topLeft.x, topLeft.y, boxCanvasWidth, boxCanvasHeight);

        // Class Label Badge
        const badgePaddingX = 6;
        ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
        const textMetrics = ctx.measureText(boxLabel);
        const badgeWidth = textMetrics.width + badgePaddingX * 2;
        const badgeHeight = 18;

        const badgeX = topLeft.x;
        const badgeY = topLeft.y - badgeHeight >= 0 ? topLeft.y - badgeHeight : topLeft.y;

        ctx.fillStyle = boxColor;
        ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);

        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        ctx.fillText(boxLabel, badgeX + badgePaddingX, badgeY + badgeHeight / 2);

        // If selected: render 4 corner resize handles
        if (isSelected) {
          const corners = [
            { x: topLeft.x, y: topLeft.y }, // top-left
            { x: topLeft.x + boxCanvasWidth, y: topLeft.y }, // top-right
            { x: topLeft.x, y: topLeft.y + boxCanvasHeight }, // bottom-left
            { x: topLeft.x + boxCanvasWidth, y: topLeft.y + boxCanvasHeight }, // bottom-right
          ];

          for (const corner of corners) {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#0f1115';
            ctx.lineWidth = 1.5;

            ctx.fillRect(
              corner.x - HANDLE_SIZE / 2,
              corner.y - HANDLE_SIZE / 2,
              HANDLE_SIZE,
              HANDLE_SIZE
            );
            ctx.strokeRect(
              corner.x - HANDLE_SIZE / 2,
              corner.y - HANDLE_SIZE / 2,
              HANDLE_SIZE,
              HANDLE_SIZE
            );
          }
        }
      }

      // Draw active live preview box if user is currently dragging a new box
      if (activeInteraction?.type === 'draw') {
        const { currentRect } = activeInteraction;
        const activeClassMeta = classes.find((c) => c.id === activeClassId);
        const drawColor = activeClassMeta ? activeClassMeta.color : '#4f8cff';

        const topLeft = imageToCanvasCoords(
          { x: currentRect.x, y: currentRect.y },
          transform
        );
        const drawWidth = currentRect.width * transform.scale;
        const drawHeight = currentRect.height * transform.scale;

        ctx.fillStyle = `${drawColor}33`; // 20% opacity
        ctx.fillRect(topLeft.x, topLeft.y, drawWidth, drawHeight);

        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]); // Dashed line for preview
        ctx.strokeRect(topLeft.x, topLeft.y, drawWidth, drawHeight);
        ctx.setLineDash([]); // Reset dashed line
      }
    }
  }, [
    imageElement,
    naturalDimensions,
    transform,
    boxes,
    selectedBoxId,
    classes,
    activeClassId,
    activeInteraction,
    canvasDimensions,
  ]);

  // 4. Keyboard shortcuts: w, space, del, esc, undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts if user is typing in a text input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Space: pan mode
      if (e.code === 'Space') {
        setIsSpacePressed(true);
      }
      // w: toggle draw mode
      else if (e.key === 'w' || e.key === 'W') {
        toggleDrawingMode();
      }
      // Escape: deselect box or exit drawing mode
      else if (e.key === 'Escape') {
        setIsDrawingMode(false);
        selectBox(null);
        setActiveInteraction(null);
      }
      // Delete or Backspace: delete selected box
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedBoxId) {
          deleteSelectedBox();
        }
      }
      // Undo: Cmd+Z or Ctrl+Z
      else if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      // Redo: Cmd+Shift+Z or Ctrl+Y
      else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
      }
      // 0: reset zoom to fit
      else if (e.key === '0' && naturalDimensions) {
        const fit = calculateFitTransform(canvasDimensions, naturalDimensions);
        setTransform(fit);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    canvasDimensions,
    naturalDimensions,
    selectedBoxId,
    toggleDrawingMode,
    setIsDrawingMode,
    selectBox,
    deleteSelectedBox,
    undo,
    redo,
  ]);

  // 5. Mouse Wheel Zoom centered on cursor
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (!naturalDimensions) return;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newScale = clamp(transform.scale * zoomFactor, 0.1, 15.0);

    const canvasPoint = getCanvasPointFromEvent(e);

    const newOffsetX =
      canvasPoint.x - (canvasPoint.x - transform.offsetX) * (newScale / transform.scale);
    const newOffsetY =
      canvasPoint.y - (canvasPoint.y - transform.offsetY) * (newScale / transform.scale);

    setTransform({
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
    });
  };

  // 6. Mouse Interaction Handlers: Panning, Drawing, Resizing, Moving
  const handleMouseDown = (e: MouseEvent) => {
    const canvasPoint = getCanvasPointFromEvent(e);

    // Pan with Space or Middle Click
    if (isSpacePressed || e.button === 1) {
      setIsPanning(true);
      lastPanPoint.current = canvasPoint;
      return;
    }

    if (e.button !== 0 || !naturalDimensions) return; // Only process primary left clicks

    const imagePoint = canvasToImageCoords(canvasPoint, transform);

    // A. If in DRAWING MODE: start drawing a new box
    if (isDrawingMode) {
      setActiveInteraction({
        type: 'draw',
        startImagePoint: imagePoint,
        currentRect: { x: imagePoint.x, y: imagePoint.y, width: 0, height: 0 },
      });
      return;
    }

    // B. Check if clicking on a RESIZE HANDLE of the selected box
    if (selectedBox) {
      const handleUnderCursor = getHandleUnderPoint(canvasPoint, selectedBox, transform);
      if (handleUnderCursor) {
        setActiveInteraction({
          type: 'resize',
          handle: handleUnderCursor,
          initialBox: selectedBox,
        });
        return;
      }

      // C. Check if clicking INSIDE the selected box to MOVE it
      if (isPointInBox(imagePoint, selectedBox)) {
        setActiveInteraction({
          type: 'move',
          startImagePoint: imagePoint,
          initialBox: selectedBox,
        });
        return;
      }
    }

    // D. Hit-test: Check if user clicked on another box to select it
    let clickedBoxId: string | null = null;
    for (let i = boxes.length - 1; i >= 0; i--) {
      if (isPointInBox(imagePoint, boxes[i])) {
        clickedBoxId = boxes[i].id;
        break;
      }
    }

    selectBox(clickedBoxId);
  };

  const handleMouseMove = (e: MouseEvent) => {
    const canvasPoint = getCanvasPointFromEvent(e);

    // Handle panning
    if (isPanning) {
      const dx = canvasPoint.x - lastPanPoint.current.x;
      const dy = canvasPoint.y - lastPanPoint.current.y;
      lastPanPoint.current = canvasPoint;

      setTransform((prev) => ({
        ...prev,
        offsetX: prev.offsetX + dx,
        offsetY: prev.offsetY + dy,
      }));
      return;
    }

    if (!naturalDimensions) return;
    const imagePoint = canvasToImageCoords(canvasPoint, transform);

    // 1. Process active interaction in progress
    if (activeInteraction) {
      if (activeInteraction.type === 'draw') {
        const rect = normalizeRect(activeInteraction.startImagePoint, imagePoint);
        setActiveInteraction({
          ...activeInteraction,
          currentRect: rect,
        });
      } else if (activeInteraction.type === 'resize') {
        const resized = resizeBox(
          activeInteraction.initialBox,
          activeInteraction.handle,
          imagePoint
        );
        updateBox(resized);
      } else if (activeInteraction.type === 'move') {
        const dx = imagePoint.x - activeInteraction.startImagePoint.x;
        const dy = imagePoint.y - activeInteraction.startImagePoint.y;
        const moved = moveBox(
          activeInteraction.initialBox,
          dx,
          dy,
          naturalDimensions.width,
          naturalDimensions.height
        );
        updateBox(moved);
      }
      return;
    }

    // 2. Update hover cursor style when idle
    if (isSpacePressed) {
      setHoverCursor('grab');
    } else if (isDrawingMode) {
      setHoverCursor('crosshair');
    } else if (selectedBox) {
      const handle = getHandleUnderPoint(canvasPoint, selectedBox, transform);
      if (handle === 'topLeft' || handle === 'bottomRight') {
        setHoverCursor('nwse-resize');
      } else if (handle === 'topRight' || handle === 'bottomLeft') {
        setHoverCursor('nesw-resize');
      } else if (isPointInBox(imagePoint, selectedBox)) {
        setHoverCursor('move');
      } else {
        setHoverCursor('default');
      }
    } else {
      setHoverCursor('default');
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }

    // Commit newly drawn box
    if (activeInteraction?.type === 'draw') {
      const { currentRect } = activeInteraction;

      // Only commit if larger than 5x5 pixels (prevents accidental micro-clicks)
      if (currentRect.width >= 5 && currentRect.height >= 5) {
        const newBox: PixelBox = {
          id: Math.random().toString(36).substring(2, 9),
          classId: activeClassId,
          x: currentRect.x,
          y: currentRect.y,
          width: currentRect.width,
          height: currentRect.height,
        };

        addBox(newBox);
        selectBox(newBox.id);
        setIsDrawingMode(false); // Automatically return to select mode
        onBoxDrawn?.(newBox);
      }
    }

    setActiveInteraction(null);
  };

  // Zoom control button handlers
  const handleZoomIn = () => {
    setTransform((prev) => ({
      ...prev,
      scale: clamp(prev.scale * 1.25, 0.1, 15),
    }));
  };

  const handleZoomOut = () => {
    setTransform((prev) => ({
      ...prev,
      scale: clamp(prev.scale * 0.8, 0.1, 15),
    }));
  };

  const handleResetZoom = () => {
    if (naturalDimensions) {
      const fit = calculateFitTransform(canvasDimensions, naturalDimensions);
      setTransform(fit);
    }
  };

  return (
    <div className="canvas-container" ref={containerRef}>
      {imageUrl ? (
        <canvas
          ref={canvasRef}
          width={canvasDimensions.width}
          height={canvasDimensions.height}
          className="canvas-element"
          style={{ cursor: isPanning ? 'grabbing' : hoverCursor }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      ) : (
        <div className="canvas-empty-state">
          <p>No image selected. Choose a folder or open an image to start labeling.</p>
        </div>
      )}

      {/* Zoom and Fit Overlay Controls */}
      {imageUrl && (
        <div className="canvas-zoom-controls">
          <button className="canvas-zoom-btn" onClick={handleZoomOut} title="Zoom Out (-)">
            -
          </button>
          <button
            className="canvas-zoom-btn"
            onClick={handleResetZoom}
            title="Fit to Screen (0)"
          >
            {Math.round(transform.scale * 100)}%
          </button>
          <button className="canvas-zoom-btn" onClick={handleZoomIn} title="Zoom In (+)">
            +
          </button>
        </div>
      )}
    </div>
  );
}

