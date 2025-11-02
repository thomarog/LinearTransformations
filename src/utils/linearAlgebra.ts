import { Matrix, Vector2 } from '../types';

export const identityMatrix: Matrix = { a: 1, b: 0, c: 0, d: 1 };

export function multiplyMatrixVector(matrix: Matrix, vector: Vector2): Vector2 {
  const { a, b, c, d } = matrix;
  return {
    x: a * vector.x + b * vector.y,
    y: c * vector.x + d * vector.y,
  };
}

export function determinant(matrix: Matrix): number {
  const { a, b, c, d } = matrix;
  return a * d - b * c;
}

export function interpolatePoint(point: Vector2, matrix: Matrix, t: number): Vector2 {
  const transformed = multiplyMatrixVector(matrix, point);
  return {
    x: (1 - t) * point.x + t * transformed.x,
    y: (1 - t) * point.y + t * transformed.y,
  };
}

export function interpolateVector(vector: Vector2, matrix: Matrix, t: number): Vector2 {
  return interpolatePoint(vector, matrix, t);
}

export function lerp(a: number, b: number, t: number): number {
  return (1 - t) * a + t * b;
}

export function formatNumber(value: number, precision = 2): string {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return '—';
  }
  return value.toFixed(precision);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
