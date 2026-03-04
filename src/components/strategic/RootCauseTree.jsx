import React, { useState } from 'react';
import { ChevronRight, ChevronDown, AlertTriangle, AlertCircle, Info } from 'lucide-react';

function TreeNode({ node, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  const severityColor = {
    high: '#CC0C39',
    medium: '#C7511F',
    low: '#007185',
    action: '#067D62'
  }[node.severity] || '#565959';

  const SeverityIcon = node.severity === 'high' ? AlertCircle
    : node.severity === 'medium' ? AlertTriangle
    : Info;

  return (
    <div style={{ marginLeft: depth > 0 ? '24px' : 0 }}>
      <div
        onClick={() => hasChildren && setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          padding: '8px 12px',
          borderRadius: '4px',
          cursor: hasChildren ? 'pointer' : 'default',
          backgroundColor: depth === 0 ? '#FFF8F0' : '#FFF',
          border: `1px solid ${depth === 0 ? '#FFD14D' : '#EEE'}`,
          marginBottom: '4px',
          transition: 'background 0.1s'
        }}
        onMouseEnter={e => hasChildren && (e.currentTarget.style.backgroundColor = depth === 0 ? '#FFF3D6' : '#F5F9FE')}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = depth === 0 ? '#FFF8F0' : '#FFF'}
      >
        {/* Expand icon */}
        <div style={{ marginTop: '2px', flexShrink: 0 }}>
          {hasChildren
            ? expanded ? <ChevronDown size={14} color="#999" /> : <ChevronRight size={14} color="#999" />
            : <div style={{ width: 14 }} />
          }
        </div>

        {/* Severity icon */}
        <SeverityIcon size={14} color={severityColor} style={{ marginTop: '2px', flexShrink: 0 }} />

        {/* Content */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: depth === 0 ? 700 : 600, color: '#0F1111' }}>
            {node.label}
          </div>
          {node.description && (
            <div style={{ fontSize: '12px', color: '#565959', marginTop: '2px' }}>{node.description}</div>
          )}
          {node.action && (
            <div style={{ fontSize: '12px', color: '#067D62', marginTop: '4px', fontStyle: 'italic' }}>
              Recommended: {node.action}
            </div>
          )}
        </div>
      </div>

      {/* Connector line + children */}
      {hasChildren && expanded && (
        <div style={{ borderLeft: '2px dashed #DDD', marginLeft: '20px', paddingLeft: '4px' }}>
          {node.children.map((child, i) => (
            <TreeNode key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Root cause analysis tree — hierarchical visualization of anomaly investigation.
 * Each node: { label, description, severity, action, children }
 */
export default function RootCauseTree({ title, rootNode }) {
  if (!rootNode) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
        No significant anomalies detected for this station in the current period.
      </div>
    );
  }

  return (
    <div>
      {title && <div className="section-header">{title}</div>}
      <TreeNode node={rootNode} depth={0} />
    </div>
  );
}
