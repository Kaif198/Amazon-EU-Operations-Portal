import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, Users, Building2, Route,
  Lightbulb, ChevronLeft, ChevronRight
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/forecast', label: 'Volume Forecast', icon: TrendingUp },
  { path: '/capacity', label: 'Capacity Planning', icon: Users },
  { path: '/stations', label: 'Station Health', icon: Building2 },
  { path: '/routes', label: 'Route Optimisation', icon: Route },
  { path: '/insights', label: 'Strategic Insights', icon: Lightbulb },
];

/**
 * Left sidebar navigation with collapsible state.
 * Background: #232F3E. Active items: orange left border + orange text.
 */
export default function Sidebar({ collapsed, onToggle }) {
  const width = collapsed ? 64 : 240;

  return (
    <aside style={{
      position: 'fixed',
      top: '60px',
      left: 0,
      bottom: 0,
      width: `${width}px`,
      backgroundColor: '#232F3E',
      borderRight: '1px solid #3D4F5F',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.3s ease',
      overflow: 'hidden',
      zIndex: 900
    }}>
      {/* Navigation items */}
      <nav style={{ flex: 1, paddingTop: '8px' }}>
        {NAV_ITEMS.map(({ path, label, icon: Icon, exact }) => (
          <NavLink
            key={path}
            to={path}
            end={exact}
            className={({ isActive }) =>
              `sidebar-nav-item${isActive ? ' active' : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={18} style={{ flexShrink: 0 }} />
            {!collapsed && (
              <span style={{ opacity: collapsed ? 0 : 1, transition: 'opacity 0.2s ease', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: '#3D4F5F', margin: '8px 0' }} />

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-end',
          padding: '12px 16px',
          backgroundColor: 'transparent',
          border: 'none',
          color: '#999',
          cursor: 'pointer',
          width: '100%',
          transition: 'color 0.15s',
          marginBottom: '8px'
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#FFF'}
        onMouseLeave={e => e.currentTarget.style.color = '#999'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRight size={18} />
          : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <span>Collapse</span>
              <ChevronLeft size={18} />
            </div>
          )
        }
      </button>

      {/* Creator Credit */}
      <div style={{
        marginTop: 'auto',
        padding: collapsed ? '16px 0' : '16px',
        fontSize: '11px',
        color: '#6B7280',
        textAlign: 'center',
        borderTop: '1px solid #3D4F5F',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        fontWeight: 500
      }}>
        {collapsed ? 'MK' : 'Created by Mohammed Kaif Ahmed'}
      </div>
    </aside>
  );
}
