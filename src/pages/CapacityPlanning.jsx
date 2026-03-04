import React, { useMemo, useState } from 'react';
import PageTransition from '../components/layout/PageTransition.jsx';
import MetricCard from '../components/common/MetricCard.jsx';
import AmazonButton from '../components/common/AmazonButton.jsx';
import HeatmapGrid from '../components/charts/HeatmapGrid.jsx';
import NetworkDiagram from '../components/charts/NetworkDiagram.jsx';
import WhatIfSimulator from '../components/strategic/WhatIfSimulator.jsx';
import { STATIONS } from '../data/stationData.js';
import { CapacityOptimizer } from '../ml/capacityOptimizer.js';
import { formatNumber, formatPct, formatEUR } from '../utils/formatters.js';
import { mean } from '../utils/calculations.js';

// Simulate 7-day forecasted volumes with slight growth over baseline
function generateForecastedVolumes() {
  const DOW_MULT = [0.72, 1.12, 1.05, 1.02, 1.08, 0.88, 0.78];
  const result = {};
  STATIONS.forEach(s => {
    result[s.id] = Array.from({ length: 7 }, (_, i) => {
      const dow = (1 + i) % 7;
      return Math.round(s.operational.avg_daily_volume * DOW_MULT[dow] * (1.02 + i * 0.003));
    });
  });
  return result;
}

export default function CapacityPlanning() {
  const [selectedSimStation, setSelectedSimStation] = useState(STATIONS[0].id);

  const forecastedVolumes = useMemo(() => generateForecastedVolumes(), []);
  const optimizer = useMemo(() => new CapacityOptimizer(), []);
  const { dailyPlans, rebalancing, costSummary } = useMemo(
    () => optimizer.optimize(forecastedVolumes),
    [optimizer, forecastedVolumes]
  );

  const heatmapData = useMemo(() => optimizer.buildHeatmapData(dailyPlans), [optimizer, dailyPlans]);
  const rowLabels = STATIONS.map(s => s.name);
  const colLabels = dailyPlans.map(d => d.dayLabel);

  const totalForecastedToday = dailyPlans[0]?.totalForecasted ?? 0;
  const totalCapacityNetwork = dailyPlans[0]?.totalCapacity ?? 1;
  const networkUtilization = totalForecastedToday / totalCapacityNetwork;

  const criticalStations = dailyPlans[0]?.stationPlans.filter(p => p.status === 'critical') ?? [];
  const warningStations = dailyPlans[0]?.stationPlans.filter(p => p.status === 'warning') ?? [];

  const simStation = STATIONS.find(s => s.id === selectedSimStation);

  // Network transfers for diagram
  const networkTransfers = rebalancing.map(r => ({
    from: r.fromStation.code,
    to: r.toStation.code,
    drivers: r.drivers
  }));

  return (
    <PageTransition>
      <div style={{ padding: '24px', backgroundColor: '#EAEDED', minHeight: '100%' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F1111', margin: 0 }}>Capacity Planning</h1>
          <div style={{ fontSize: '13px', color: '#565959', marginTop: '4px' }}>
            7-day capacity-demand gap analysis across all EU delivery stations
          </div>
        </div>

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <MetricCard
            label="Network Demand (D+0)"
            value={totalForecastedToday}
            formatter={v => formatNumber(Math.round(v))}
            trend={(totalForecastedToday - mean(STATIONS.map(s => s.operational.avg_daily_volume))) / mean(STATIONS.map(s => s.operational.avg_daily_volume))}
            trendLabel="vs baseline avg"
          />
          <MetricCard
            label="Total EU Capacity"
            value={totalCapacityNetwork}
            formatter={v => formatNumber(Math.round(v))}
            trend={null}
          />
          <MetricCard
            label="Network Utilisation"
            value={networkUtilization * 100}
            formatter={v => `${v.toFixed(1)}%`}
            trend={networkUtilization - 0.85}
            trendLabel="vs 85% target"
            trendIsGood={false}
          />
          <MetricCard
            label="Stations At Risk"
            value={criticalStations.length + warningStations.length}
            formatter={v => Math.round(v).toString()}
            trend={null}
            trendLabel={`${criticalStations.length} critical · ${warningStations.length} warning`}
            alert={criticalStations.length > 0}
          />
          <MetricCard
            label="7-Day Flex Cost Exposure"
            value={costSummary.totalFlexCost}
            formatter={v => formatEUR(Math.round(v))}
            trend={null}
            trendLabel="to cover deficits"
          />
        </div>

        {/* Heatmap */}
        <div className="amazon-card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div style={{ marginBottom: '4px' }}>
            <div className="section-header" style={{ marginBottom: '4px' }}>7-Day Capacity Utilisation Heatmap</div>
            <div style={{ fontSize: '12px', color: '#565959', marginBottom: '16px' }}>
              Each cell shows forecasted utilisation for a station-day combination. Red cells indicate demand exceeding capacity.
              Hover for full detail.
            </div>
          </div>
          <HeatmapGrid
            data={heatmapData}
            rowLabels={rowLabels}
            colLabels={colLabels}
          />
        </div>

        {/* Rebalancing + What-if */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '16px', marginBottom: '16px' }}>
          {/* Rebalancing recommendations */}
          <div className="amazon-card" style={{ padding: '20px' }}>
            <div className="section-header">Rebalancing Recommendations</div>
            {rebalancing.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#067D62', padding: '12px', backgroundColor: '#E8F5EE', borderRadius: '4px' }}>
                No cross-station rebalancing recommended for the current 7-day window. All stations have manageable driver gaps.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {rebalancing.map(r => (
                  <div key={r.id} style={{ padding: '12px', backgroundColor: '#F5F9FE', border: '1px solid #DDD', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>
                        Transfer {r.drivers} drivers: {r.fromStation.code} → {r.toStation.code}
                      </span>
                      <span style={{ fontSize: '11px', padding: '2px 6px', backgroundColor: '#D4EDDA', color: '#067D62', borderRadius: '3px', fontWeight: 700 }}>
                        {formatEUR(r.estimatedCostSaving)} saving
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#565959', lineHeight: 1.6 }}>{r.rationale}</div>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '6px' }}>
                      Affected days: {r.affectedDays.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Network diagram */}
            {networkTransfers.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>Rebalancing Flow Diagram</div>
                <NetworkDiagram transfers={networkTransfers} width={550} height={220} />
              </div>
            )}
          </div>

          {/* What-if simulator */}
          <div className="amazon-card" style={{ padding: '20px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#565959' }}>Simulate for station:</label>
              <select
                value={selectedSimStation}
                onChange={e => setSelectedSimStation(e.target.value)}
                style={{ display: 'block', width: '100%', padding: '6px 10px', border: '1px solid #DDD', borderRadius: '4px', fontSize: '13px', backgroundColor: '#FFF', marginTop: '4px' }}
              >
                {STATIONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <WhatIfSimulator baseScenario={simStation} />
          </div>
        </div>

        {/* Cost breakdown */}
        <div className="amazon-card" style={{ padding: '20px' }}>
          <div className="section-header">7-Day Cost Exposure Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {[
              { label: 'Flex Driver Costs', value: costSummary.totalFlexCost, color: '#C7511F', desc: 'Cost to cover driver deficits with flex drivers' },
              { label: 'Idle Driver Costs', value: costSummary.totalIdleCost, color: '#007185', desc: 'Cost of scheduled drivers not fully utilised' },
              { label: 'Late Penalty Exposure', value: costSummary.totalLatePenalty, color: '#CC0C39', desc: 'Estimated late delivery penalties if gaps unaddressed' },
              { label: 'Total Cost Exposure', value: costSummary.totalCost, color: '#0F1111', desc: 'Combined 7-day operational cost risk' },
            ].map(item => (
              <div key={item.label} style={{ padding: '12px', backgroundColor: '#F9F9F9', borderRadius: '4px', border: '1px solid #EEE' }}>
                <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: item.color }}>{formatEUR(item.value)}</div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
