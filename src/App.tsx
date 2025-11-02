import { useCallback, useMemo, useRef, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { CanvasView } from './components/CanvasView';
import { useAnimationFrame } from './hooks/useAnimationFrame';
import { AppState, GridMode, Matrix, PinnedVector, Vector2 } from './types';
import { determinant, identityMatrix, multiplyMatrixVector, clamp } from './utils/linearAlgebra';
import { Preset, presetMap } from './utils/presets';

const INITIAL_CAMERA = {
  offsetX: 0,
  offsetY: 0,
  zoom: 80,
};

const INITIAL_STATE: AppState = {
  matrix: identityMatrix,
  t: 1,
  probeVector: { x: 1, y: 1 },
  pinnedVectors: [],
  camera: { ...INITIAL_CAMERA },
  gridMode: 'both',
  presetId: 'identity',
  isPlaying: false,
};

function matricesEqual(a: Matrix, b: Matrix): boolean {
  return a.a === b.a && a.b === b.b && a.c === b.c && a.d === b.d;
}

export default function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const directionRef = useRef(1);

  const currentPreset = useMemo(() => {
    if (!state.presetId) {
      return presetMap.get('custom');
    }
    return presetMap.get(state.presetId) ?? presetMap.get('custom');
  }, [state.presetId]);

  const transformedProbe = useMemo(
    () => multiplyMatrixVector(state.matrix, state.probeVector),
    [state.matrix, state.probeVector]
  );

  const det = useMemo(() => determinant(state.matrix), [state.matrix]);

  const handlePresetChange = useCallback((preset: Preset) => {
    setState((prev) => ({
      ...prev,
      matrix: { ...preset.matrix },
      presetId: preset.id,
    }));
  }, []);

  const handleMatrixChange = useCallback((matrix: Matrix) => {
    setState((prev) => ({
      ...prev,
      matrix,
      presetId: matricesEqual(matrix, identityMatrix) ? 'identity' : 'custom',
    }));
  }, []);

  const handlePlayPause = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const handleTChange = useCallback((value: number) => {
    setState((prev) => ({ ...prev, t: clamp(value, 0, 1), isPlaying: false }));
  }, []);

  const handleProbeChange = useCallback((vector: Vector2) => {
    setState((prev) => ({ ...prev, probeVector: vector }));
  }, []);

  const handlePinVector = useCallback(() => {
    setState((prev) => {
      const newPin: PinnedVector = {
        x: prev.probeVector.x,
        y: prev.probeVector.y,
        Tx: transformedProbe.x,
        Ty: transformedProbe.y,
      };
      const limitedPins = [...prev.pinnedVectors, newPin].slice(-6);
      return { ...prev, pinnedVectors: limitedPins };
    });
  }, [transformedProbe.x, transformedProbe.y]);

  const handleGridModeChange = useCallback((mode: GridMode) => {
    setState((prev) => ({ ...prev, gridMode: mode }));
  }, []);

  const handleCameraChange = useCallback((camera: AppState['camera']) => {
    setState((prev) => ({ ...prev, camera }));
  }, []);

  const handleResetCamera = useCallback(() => {
    setState((prev) => ({ ...prev, camera: { ...INITIAL_CAMERA } }));
  }, []);

  const handleAnimationFrame = useCallback(
    (delta: number) => {
      setState((prev) => {
        if (!prev.isPlaying) {
          return prev;
        }
        const speed = 0.0004; // controls animation duration
        let nextT = prev.t + delta * speed * directionRef.current;
        let direction = directionRef.current;
        if (nextT >= 1) {
          nextT = 1;
          direction = -1;
        } else if (nextT <= 0) {
          nextT = 0;
          direction = 1;
        }
        directionRef.current = direction;
        return { ...prev, t: nextT };
      });
    },
    []
  );

  useAnimationFrame(handleAnimationFrame, state.isPlaying);

  return (
    <div className="app-shell">
      <Sidebar
        matrix={state.matrix}
        presetId={state.presetId}
        onPresetChange={handlePresetChange}
        onMatrixChange={handleMatrixChange}
        determinant={det}
        t={state.t}
        isPlaying={state.isPlaying}
        onPlayPause={handlePlayPause}
        onTChange={handleTChange}
        probeVector={state.probeVector}
        transformedProbe={transformedProbe}
        onProbeChange={handleProbeChange}
        onPinVector={handlePinVector}
        pinnedVectors={state.pinnedVectors}
        gridMode={state.gridMode}
        onGridModeChange={handleGridModeChange}
        onResetCamera={handleResetCamera}
        presetDescription={currentPreset?.description ?? ''}
      />
      <CanvasView
        matrix={state.matrix}
        t={state.t}
        probeVector={state.probeVector}
        pinnedVectors={state.pinnedVectors}
        gridMode={state.gridMode}
        camera={state.camera}
        onProbeChange={handleProbeChange}
        onCameraChange={handleCameraChange}
      />
    </div>
  );
}
