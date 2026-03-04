import React from 'react';

/**
 * Simple SVG network diagram showing driver rebalancing flows between stations.
 * Arrows from surplus stations to deficit stations.
 */
export default function NetworkDiagram({ transfers = [], width = 600, height = 300 }) {
  if (!transfers || transfers.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '13px' }}>
        No rebalancing transfers recommended for the current period.
      </div>
    );
  }

  // Simple left-right layout: surplus on left, deficit on right
  const surplus = [...new Set(transfers.map(t => t.from))];
  const deficit = [...new Set(transfers.map(t => t.to))];

  const nodeRadius = 30;
  const leftX = 120;
  const rightX = width - 120;

  const surplusNodes = surplus.map((name, i) => ({
    id: name,
    x: leftX,
    y: 60 + (i * ((height - 80) / Math.max(surplus.length - 1, 1))),
    type: 'surplus'
  }));

  const deficitNodes = deficit.map((name, i) => ({
    id: name,
    x: rightX,
    y: 60 + (i * ((height - 80) / Math.max(deficit.length - 1, 1))),
    type: 'deficit'
  }));

  const allNodes = [...surplusNodes, ...deficitNodes];

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ maxHeight: height }}>
      <defs>
        <marker id="arrow-green" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#067D62" />
        </marker>
      </defs>

      {/* Transfer arrows */}
      {transfers.map((t, i) => {
        const fromNode = allNodes.find(n => n.id === t.from);
        const toNode = allNodes.find(n => n.id === t.to);
        if (!fromNode || !toNode) return null;

        const midX = (fromNode.x + toNode.x) / 2;
        const midY = (fromNode.y + toNode.y) / 2;

        return (
          <g key={i}>
            <line
              x1={fromNode.x + nodeRadius}
              y1={fromNode.y}
              x2={toNode.x - nodeRadius}
              y2={toNode.y}
              stroke="#067D62"
              strokeWidth={2 + Math.min(t.drivers / 3, 4)}
              strokeDasharray="4 2"
              markerEnd="url(#arrow-green)"
              opacity={0.7}
            />
            <rect
              x={midX - 22}
              y={midY - 10}
              width={44}
              height={20}
              rx={3}
              fill="#FFF"
              stroke="#DDD"
            />
            <text x={midX} y={midY + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#067D62">
              {t.drivers}d
            </text>
          </g>
        );
      })}

      {/* Nodes */}
      {allNodes.map(node => (
        <g key={node.id}>
          <circle
            cx={node.x}
            cy={node.y}
            r={nodeRadius}
            fill={node.type === 'surplus' ? '#E8F4FD' : '#FDECEA'}
            stroke={node.type === 'surplus' ? '#007185' : '#CC0C39'}
            strokeWidth={2}
          />
          <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="700" fill={node.type === 'surplus' ? '#007185' : '#CC0C39'}>
            {node.id}
          </text>
          <text x={node.x} y={node.y + nodeRadius + 14} textAnchor="middle" fontSize="10" fill="#565959">
            {node.type === 'surplus' ? 'Surplus' : 'Deficit'}
          </text>
        </g>
      ))}

      {/* Labels */}
      <text x={leftX} y={18} textAnchor="middle" fontSize="12" fontWeight="700" fill="#007185">Surplus Stations</text>
      <text x={rightX} y={18} textAnchor="middle" fontSize="12" fontWeight="700" fill="#CC0C39">Deficit Stations</text>
    </svg>
  );
}
