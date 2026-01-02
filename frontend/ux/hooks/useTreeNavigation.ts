import { useState, useCallback, useRef, useEffect, RefObject } from 'react';

// ============================================================================
// TYPES
// ============================================================================
export interface TreeNavigationOptions {
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  enableTouch?: boolean;
}

export interface TreeNavigationState {
  zoom: number;
  pan: { x: number; y: number };
  isPanning: boolean;
}

export interface TreeNavigationHandlers {
  // Mouse handlers
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  // Touch handlers (optional)
  handleTouchStart?: (e: React.TouchEvent) => void;
  handleTouchMove?: (e: React.TouchEvent) => void;
  handleTouchEnd?: () => void;
  // Wheel handler
  handleWheel: (e: React.WheelEvent) => void;
  // Zoom controls
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  handleFitToView: (contentDimensions: { width: number; height: number }) => void;
  // Advanced zoom
  zoomToPoint: (newZoom: number, focusPoint: { x: number; y: number }) => void;
  // Direct setters for custom logic
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
}

export interface UseTreeNavigationResult extends TreeNavigationState, TreeNavigationHandlers {
  containerRef: RefObject<HTMLDivElement | null>;
}

// ============================================================================
// DEFAULTS
// ============================================================================
const DEFAULT_OPTIONS: Required<TreeNavigationOptions> = {
  minZoom: 0.25,
  maxZoom: 4,
  zoomStep: 1.25,
  enableTouch: true,
};

// ============================================================================
// HOOK
// ============================================================================
export function useTreeNavigation(
  options: TreeNavigationOptions = {}
): UseTreeNavigationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { minZoom, maxZoom, zoomStep, enableTouch } = opts;

  // State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------------------
  // PAN HANDLERS
  // -------------------------------------------------------------------------
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // -------------------------------------------------------------------------
  // TOUCH HANDLERS (optional)
  // -------------------------------------------------------------------------
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      setPanStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  }, [pan]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isPanning && e.touches.length === 1) {
      setPan({
        x: e.touches[0].clientX - panStart.x,
        y: e.touches[0].clientY - panStart.y,
      });
    }
  }, [isPanning, panStart]);

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // -------------------------------------------------------------------------
  // ZOOM HANDLERS
  // -------------------------------------------------------------------------
  const zoomToPoint = useCallback((newZoom: number, focusPoint: { x: number; y: number }) => {
    if (!containerRef.current) {
      setZoom(newZoom);
      return;
    }

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const newPanX = containerWidth / 2 - focusPoint.x * newZoom;
    const newPanY = containerHeight / 2 - focusPoint.y * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * zoomStep, maxZoom));
  }, [zoomStep, maxZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / zoomStep, minZoom));
  }, [zoomStep, minZoom]);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleFitToView = useCallback((contentDimensions: { width: number; height: number }) => {
    if (!containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const { width: contentWidth, height: contentHeight } = contentDimensions;

    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    const newZoom = Math.min(scaleX, scaleY, 1) * 0.9;
    const finalZoom = Math.max(newZoom, minZoom);

    const treeCenterX = contentWidth / 2;
    const treeCenterY = contentHeight / 2;

    const newPanX = containerWidth / 2 - treeCenterX * finalZoom;
    const newPanY = containerHeight / 2 - treeCenterY * finalZoom;

    setZoom(finalZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [minZoom]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.min(Math.max(prev * delta, minZoom), maxZoom));
    }
  }, [minZoom, maxZoom]);

  // -------------------------------------------------------------------------
  // RETURN
  // -------------------------------------------------------------------------
  const result: UseTreeNavigationResult = {
    // State
    zoom,
    pan,
    isPanning,
    containerRef,
    // Mouse handlers
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    // Wheel handler
    handleWheel,
    // Zoom controls
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleFitToView,
    zoomToPoint,
    // Direct setters
    setZoom,
    setPan,
  };

  // Add touch handlers if enabled
  if (enableTouch) {
    result.handleTouchStart = handleTouchStart;
    result.handleTouchMove = handleTouchMove;
    result.handleTouchEnd = handleTouchEnd;
  }

  return result;
}
