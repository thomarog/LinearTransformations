import { Matrix } from '../types';

export type Preset = {
  id: string;
  label: string;
  matrix: Matrix;
  description: string;
};

function rotationPreset(degrees: number): Preset {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    id: `rotation-${degrees}`,
    label: `Rotation ${degrees}\u00B0`,
    matrix: {
      a: cos,
      b: -sin,
      c: sin,
      d: cos,
    },
    description: `Rotates all vectors ${degrees}\u00B0 counterclockwise around the origin. det = 1, area preserved.`,
  };
}

function shearXPreset(k: number): Preset {
  return {
    id: `shear-x-${k}`,
    label: `Shear X (k=${k})`,
    matrix: { a: 1, b: k, c: 0, d: 1 },
    description: `Slides points horizontally by ${k} times their y-coordinate. det = 1, area preserved.`,
  };
}

function shearYPreset(k: number): Preset {
  return {
    id: `shear-y-${k}`,
    label: `Shear Y (k=${k})`,
    matrix: { a: 1, b: 0, c: k, d: 1 },
    description: `Slides points vertically by ${k} times their x-coordinate. det = 1, area preserved.`,
  };
}

export const presets: Preset[] = [
  {
    id: 'identity',
    label: 'Identity',
    matrix: { a: 1, b: 0, c: 0, d: 1 },
    description: 'Leaves every vector unchanged. det = 1, area preserved.',
  },
  ...[15, 30, 45, 60, 90, 120, 180].map(rotationPreset),
  {
    id: 'scale-x2',
    label: 'Scale x2, y1',
    matrix: { a: 2, b: 0, c: 0, d: 1 },
    description: 'Stretches horizontally by 2 and leaves vertical length unchanged. det = 2, area doubles.',
  },
  {
    id: 'scale-y-half',
    label: 'Scale x1, y0.5',
    matrix: { a: 1, b: 0, c: 0, d: 0.5 },
    description: 'Keeps horizontal length and squishes vertical length by 0.5. det = 0.5, area halves.',
  },
  {
    id: 'scale-x2-y-half',
    label: 'Scale x2, y0.5',
    matrix: { a: 2, b: 0, c: 0, d: 0.5 },
    description: 'Stretches horizontally by 2 and squishes vertically by 0.5. det = 1, area preserved.',
  },
  shearXPreset(0.5),
  shearXPreset(1),
  shearYPreset(0.5),
  shearYPreset(1),
  {
    id: 'reflect-x',
    label: 'Reflection across x-axis',
    matrix: { a: 1, b: 0, c: 0, d: -1 },
    description: 'Flips vectors over the x-axis. det = -1, orientation flips, area preserved.',
  },
  {
    id: 'reflect-y',
    label: 'Reflection across y-axis',
    matrix: { a: -1, b: 0, c: 0, d: 1 },
    description: 'Flips vectors over the y-axis. det = -1, orientation flips, area preserved.',
  },
  {
    id: 'reflect-yx',
    label: 'Reflection across line y = x',
    matrix: { a: 0, b: 1, c: 1, d: 0 },
    description: 'Swaps x and y coordinates. det = -1, orientation flips, area preserved.',
  },
  {
    id: 'proj-x',
    label: 'Projection onto x-axis',
    matrix: { a: 1, b: 0, c: 0, d: 0 },
    description: 'Flattens every vector onto the x-axis. det = 0, not invertible.',
  },
  {
    id: 'proj-y',
    label: 'Projection onto y-axis',
    matrix: { a: 0, b: 0, c: 0, d: 1 },
    description: 'Flattens every vector onto the y-axis. det = 0, not invertible.',
  },
  {
    id: 'custom',
    label: 'Custom',
    matrix: { a: 1, b: 0, c: 0, d: 1 },
    description: 'Edit the matrix entries below to explore any linear transformation you like.',
  },
];

export const presetMap = new Map(presets.map((preset) => [preset.id, preset]));
