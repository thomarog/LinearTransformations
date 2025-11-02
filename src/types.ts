export type Matrix = {
  a: number;
  b: number;
  c: number;
  d: number;
};

export type Vector2 = {
  x: number;
  y: number;
};

export type PinnedVector = Vector2 & {
  Tx: number;
  Ty: number;
};

export type GridMode = 'original' | 'transformed' | 'both';

export type AppState = {
  matrix: Matrix;
  t: number;
  probeVector: Vector2;
  pinnedVectors: PinnedVector[];
  camera: {
    offsetX: number;
    offsetY: number;
    zoom: number;
  };
  gridMode: GridMode;
  presetId: string | null;
  isPlaying: boolean;
};
