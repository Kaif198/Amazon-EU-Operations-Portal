import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const ROUTE_LABELS = {
  '/': 'Dashboard',
  '/forecast': 'Volume Forecast',
  '/capacity': 'Capacity Planning',
  '/stations': 'Station Health',
  '/routes': 'Route Optimisation',
  '/insights': 'Strategic Insights',
};

/**
 * Breadcrumb trail — "Central Operations > Dashboard > All Stations"
 */
export default function Breadcrumb({ stationName }) {
  const location = useLocation();
  const pageLabel = ROUTE_LABELS[location.pathname] || 'Page';

  const crumbs = [
    { label: 'Central Operations', path: null },
    { label: pageLabel, path: null },
    stationName ? { label: stationName, path: null } : null
  ].filter(Boolean);

  return (
    <div style={{
      padding: '8px 24px',
      backgroundColor: '#FFF',
      borderBottom: '1px solid #EEE',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '13px',
      color: '#565959'
    }}>
      {crumbs.map((crumb, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight size={12} color="#999" />}
          {crumb.path ? (
            <Link to={crumb.path} style={{ color: '#007185', textDecoration: 'none' }}>
              {crumb.label}
            </Link>
          ) : (
            <span style={{ color: i === crumbs.length - 1 ? '#0F1111' : '#565959', fontWeight: i === crumbs.length - 1 ? 600 : 400 }}>
              {crumb.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
