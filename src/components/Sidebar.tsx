import { ChangeEvent } from 'react';
import { GridMode, Matrix, PinnedVector, Vector2 } from '../types';
import { formatNumber } from '../utils/linearAlgebra';
import { Preset, presets } from '../utils/presets';

const gridModeLabels: Record<GridMode, string> = {
  original: 'Original',
  transformed: 'Transformed',
  both: 'Both',
};

const Tooltip = ({ text }: { text: string }) => (
  <span className="tooltip-icon" title={text} aria-label={text}>
    i
  </span>
);

type SidebarProps = {
  matrix: Matrix;
  presetId: string | null;
  onPresetChange: (preset: Preset) => void;
  onMatrixChange: (matrix: Matrix) => void;
  determinant: number;
  t: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onTChange: (value: number) => void;
  probeVector: Vector2;
  transformedProbe: Vector2;
  onProbeChange: (vector: Vector2) => void;
  onPinVector: () => void;
  pinnedVectors: PinnedVector[];
  gridMode: GridMode;
  onGridModeChange: (mode: GridMode) => void;
  onResetCamera: () => void;
  presetDescription: string;
};

export function Sidebar({
  matrix,
  presetId,
  onPresetChange,
  onMatrixChange,
  determinant,
  t,
  isPlaying,
  onPlayPause,
  onTChange,
  probeVector,
  transformedProbe,
  onProbeChange,
  onPinVector,
  pinnedVectors,
  gridMode,
  onGridModeChange,
  onResetCamera,
  presetDescription,
}: SidebarProps) {
  const handleMatrixInput = (key: keyof Matrix) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(event.target.value);
    onMatrixChange({ ...matrix, [key]: Number.isFinite(value) ? value : 0 });
  };

  const handleVectorInput = (key: keyof Vector2) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(event.target.value);
    onProbeChange({ ...probeVector, [key]: Number.isFinite(value) ? value : 0 });
  };

  return (
    <aside className="sidebar">
      <div>
        <h1>Basis Playground</h1>
        <p className="footer-note">Explore how 2×2 matrices reshape the plane.</p>
      </div>

      <section>
        <p className="section-title">Preset transformations</p>
        <select
          className="control-input"
          value={presetId ?? 'custom'}
          onChange={(event) => {
            const preset = presets.find((item) => item.id === event.target.value) ?? presets.at(-1)!;
            onPresetChange(preset);
          }}
        >
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
        <div className="description-box">{presetDescription}</div>
      </section>

      <section>
        <p className="section-title">Matrix editor</p>
        <label>
          First column <Tooltip text="This column is where (1,0) goes after the transform." />
        </label>
        <div className="matrix-grid">
          <input type="number" value={matrix.a} step="0.1" onChange={handleMatrixInput('a')} />
          <input type="number" value={matrix.b} step="0.1" onChange={handleMatrixInput('b')} />
          <input type="number" value={matrix.c} step="0.1" onChange={handleMatrixInput('c')} />
          <input type="number" value={matrix.d} step="0.1" onChange={handleMatrixInput('d')} />
        </div>
        <label>
          Second column <Tooltip text="This column is where (0,1) goes after the transform." />
        </label>
      </section>

      <section>
        <p className="section-title">Determinant insight</p>
        <div
          className={`det-info ${determinant === 0 ? 'zero' : determinant < 0 ? 'negative' : ''}`}
        >
          <p>det(A) = {formatNumber(determinant)}</p>
          <p>Area scale = {formatNumber(Math.abs(determinant))}</p>
          {determinant < 0 && <p>Orientation flipped (reflection).</p>}
          {determinant === 0 ? (
            <p>
              Collapsed (not invertible).{' '}
              <span className="tooltip" title="det(A) = 0 means everything lies in a line. You can’t undo this transform.">
                det(A) = 0 means everything lies in a line. You can’t undo this transform.
              </span>
            </p>
          ) : (
            <p title="det(A) is how area scales. Negative det means it flips orientation.">
              det(A) is how area scales. Negative det means it flips orientation.
            </p>
          )}
        </div>
      </section>

      <section>
        <p className="section-title">Grid view</p>
        <div className="grid-toggle">
          {(Object.keys(gridModeLabels) as GridMode[]).map((mode) => (
            <button
              key={mode}
              className={gridMode === mode ? 'primary' : 'secondary'}
              type="button"
              onClick={() => onGridModeChange(mode)}
            >
              {gridModeLabels[mode]}
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="section-title">Animation</p>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button type="button" className="primary" onClick={onPlayPause}>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <span>t = {formatNumber(t, 2)}</span>
        </div>
        <input
          className="range-input"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={t}
          onChange={(event) => onTChange(Number.parseFloat(event.target.value))}
        />
      </section>

      <section>
        <p className="section-title">Vector probe</p>
        <div className="vector-inputs" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
          <label>
            x
            <input type="number" value={probeVector.x} step="0.1" onChange={handleVectorInput('x')} />
          </label>
          <label>
            y
            <input type="number" value={probeVector.y} step="0.1" onChange={handleVectorInput('y')} />
          </label>
        </div>
        <p>
          T(v) = ({formatNumber(transformedProbe.x)}, {formatNumber(transformedProbe.y)})
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="secondary" onClick={onPinVector}>
            Pin this vector
          </button>
        </div>
        {pinnedVectors.length > 0 && (
          <div className="pinned-vectors">
            <strong>Pinned comparisons</strong>
            {pinnedVectors.map((vector, index) => (
              <span key={`${vector.x}-${vector.y}-${index}`}>
                ({formatNumber(vector.x)}, {formatNumber(vector.y)}) → ({formatNumber(vector.Tx)}, {formatNumber(vector.Ty)})
              </span>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="section-title">Camera</p>
        <button type="button" className="secondary" onClick={onResetCamera}>
          Reset view
        </button>
      </section>
    </aside>
  );
}
