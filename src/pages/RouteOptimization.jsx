import React, { useMemo, useState } from 'react';
import PageTransition from '../components/layout/PageTransition.jsx';
import AmazonButton from '../components/common/AmazonButton.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import ScatterCluster from '../components/charts/ScatterCluster.jsx';
import ImpactEffortMatrix from '../components/strategic/ImpactEffortMatrix.jsx';
import { RouteClusterer } from '../ml/routeEfficiency.js';
import { STATIONS } from '../data/stationData.js';
import { formatNumber, formatPct } from '../utils/formatters.js';
import { generateImpactEffortItems } from '../utils/strategicFrameworks.js';

const CLUSTER_COLORS = {
  'Elite': '#067D62',
  'Standard': '#007185',
  'Underperforming': '#C7511F',
  'Critical': '#CC0C39'
};

export default function RouteOptimization() {
  const [selectedCountry, setSelectedCountry] = useState('All');

  const clusterer = useMemo(() => new RouteClusterer(4), []);
  const allRoutes = useMemo(() => clusterer.generateRouteData(), [clusterer]);
  const clusteredRoutes = useMemo(() => clusterer.kMeans(allRoutes), [clusterer, allRoutes]);
  const clusterStats = useMemo(() => clusterer.getClusterStats(clusteredRoutes), [clusterer, clusteredRoutes]);
  const impactItems = useMemo(() => generateImpactEffortItems(), []);

  const countries = ['All', ...new Set(STATIONS.map(s => s.country))];

  const filteredRoutes = selectedCountry === 'All'
    ? clusteredRoutes
    : clusteredRoutes.filter(r => {
        const station = STATIONS.find(s => s.id === r.stationId);
        return station?.country === selectedCountry;
      });

  const totalRoutes = clusteredRoutes.length;

  return (
    <PageTransition>
      <div style={{ padding: '24px', backgroundColor: '#EAEDED', minHeight: '100%' }}>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F1111', margin: 0 }}>Route Optimisation</h1>
            <div style={{ fontSize: '13px', color: '#565959', marginTop: '4px' }}>
              K-Means clustering of {formatNumber(totalRoutes)} delivery routes across {STATIONS.length} EU stations
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', color: '#565959' }}>Filter by country:</label>
            <select
              value={selectedCountry}
              onChange={e => setSelectedCountry(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #DDD', borderRadius: '4px', fontSize: '13px', backgroundColor: '#FFF' }}
            >
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Cluster summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
          {clusterStats.map(cluster => (
            <div key={cluster.label} className="amazon-card" style={{ padding: '16px', borderTop: `3px solid ${CLUSTER_COLORS[cluster.label]}` }}>
              <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <StatusBadge status={cluster.label} />
                <span style={{ fontSize: '12px', color: '#999', marginLeft: 'auto' }}>{cluster.pct}% of routes</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#999' }}>Stops/hour</div>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>{cluster.avgStopsPerHour}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#999' }}>Success rate</div>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>{formatPct(cluster.avgSuccessRate)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#999' }}>Avg distance</div>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>{cluster.avgDistance} km</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#999' }}>Count</div>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>{formatNumber(cluster.count)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Scatter plot */}
        <div className="amazon-card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div className="section-header">Route Efficiency Scatter — Stops/Hour vs Success Rate</div>
          <div style={{ fontSize: '12px', color: '#565959', marginBottom: '12px' }}>
            Each point represents one delivery route. Diamond markers show cluster centroids.
          </div>
          <ScatterCluster data={filteredRoutes} height={380} />
        </div>

        {/* Cluster insights */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          {clusterStats.map(cluster => (
            <div key={cluster.label} className="amazon-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: CLUSTER_COLORS[cluster.label] }} />
                <span style={{ fontSize: '14px', fontWeight: 700 }}>{cluster.label} Tier</span>
                <span style={{ fontSize: '12px', color: '#999', marginLeft: 'auto' }}>{cluster.count} routes ({cluster.pct}%)</span>
              </div>
              <div style={{ fontSize: '12px', color: '#565959', lineHeight: 1.6, marginBottom: '10px' }}>
                {cluster.insight}
              </div>
              <div className="insight-box" style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#C7511F', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recommendation</div>
                <div style={{ fontSize: '12px' }}>{cluster.recommendation}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Impact-Effort Matrix */}
        <div className="amazon-card" style={{ padding: '20px' }}>
          <div className="section-header">Improvement Initiative Prioritisation Matrix</div>
          <div style={{ fontSize: '12px', color: '#565959', marginBottom: '16px' }}>
            Click any initiative bubble to see details. Upper-right quadrant = highest priority for implementation.
          </div>
          <ImpactEffortMatrix items={impactItems} height={420} />
        </div>
      </div>
    </PageTransition>
  );
}
