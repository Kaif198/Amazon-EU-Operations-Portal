import React from 'react';

const BADGE_STYLES = {
  'Healthy':      { background: '#D4EDDA', color: '#067D62' },
  'At Risk':      { background: '#FFF3CD', color: '#C7511F' },
  'Critical':     { background: '#FDECEA', color: '#CC0C39' },
  'Under Review': { background: '#D1ECF1', color: '#0066B2' },
  'Elite':        { background: '#D4EDDA', color: '#067D62' },
  'Standard':     { background: '#E8F4FD', color: '#007185' },
  'Underperforming': { background: '#FFF3CD', color: '#C7511F' },
  'P1':           { background: '#FDECEA', color: '#CC0C39' },
  'P2':           { background: '#FFF3CD', color: '#C7511F' },
  'P3':           { background: '#E8F4FD', color: '#007185' },
  'High':         { background: '#FDECEA', color: '#CC0C39' },
  'Medium':       { background: '#FFF3CD', color: '#C7511F' },
  'Low':          { background: '#E8F8F3', color: '#067D62' },
  'Confirmed':    { background: '#FDECEA', color: '#CC0C39' },
  'Potential':    { background: '#FFF3CD', color: '#C7511F' },
};

/**
 * Inline status badge component.
 *
 * status — one of: 'Healthy', 'At Risk', 'Critical', 'Under Review', 'Elite',
 *          'Standard', 'Underperforming', 'P1', 'P2', 'P3', 'High', 'Medium', 'Low'
 */
export default function StatusBadge({ status, size = 'sm' }) {
  const style = BADGE_STYLES[status] || { background: '#EEE', color: '#555' };
  const fontSize = size === 'sm' ? '11px' : '13px';
  const padding = size === 'sm' ? '2px 8px' : '4px 10px';

  return (
    <span style={{
      display: 'inline-block',
      padding,
      borderRadius: '4px',
      fontSize,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.4px',
      whiteSpace: 'nowrap',
      ...style
    }}>
      {status}
    </span>
  );
}
