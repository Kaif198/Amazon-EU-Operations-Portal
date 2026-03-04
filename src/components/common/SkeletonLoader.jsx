import React from 'react';

/**
 * Amazon-style skeleton shimmer loader components.
 * Shows for at least 800ms before actual content appears.
 */

function Skeleton({ width = '100%', height = '16px', borderRadius = '4px', style = {} }) {
  return (
    <div
      className="skeleton-shimmer"
      style={{ width, height, borderRadius, ...style }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="amazon-card" style={{ padding: '16px' }}>
      <Skeleton height="13px" width="60%" />
      <Skeleton height="28px" width="45%" style={{ marginTop: '8px' }} />
      <Skeleton height="12px" width="70%" style={{ marginTop: '8px' }} />
    </div>
  );
}

export function TableRowSkeleton({ columns = 6 }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} style={{ padding: '10px 12px' }}>
          <Skeleton height="13px" width={i === 0 ? '80%' : `${50 + Math.random() * 40}%`} />
        </td>
      ))}
    </tr>
  );
}

export function ChartSkeleton({ height = '300px' }) {
  return (
    <div className="amazon-card" style={{ padding: '16px' }}>
      <Skeleton height="16px" width="40%" style={{ marginBottom: '16px' }} />
      <Skeleton height={height} borderRadius="4px" />
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="amazon-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <Skeleton height="13px" width="55%" />
      <Skeleton height="28px" width="40%" />
      <Skeleton height="12px" width="65%" />
    </div>
  );
}

export default Skeleton;
