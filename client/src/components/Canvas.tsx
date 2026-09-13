/// <reference types="vite/client" /> 

import { useRef, useEffect, useState, useCallback, type MouseEvent, type WheelEvent } from 'react';
import { useAnnotationStore } from '../store/annotationStore.js';
import {
  calculateFitTransform,
  canvasToImageCoords,
  imageToCanvasCoords,
  isPointInBox,
  clamp,
} from '../utils/coordinates.js';
import { ViewTransform, Dimensions, Point } from '../types/annotation.js';
import './Canvas.css';

interface CanvasProps {
  imageUrl: string | null;
}

const HANDLE_SIZE = 8; // Size of corner resize handles in canvas pixels

export function Canvas({ imageUrl }: CanvasProps) {
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

  // Zustand Store selectors
  const boxes = useAnnotationStore((state) => state.boxes);
  const selectedBoxId = useAnnotationStore((state) => state.selectedBoxId);
  const classes = useAnnotationStore((state) => state.classes);
  const isDrawingMode = useAnnotationStore((state) => state.isDrawingMode);
  const selectBox = useAnnotationStore((state) => state.selectBox);

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

      // Draw all bounding boxes
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
    }
  }, [
    imageElement,
    naturalDimensions,
    transform,
    boxes,
    selectedBoxId,
    classes,
    canvasDimensions,
  ]);

  // 4. Keyboard handlers for Spacebar Pan and Zoom Shortcuts (+, -, 0)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space') {
        setIsSpacePressed(true);
      } else if (e.key === '0' && naturalDimensions) {
        // Reset zoom to fit image
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
  }, [canvasDimensions, naturalDimensions]);

  // 5. Mouse Wheel Zoom centered on cursor
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (!naturalDimensions) return;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newScale = clamp(transform.scale * zoomFactor, 0.1, 15.0);

    const canvasPoint = getCanvasPointFromEvent(e);

    // Keep point under cursor invariant
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

  // 6. Mouse Event Handlers: Panning and Box Selection
  const handleMouseDown = (e: MouseEvent) => {
    const canvasPoint = getCanvasPointFromEvent(e);

    // Pan with spacebar or middle mouse click (button === 1)
    if (isSpacePressed || e.button === 1) {
      setIsPanning(true);
      lastPanPoint.current = canvasPoint;
      return;
    }

    // Left click on canvas
    if (e.button === 0 && !isDrawingMode && naturalDimensions) {
      const imagePoint = canvasToImageCoords(canvasPoint, transform);

      // Hit-test: Check if user clicked inside an existing box (reverse order for top-most)
      let clickedBoxId: string | null = null;
      for (let i = boxes.length - 1; i >= 0; i--) {
        if (isPointInBox(imagePoint, boxes[i])) {
          clickedBoxId = boxes[i].id;
          break;
        }
      }

      selectBox(clickedBoxId);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    const canvasPoint = getCanvasPointFromEvent(e);

    if (isPanning) {
      const dx = canvasPoint.x - lastPanPoint.current.x;
      const dy = canvasPoint.y - lastPanPoint.current.y;
      lastPanPoint.current = canvasPoint;

      setTransform((prev) => ({
        ...prev,
        offsetX: prev.offsetX + dx,
        offsetY: prev.offsetY + dy,
      }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
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

  const canvasCursorClass = isPanning
    ? 'is-panning'
    : isSpacePressed
    ? 'panning'
    : isDrawingMode
    ? 'drawing'
    : 'default';

  return (
    <div className="canvas-container" ref={containerRef}>
      {imageUrl ? (
        <canvas
          ref={canvasRef}
          width={canvasDimensions.width}
          height={canvasDimensions.height}
          className={`canvas-element ${canvasCursorClass}`}
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
