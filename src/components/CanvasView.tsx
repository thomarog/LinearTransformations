import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { GridMode, Matrix, PinnedVector, Vector2 } from '../types';
import {
  interpolatePoint,
  multiplyMatrixVector,
  lerp,
  clamp,
} from '../utils/linearAlgebra';

type CameraState = {
  offsetX: number;
  offsetY: number;
  zoom: number;
};

type CanvasViewProps = {
  matrix: Matrix;
  t: number;
  probeVector: Vector2;
  pinnedVectors: PinnedVector[];
  gridMode: GridMode;
  camera: CameraState;
  onProbeChange: (vector: Vector2) => void;
  onCameraChange: (camera: CameraState) => void;
};

type ScreenPoint = { x: number; y: number };

const GRID_RANGE = 10;
const GRID_STEP = 1;
const GRID_SAMPLES = 32;
const MIN_ZOOM = 20;
const MAX_ZOOM = 400;

export function CanvasView({
  matrix,
  t,
  probeVector,
  pinnedVectors,
  gridMode,
  camera,
  onProbeChange,
  onCameraChange,
}: CanvasViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragModeRef = useRef<'none' | 'vector' | 'pan'>('none');
  const pointerMovedRef = useRef(false);
  const lastPointerRef = useRef<ScreenPoint>({ x: 0, y: 0 });

  const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  const worldToScreen = useCallback(
    (point: Vector2, width: number, height: number): ScreenPoint => ({
      x: (point.x - camera.offsetX) * camera.zoom + width / 2,
      y: height / 2 - (point.y - camera.offsetY) * camera.zoom,
    }),
    [camera.offsetX, camera.offsetY, camera.zoom]
  );

  const screenToWorld = useCallback(
    (point: ScreenPoint, width: number, height: number): Vector2 => ({
      x: (point.x - width / 2) / camera.zoom + camera.offsetX,
      y: -(point.y - height / 2) / camera.zoom + camera.offsetY,
    }),
    [camera.offsetX, camera.offsetY, camera.zoom]
  );

  const drawGrid = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      color: string,
      drawTransformed: boolean
    ) => {
      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = color;
      ctx.globalAlpha = drawTransformed ? 0.5 : 0.8;

      const drawLine = (points: Vector2[]) => {
        if (points.length === 0) {
          return;
        }
        ctx.beginPath();
        const first = worldToScreen(points[0], width, height);
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < points.length; i += 1) {
          const screenPoint = worldToScreen(points[i], width, height);
          ctx.lineTo(screenPoint.x, screenPoint.y);
        }
        ctx.stroke();
      };

      for (let x = -GRID_RANGE; x <= GRID_RANGE; x += GRID_STEP) {
        const points: Vector2[] = [];
        for (let i = 0; i <= GRID_SAMPLES; i += 1) {
          const y = -GRID_RANGE + (i / GRID_SAMPLES) * GRID_RANGE * 2;
          const originalPoint: Vector2 = { x, y };
          if (drawTransformed) {
            points.push(multiplyMatrixVector(matrix, originalPoint));
          } else {
            points.push(interpolatePoint(originalPoint, matrix, t));
          }
        }
        drawLine(points);
      }

      for (let y = -GRID_RANGE; y <= GRID_RANGE; y += GRID_STEP) {
        const points: Vector2[] = [];
        for (let i = 0; i <= GRID_SAMPLES; i += 1) {
          const x = -GRID_RANGE + (i / GRID_SAMPLES) * GRID_RANGE * 2;
          const originalPoint: Vector2 = { x, y };
          if (drawTransformed) {
            points.push(multiplyMatrixVector(matrix, originalPoint));
          } else {
            points.push(interpolatePoint(originalPoint, matrix, t));
          }
        }
        drawLine(points);
      }

      ctx.restore();
    },
    [matrix, t, worldToScreen]
  );

  const drawArrow = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      origin: Vector2,
      tip: Vector2,
      options: { color: string; width?: number; dash?: number[]; label?: string; alpha?: number }
    ) => {
      const { color, width: strokeWidth = 2, dash, label, alpha = 1 } = options;
      const originScreen = worldToScreen(origin, width, height);
      const tipScreen = worldToScreen(tip, width, height);
      const angle = Math.atan2(tipScreen.y - originScreen.y, tipScreen.x - originScreen.x);
      const headLength = 12;

      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.setLineDash(dash ?? []);
      ctx.globalAlpha = alpha;
      ctx.moveTo(originScreen.x, originScreen.y);
      ctx.lineTo(tipScreen.x, tipScreen.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(tipScreen.x, tipScreen.y);
      ctx.lineTo(
        tipScreen.x - headLength * Math.cos(angle - Math.PI / 6),
        tipScreen.y - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        tipScreen.x - headLength * Math.cos(angle + Math.PI / 6),
        tipScreen.y - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.fill();

      if (label) {
        ctx.font = '14px Inter, system-ui, sans-serif';
        ctx.fillStyle = color;
        ctx.globalAlpha = 1;
        ctx.fillText(label, tipScreen.x + 6, tipScreen.y - 6);
      }
      ctx.restore();
    },
    [worldToScreen]
  );

  const drawPolygon = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      points: Vector2[],
      options: { stroke?: string; fill?: string; dash?: number[]; alpha?: number }
    ) => {
      if (points.length === 0) {
        return;
      }
      const { stroke, fill, dash, alpha = 1 } = options;
      ctx.save();
      const first = worldToScreen(points[0], width, height);
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < points.length; i += 1) {
        const screenPoint = worldToScreen(points[i], width, height);
        ctx.lineTo(screenPoint.x, screenPoint.y);
      }
      ctx.closePath();
      ctx.globalAlpha = alpha;
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.setLineDash(dash ?? []);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    },
    [worldToScreen]
  );

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const width = canvas.width / devicePixelRatio;
    const height = canvas.height / devicePixelRatio;
    ctx.save();
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    if (gridMode === 'original' || gridMode === 'both') {
      drawGrid(ctx, width, height, '#cbd5f5', false);
    }
    if (gridMode === 'transformed' || gridMode === 'both') {
      drawGrid(ctx, width, height, '#6366f1', true);
    }

    // Axes
    drawArrow(ctx, width, height, { x: -1000, y: 0 }, { x: 1000, y: 0 }, { color: '#94a3b8', width: 1, alpha: 0.6 });
    drawArrow(ctx, width, height, { x: 0, y: -1000 }, { x: 0, y: 1000 }, { color: '#94a3b8', width: 1, alpha: 0.6 });

    const unitSquare: Vector2[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    const transformedSquare = unitSquare.map((point) => multiplyMatrixVector(matrix, point));
    const interpolatedSquare = unitSquare.map((point) => interpolatePoint(point, matrix, t));

    drawPolygon(ctx, width, height, unitSquare, { stroke: '#9ca3af', dash: [6, 6], alpha: 0.7 });
    drawPolygon(ctx, width, height, transformedSquare, { stroke: '#4f46e5', alpha: 0.7 });
    drawPolygon(ctx, width, height, interpolatedSquare, {
      fill: 'rgba(99, 102, 241, 0.18)',
      stroke: '#312e81',
      alpha: 0.9,
    });

    // Basis vectors
    const basisI = { x: 1, y: 0 };
    const basisJ = { x: 0, y: 1 };
    const basisITransformed = multiplyMatrixVector(matrix, basisI);
    const basisJTransformed = multiplyMatrixVector(matrix, basisJ);
    const basisICurrent = interpolatePoint(basisI, matrix, t);
    const basisJCurrent = interpolatePoint(basisJ, matrix, t);

    drawArrow(ctx, width, height, { x: 0, y: 0 }, basisI, {
      color: '#0f172a',
      width: 2,
      label: '(1, 0)',
      alpha: 0.6,
    });
    drawArrow(ctx, width, height, { x: 0, y: 0 }, basisJ, {
      color: '#0f172a',
      width: 2,
      label: '(0, 1)',
      alpha: 0.6,
    });

    drawArrow(ctx, width, height, { x: 0, y: 0 }, basisICurrent, {
      color: '#2563eb',
      width: 3,
      label: `T(1,0) = (${basisITransformed.x.toFixed(2)}, ${basisITransformed.y.toFixed(2)})`,
    });
    drawArrow(ctx, width, height, { x: 0, y: 0 }, basisJCurrent, {
      color: '#16a34a',
      width: 3,
      label: `T(0,1) = (${basisJTransformed.x.toFixed(2)}, ${basisJTransformed.y.toFixed(2)})`,
    });

    // Pinned vectors (ghost)
    pinnedVectors.forEach((pinned) => {
      const interpolatedPinned: Vector2 = {
        x: lerp(pinned.x, pinned.Tx, t),
        y: lerp(pinned.y, pinned.Ty, t),
      };
      drawArrow(ctx, width, height, { x: 0, y: 0 }, interpolatedPinned, {
        color: '#94a3b8',
        width: 1.5,
        alpha: 0.6,
        dash: [4, 4],
        label: undefined,
      });
    });

    // Probe vector
    const probeCurrent = interpolatePoint(probeVector, matrix, t);
    const probeTarget = multiplyMatrixVector(matrix, probeVector);

    drawArrow(ctx, width, height, { x: 0, y: 0 }, probeVector, {
      color: '#f97316',
      width: 2,
      alpha: 0.4,
      label: undefined,
    });
    drawArrow(ctx, width, height, { x: 0, y: 0 }, probeCurrent, {
      color: '#ea580c',
      width: 3,
      label: `v → (${probeTarget.x.toFixed(2)}, ${probeTarget.y.toFixed(2)})`,
    });

    ctx.restore();
  }, [
    devicePixelRatio,
    gridMode,
    drawGrid,
    drawArrow,
    drawPolygon,
    matrix,
    t,
    pinnedVectors,
    probeVector,
  ]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }
    const { width, height } = container.getBoundingClientRect();
    const dpr = devicePixelRatio;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    drawScene();
  }, [drawScene, devicePixelRatio]);

  useEffect(() => {
    resizeCanvas();
  }, [resizeCanvas]);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(() => {
      resizeCanvas();
    });
    const container = containerRef.current;
    if (container) {
      observer.observe(container);
    }
    return () => {
      observer.disconnect();
    };
  }, [resizeCanvas]);

  useEffect(() => {
    drawScene();
  }, [drawScene]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    lastPointerRef.current = point;
    pointerMovedRef.current = false;

    const width = rect.width;
    const height = rect.height;
    const probeTipScreen = worldToScreen(probeVector, width, height);
    const distance = Math.hypot(probeTipScreen.x - point.x, probeTipScreen.y - point.y);

    dragModeRef.current = distance < 16 ? 'vector' : 'pan';
    canvas.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const lastPoint = lastPointerRef.current;
    const dx = point.x - lastPoint.x;
    const dy = point.y - lastPoint.y;

    if (dragModeRef.current === 'vector') {
      pointerMovedRef.current = true;
      const world = screenToWorld(point, rect.width, rect.height);
      onProbeChange(world);
    } else if (dragModeRef.current === 'pan') {
      pointerMovedRef.current = true;
      const newCamera: CameraState = {
        offsetX: camera.offsetX - dx / camera.zoom,
        offsetY: camera.offsetY + dy / camera.zoom,
        zoom: camera.zoom,
      };
      onCameraChange(newCamera);
    }

    lastPointerRef.current = point;
  };

  const endPointerInteraction = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };

    if (dragModeRef.current === 'pan' && !pointerMovedRef.current) {
      const world = screenToWorld(point, rect.width, rect.height);
      onProbeChange(world);
    }

    dragModeRef.current = 'none';
    pointerMovedRef.current = false;
    canvas.releasePointerCapture(event.pointerId);
  };

  const handleWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };

    const zoomFactor = Math.exp(-event.deltaY * 0.001);
    const newZoom = clamp(camera.zoom * zoomFactor, MIN_ZOOM, MAX_ZOOM);

    const beforeZoom = screenToWorld(pointer, rect.width, rect.height);
    const newCamera: CameraState = { ...camera, zoom: newZoom };
    const afterZoom = {
      x: (pointer.x - rect.width / 2) / newZoom + newCamera.offsetX,
      y: -(pointer.y - rect.height / 2) / newZoom + newCamera.offsetY,
    };

    newCamera.offsetX += beforeZoom.x - afterZoom.x;
    newCamera.offsetY += beforeZoom.y - afterZoom.y;

    onCameraChange(newCamera);
  };

  return (
    <div ref={containerRef} className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        className="canvas-element"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointerInteraction}
        onPointerLeave={endPointerInteraction}
        onWheel={handleWheel}
      />
    </div>
  );
}
