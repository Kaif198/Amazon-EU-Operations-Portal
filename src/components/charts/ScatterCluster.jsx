import React, { useState } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import { formatPct } from '../../utils/formatters.js';

const CLUSTER_COLORS = {
  'Elite': '#067D62',
  'Standard': '#007185',
  'Underperforming': '#C7511F',
  'Critical': '#CC0C39'
};

/**
 * Scatter plot colored by cluster assignment.
 * Shows route efficiency clusters (stops/hour vs success rate).
 */
export default function ScatterCluster({ data = [], height = 360 }) {
  const [hovered, setHovered] = useState(null);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div style={{ background: '#FFF', border: '1px solid #DDD', borderRadius: '4px', padding: '8px 12px', fontSize: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ fontWeight: 700, color: CLUSTER_COLORS[d.cluster] || '#333', marginBottom: '4px' }}>{d.cluster}</div>
        <div>Stops/hour: <strong>{d.stopsPerHour?.toFixed(1)}</strong></div>
        <div>Success rate: <strong>{formatPct(d.successRate)}</strong></div>
        {d.distance && <div>Avg distance: <strong>{d.distance?.toFixed(0)} km</strong></div>}
        {d.stationCode && <div style={{ color: '#999', marginTop: '4px' }}>Station: {d.stationCode}</div>}
      </div>
    );
  };

  // Centroids — larger markers
  const centroids = ['Elite', 'Standard', 'Underperforming', 'Critical'].map(cluster => {
    const clusterData = data.filter(d => d.cluster === cluster);
    if (clusterData.length === 0) return null;
    const avgX = clusterData.reduce((s, d) => s + d.stopsPerHour, 0) / clusterData.length;
    const avgY = clusterData.reduce((s, d) => s + d.successRate, 0) / clusterData.length;
    return { cluster, stopsPerHour: avgX, successRate: avgY, isCentroid: true };
  }).filter(Boolean);

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 16, right: 24, bottom: 24, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
          <XAxis
            dataKey="stopsPerHour"
            name="Stops/hour"
            type="number"
            domain={['auto', 'auto']}
            tick={{ fontSize: 11, fill: '#888' }}
            axisLine={{ stroke: '#DDD' }}
            tickLine={false}
            label={{ value: 'Stops per Hour', position: 'insideBottom', offset: -16, fontSize: 11, fill: '#888' }}
          />
          <YAxis
            dataKey="successRate"
            name="Success rate"
            type="number"
            domain={[0.85, 1.01]}
            tickFormatter={v => formatPct(v, 0)}
            tick={{ fontSize: 11, fill: '#888' }}
            axisLine={false}
            tickLine={false}
            width={44}
            label={{ value: 'Delivery Success Rate', angle: -90, position: 'insideLeft', offset: 12, fontSize: 11, fill: '#888' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={data} shape="circle">
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={CLUSTER_COLORS[entry.cluster] || '#999'}
                fillOpacity={0.7}
                r={5}
              />
            ))}
          </Scatter>
          {/* Centroid markers */}
          <Scatter data={centroids} shape="diamond">
            {centroids.map((c, i) => (
              <Cell key={i} fill={CLUSTER_COLORS[c.cluster]} fillOpacity={1} r={8} stroke="#FFF" strokeWidth={2} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '8px', fontSize: '12px' }}>
        {Object.entries(CLUSTER_COLORS).map(([cluster, color]) => {
          const count = data.filter(d => d.cluster === cluster).length;
          return (
            <div key={cluster} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', backgroundColor: color, borderRadius: '50%' }} />
              <span style={{ color: '#555' }}>{cluster} ({count} routes)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
