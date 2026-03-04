import React, { useState } from 'react';

/**
 * 5x5 risk heatmap — X = Likelihood, Y = Impact.
 * Risks plotted as circles, top-right quadrant highlighted in red.
 */
export default function RiskHeatmap({ risks = [], height = 380 }) {
  const [selected, setSelected] = useState(null);

  // Color gradient for grid cells
  function getCellColor(likelihood, impact) {
    const score = likelihood * impact;
    if (score >= 16) return '#FDECEA';
    if (score >= 9) return '#FFF3CD';
    if (score >= 4) return '#FFFBF0';
    return '#F0FFF4';
  }

  const CELL_SIZE = 60;
  const OFFSET_X = 60;
  const OFFSET_Y = 20;
  const GRID = 5;

  return (
    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
      <div>
        <svg
          width={OFFSET_X + GRID * CELL_SIZE + 20}
          height={OFFSET_Y + GRID * CELL_SIZE + 50}
          style={{ overflow: 'visible' }}
        >
          {/* Grid cells */}
          {Array.from({ length: GRID }, (_, row) =>
            Array.from({ length: GRID }, (_, col) => {
              const likelihood = col + 1;
              const impact = GRID - row;
              const x = OFFSET_X + col * CELL_SIZE;
              const y = OFFSET_Y + row * CELL_SIZE;
              return (
                <rect
                  key={`${row}-${col}`}
                  x={x} y={y}
                  width={CELL_SIZE - 2}
                  height={CELL_SIZE - 2}
                  fill={getCellColor(likelihood, impact)}
                  stroke="#DDD"
                  strokeWidth={1}
                />
              );
            })
          )}

          {/* Risk bubbles */}
          {risks.map(risk => {
            const cx = OFFSET_X + (risk.likelihood - 0.5) * CELL_SIZE;
            const cy = OFFSET_Y + (GRID - risk.impact + 0.5) * CELL_SIZE;
            const score = risk.likelihood * risk.impact;
            const isSelected = selected?.id === risk.id;

            const color = score >= 16 ? '#CC0C39' : score >= 9 ? '#C7511F' : score >= 4 ? '#F0A500' : '#067D62';

            return (
              <g key={risk.id} onClick={() => setSelected(isSelected ? null : risk)} style={{ cursor: 'pointer' }}>
                <circle
                  cx={cx} cy={cy}
                  r={isSelected ? 20 : 16}
                  fill={color}
                  fillOpacity={isSelected ? 0.9 : 0.75}
                  stroke={isSelected ? color : '#FFF'}
                  strokeWidth={2}
                />
                <text x={cx} y={cy + 3} textAnchor="middle" fontSize="8" fontWeight="700" fill="#FFF">
                  {risk.id}
                </text>
              </g>
            );
          })}

          {/* X axis labels */}
          {Array.from({ length: GRID }, (_, i) => (
            <text key={i} x={OFFSET_X + (i + 0.5) * CELL_SIZE} y={OFFSET_Y + GRID * CELL_SIZE + 16} textAnchor="middle" fontSize="11" fill="#888">
              {i + 1}
            </text>
          ))}

          {/* Y axis labels */}
          {Array.from({ length: GRID }, (_, i) => (
            <text key={i} x={OFFSET_X - 8} y={OFFSET_Y + (i + 0.5) * CELL_SIZE + 4} textAnchor="end" fontSize="11" fill="#888">
              {GRID - i}
            </text>
          ))}

          {/* Axis titles */}
          <text x={OFFSET_X + (GRID * CELL_SIZE) / 2} y={OFFSET_Y + GRID * CELL_SIZE + 34} textAnchor="middle" fontSize="11" fontWeight="700" fill="#555">
            Likelihood →
          </text>
          <text x={12} y={OFFSET_Y + (GRID * CELL_SIZE) / 2} textAnchor="middle" fontSize="11" fontWeight="700" fill="#555" transform={`rotate(-90, 12, ${OFFSET_Y + (GRID * CELL_SIZE) / 2})`}>
            Impact →
          </text>
        </svg>
      </div>

      {/* Risk legend + detail panel */}
      <div style={{ flex: 1, minWidth: '200px' }}>
        {/* Risk legend */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: '#0F1111' }}>Risk Register</div>
          {risks.map(risk => {
            const score = risk.likelihood * risk.impact;
            const color = score >= 16 ? '#CC0C39' : score >= 9 ? '#C7511F' : score >= 4 ? '#F0A500' : '#067D62';
            return (
              <div
                key={risk.id}
                onClick={() => setSelected(selected?.id === risk.id ? null : risk)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: selected?.id === risk.id ? '#FFFBF0' : 'transparent',
                  marginBottom: '2px'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F5F9FE'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = selected?.id === risk.id ? '#FFFBF0' : 'transparent'}
              >
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: '#0F1111', fontWeight: selected?.id === risk.id ? 700 : 400 }}>{risk.id}: {risk.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#999' }}>L{risk.likelihood}×I{risk.impact}</span>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="amazon-card" style={{ padding: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>{selected.name}</div>
            <div style={{ fontSize: '12px', color: '#565959', lineHeight: 1.5, marginBottom: '8px' }}>
              <strong>Mitigation:</strong> {selected.mitigation}
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
              <div><span style={{ color: '#999' }}>Score: </span><strong>{selected.likelihood * selected.impact}/25</strong></div>
              <div><span style={{ color: '#999' }}>L: </span><strong>{selected.likelihood}</strong></div>
              <div><span style={{ color: '#999' }}>I: </span><strong>{selected.impact}</strong></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
