import React, { useState } from 'react';
import { formatPct, formatNumber } from '../../utils/formatters.js';

/**
 * Capacity heatmap — rows = stations, columns = days.
 * Cells colored by utilization: green <75%, amber 75-90%, red >90%.
 */
export default function HeatmapGrid({ data = [], rowLabels = [], colLabels = [], title }) {
  const [tooltip, setTooltip] = useState(null);

  // data: rows (stations) × cols (days) — array of arrays
  // each cell: { utilization, forecasted, capacity, gap }

  function getCellColor(utilization) {
    if (utilization === null || utilization === undefined) return '#F5F5F5';
    if (utilization >= 0.95) return '#CC0C39';
    if (utilization >= 0.90) return '#E8694A';
    if (utilization >= 0.85) return '#C7511F';
    if (utilization >= 0.75) return '#F0A500';
    if (utilization >= 0.65) return '#8BC34A';
    return '#067D62';
  }

  function getCellTextColor(utilization) {
    if (!utilization) return '#555';
    if (utilization >= 0.85) return '#FFF';
    return '#333';
  }

  return (
    <div style={{ position: 'relative' }}>
      {title && <div className="section-header">{title}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: '2px', fontSize: '11px' }}>
          <thead>
            <tr>
              <th style={{ padding: '6px 8px', textAlign: 'left', color: '#565959', fontWeight: 700, minWidth: '160px', background: 'transparent' }}>
                Station
              </th>
              {colLabels.map((label, i) => (
                <th key={i} style={{ padding: '6px 8px', textAlign: 'center', color: '#565959', fontWeight: 700, minWidth: '72px', background: 'transparent' }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, ri) => (
              <tr key={ri}>
                <td style={{ padding: '4px 8px', fontWeight: 600, color: '#0F1111', whiteSpace: 'nowrap', fontSize: '12px' }}>
                  {rowLabels[ri] || `Row ${ri}`}
                </td>
                {row.map((cell, ci) => {
                  const u = cell?.utilization;
                  return (
                    <td
                      key={ci}
                      onMouseEnter={e => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({ cell, ri, ci, x: rect.left, y: rect.top });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        backgroundColor: getCellColor(u),
                        color: getCellTextColor(u),
                        padding: '8px 4px',
                        textAlign: 'center',
                        borderRadius: '2px',
                        cursor: 'default',
                        minWidth: '72px',
                        fontWeight: 600,
                        transition: 'opacity 0.1s',
                        opacity: tooltip && (tooltip.ri !== ri || tooltip.ci !== ci) ? 0.85 : 1
                      }}
                    >
                      {u !== null && u !== undefined ? formatPct(u, 0) : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px', fontSize: '11px', color: '#565959' }}>
        <span style={{ fontWeight: 700 }}>Utilisation:</span>
        {[
          { label: '<65%', color: '#067D62' },
          { label: '65-75%', color: '#8BC34A' },
          { label: '75-85%', color: '#F0A500' },
          { label: '85-90%', color: '#C7511F' },
          { label: '90-95%', color: '#E8694A' },
          { label: '>95%', color: '#CC0C39' },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: color, borderRadius: '2px' }} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && tooltip.cell && (
        <div style={{
          position: 'fixed',
          top: tooltip.y - 80,
          left: tooltip.x + 40,
          backgroundColor: '#FFF',
          border: '1px solid #DDD',
          borderRadius: '4px',
          padding: '8px 12px',
          fontSize: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          zIndex: 9999,
          pointerEvents: 'none',
          minWidth: '160px'
        }}>
          <div style={{ fontWeight: 700, marginBottom: '4px', color: '#0F1111' }}>
            {colLabels[tooltip.ci]}
          </div>
          {tooltip.cell.forecasted !== undefined && (
            <div>Forecasted: <strong>{formatNumber(Math.round(tooltip.cell.forecasted))}</strong></div>
          )}
          {tooltip.cell.capacity !== undefined && (
            <div>Capacity: <strong>{formatNumber(tooltip.cell.capacity)}</strong></div>
          )}
          {tooltip.cell.gap !== undefined && (
            <div style={{ color: tooltip.cell.gap < 0 ? '#CC0C39' : '#067D62' }}>
              Gap: <strong>{tooltip.cell.gap > 0 ? '+' : ''}{formatNumber(Math.round(tooltip.cell.gap))}</strong>
            </div>
          )}
          <div>Utilisation: <strong style={{ color: tooltip.cell.utilization >= 0.90 ? '#CC0C39' : tooltip.cell.utilization >= 0.75 ? '#C7511F' : '#067D62' }}>
            {formatPct(tooltip.cell.utilization)}
          </strong></div>
        </div>
      )}
    </div>
  );
}
