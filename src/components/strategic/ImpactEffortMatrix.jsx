import React, { useState } from 'react';

const QUADRANT_LABELS = [
  { x: 75, y: 75, label: 'Strategic Projects', color: '#007185', bg: '#E8F7FA' },
  { x: 25, y: 75, label: 'Quick Wins', color: '#067D62', bg: '#E8F5EE' },
  { x: 75, y: 25, label: 'Deprioritise', color: '#CC0C39', bg: '#FEF0EF' },
  { x: 25, y: 25, label: 'Fill-Ins', color: '#C7511F', bg: '#FFF8EE' }
];

/**
 * Impact-Effort 2x2 matrix — bubble chart with click-to-detail.
 * items: [{ id, name, impact (0-100), effort (0-100), category, description }]
 */
export default function ImpactEffortMatrix({ items = [], height = 400 }) {
  const [selected, setSelected] = useState(null);

  const CATEGORY_COLORS = {
    'quick-win': '#067D62',
    'strategic': '#007185',
    'fill-in': '#C7511F',
    'deprioritise': '#CC0C39'
  };

  return (
    <div style={{ display: 'flex', gap: '24px' }}>
      {/* Matrix SVG */}
      <div style={{ flex: 1 }}>
        <svg
          viewBox="0 0 400 400"
          style={{ width: '100%', maxWidth: height, height: height, userSelect: 'none' }}
        >
          {/* Quadrant backgrounds */}
          <rect x="0" y="0" width="200" height="200" fill="#E8F7FA" opacity={0.5} />
          <rect x="200" y="0" width="200" height="200" fill="#E8F5EE" opacity={0.5} />
          <rect x="0" y="200" width="200" height="200" fill="#FEF0EF" opacity={0.5} />
          <rect x="200" y="200" width="200" height="200" fill="#FFF8EE" opacity={0.5} />

          {/* Grid lines */}
          <line x1="200" y1="0" x2="200" y2="400" stroke="#DDD" strokeWidth="1" strokeDasharray="4 2" />
          <line x1="0" y1="200" x2="400" y2="200" stroke="#DDD" strokeWidth="1" strokeDasharray="4 2" />

          {/* Quadrant labels */}
          <text x="100" y="24" textAnchor="middle" fontSize="11" fontWeight="700" fill="#007185">Strategic Projects</text>
          <text x="300" y="24" textAnchor="middle" fontSize="11" fontWeight="700" fill="#067D62">Quick Wins</text>
          <text x="100" y="396" textAnchor="middle" fontSize="11" fontWeight="700" fill="#CC0C39">Deprioritise</text>
          <text x="300" y="396" textAnchor="middle" fontSize="11" fontWeight="700" fill="#C7511F">Fill-Ins</text>

          {/* Axis labels */}
          <text x="200" y="414" textAnchor="middle" fontSize="10" fill="#888">Effort (Low → High) →</text>
          <text x="-200" y="12" textAnchor="middle" fontSize="10" fill="#888" transform="rotate(-90)">Impact (Low → High) →</text>

          {/* Bubbles */}
          {items.map(item => {
            // effort: 0=left, 100=right → x = 10 + effort*3.8
            // impact: 0=bottom, 100=top → y = 390 - impact*3.8
            const cx = 10 + item.effort * 3.8;
            const cy = 390 - item.impact * 3.8;
            const color = CATEGORY_COLORS[item.category] || '#999';
            const isSelected = selected?.id === item.id;

            return (
              <g key={item.id} onClick={() => setSelected(isSelected ? null : item)} style={{ cursor: 'pointer' }}>
                <circle
                  cx={cx} cy={cy} r={isSelected ? 18 : 14}
                  fill={color} fillOpacity={isSelected ? 0.9 : 0.7}
                  stroke={isSelected ? color : '#FFF'} strokeWidth={isSelected ? 2 : 1}
                />
                <text x={cx} y={cy + 4} textAnchor="middle" fontSize="8" fontWeight="700" fill="#FFF">
                  {item.name.split(' ').slice(0, 2).join(' ')}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Detail panel */}
      <div style={{ width: '240px', flexShrink: 0 }}>
        {selected ? (
          <div className="amazon-card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: '#0F1111' }}>{selected.name}</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '3px', backgroundColor: CATEGORY_COLORS[selected.category] + '22', color: CATEGORY_COLORS[selected.category], fontWeight: 700, textTransform: 'uppercase' }}>
                {selected.category?.replace('-', ' ')}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#565959', lineHeight: 1.6, marginBottom: '12px' }}>
              {selected.description}
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
              <div>
                <div style={{ color: '#999' }}>Impact</div>
                <div style={{ fontWeight: 700, color: '#0F1111' }}>{selected.impact}/100</div>
              </div>
              <div>
                <div style={{ color: '#999' }}>Effort</div>
                <div style={{ fontWeight: 700, color: '#0F1111' }}>{selected.effort}/100</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '16px', color: '#999', fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>
            Click an initiative on the matrix to see details.
          </div>
        )}
      </div>
    </div>
  );
}
