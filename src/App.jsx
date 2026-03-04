import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/layout/Navbar.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import Breadcrumb from './components/layout/Breadcrumb.jsx';
import { MetricCardSkeleton, ChartSkeleton } from './components/common/SkeletonLoader.jsx';

// Lazy-load pages for performance
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const VolumeForecasting = lazy(() => import('./pages/VolumeForecasting.jsx'));
const CapacityPlanning = lazy(() => import('./pages/CapacityPlanning.jsx'));
const StationHealth = lazy(() => import('./pages/StationHealth.jsx'));
const RouteOptimization = lazy(() => import('./pages/RouteOptimization.jsx'));
const StrategicInsights = lazy(() => import('./pages/StrategicInsights.jsx'));

function PageLoader() {
  return (
    <div style={{ padding: '24px', backgroundColor: '#EAEDED', minHeight: '100vh' }}>
      <div style={{ height: '32px', width: '280px', marginBottom: '24px', background: '#E0E0E0', borderRadius: '4px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[...Array(5)].map((_, i) => <MetricCardSkeleton key={i} />)}
      </div>
      <ChartSkeleton height="320px" />
    </div>
  );
}

function AppContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedStation, setSelectedStation] = useState('all');
  const location = useLocation();

  const contentStyle = {
    marginLeft: sidebarCollapsed ? '64px' : '240px',
    paddingTop: '60px',
    minHeight: '100vh',
    transition: 'margin-left 0.3s ease',
    backgroundColor: '#EAEDED'
  };

  return (
    <>
      <Navbar
        selectedStation={selectedStation}
        onStationChange={setSelectedStation}
        alertCount={7}
      />
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
      />

      <main style={contentStyle}>
        <Breadcrumb />
        <Suspense fallback={<PageLoader />}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/forecast" element={<VolumeForecasting />} />
              <Route path="/capacity" element={<CapacityPlanning />} />
              <Route path="/stations" element={<StationHealth />} />
              <Route path="/routes" element={<RouteOptimization />} />
              <Route path="/insights" element={<StrategicInsights />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
