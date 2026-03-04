import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../components/layout/PageTransition.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import AmazonButton from '../components/common/AmazonButton.jsx';
import WaterfallChart from '../components/charts/WaterfallChart.jsx';
import RiskHeatmap from '../components/strategic/RiskHeatmap.jsx';
import { STATIONS, computeHealthScore, getStationStatus } from '../data/stationData.js';
import { getNetworkDailyTotals } from '../data/deliveryData.js';
import { formatNumber, formatPct } from '../utils/formatters.js';
import {
  generatePriorityActions, generateWaterfallData, generateRiskRegister
} from '../utils/strategicFrameworks.js';
import { mean } from '../utils/calculations.js';

export default function StrategicInsights() {
  const navigate = useNavigate();
  const networkTotals = useMemo(() => getNetworkDailyTotals(), []);

  const priorityActions = useMemo(() => generatePriorityActions([], null, networkTotals), [networkTotals]);
  const waterfallData = useMemo(() => generateWaterfallData(networkTotals), [networkTotals]);
  const riskItems = useMemo(() => generateRiskRegister(), []);

  const stationHealthCards = useMemo(() =>
    STATIONS.map(s => ({
      station: s,
      score: computeHealthScore(s),
      status: getStationStatus(s),
      topConcern: s.operational.utilization_rate > 0.90
        ? `Utilisation ${formatPct(s.operational.utilization_rate)} — near capacity limit`
        : s.performance.on_time_delivery < 0.960
          ? `OTD ${formatPct(s.performance.on_time_delivery)} — below 96.0% target`
          : `Healthy operations — monitor ${s.code}`
    })).sort((a, b) => a.score - b.score)
  , []);

  const PRIORITY_COLORS = { P1: '#CC0C39', P2: '#C7511F', P3: '#007185' };

  return (
    <PageTransition>
      <div style={{ padding: '24px', backgroundColor: '#EAEDED', minHeight: '100%' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F1111', margin: 0 }}>Strategic Insights</h1>
          <div style={{ fontSize: '13px', color: '#565959', marginTop: '4px' }}>
            Framework-driven recommendations synthesised from ML outputs and operational data
          </div>
        </div>

        {/* Section 1: Priority Actions */}
        <div className="amazon-card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div className="section-header">This Week's Priority Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {priorityActions.map((action, i) => (
              <div key={i} style={{
                padding: '16px',
                backgroundColor: '#FAFAFA',
                border: `1px solid`,
                borderColor: action.priority === 'P1' ? '#FDECEA' : action.priority === 'P2' ? '#FFF3CD' : '#D1ECF1',
                borderLeft: `4px solid ${PRIORITY_COLORS[action.priority]}`,
                borderRadius: '0 4px 4px 0'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                  <StatusBadge status={action.priority} />
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F1111' }}>{action.title}</div>
                </div>
                <div style={{ fontSize: '13px', color: '#565959', lineHeight: 1.6, marginBottom: '8px' }}>
                  {action.rationale}
                </div>
                <div style={{ fontSize: '13px', color: '#067D62', lineHeight: 1.5, marginBottom: '8px' }}>
                  <strong>Expected Impact:</strong> {action.impact}
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  <strong>Owner:</strong> {action.owner}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Network Health Grid */}
        <div className="amazon-card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div className="section-header" style={{ marginBottom: 0, borderBottom: 'none' }}>Network Health Summary</div>
            <div style={{ fontSize: '12px', color: '#565959' }}>
              Sorted by health score (lowest first) · Click any station to investigate
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
            {stationHealthCards.map(({ station, score, status, topConcern }) => {
              const bg = status === 'Healthy' ? '#E8F5EE' : status === 'At Risk' ? '#FFF8EE' : '#FEF0EF';
              const border = status === 'Healthy' ? '#067D62' : status === 'At Risk' ? '#C7511F' : '#CC0C39';

              return (
                <div
                  key={station.id}
                  onClick={() => navigate(`/stations?id=${station.id}`)}
                  style={{
                    padding: '12px',
                    backgroundColor: bg,
                    border: `1px solid ${border}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'opacity 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: border }}>{station.code}</span>
                    <span style={{ fontSize: '20px', fontWeight: 700, color: border }}>{score}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#565959', marginBottom: '4px', fontWeight: 600 }}>{station.name.replace(' DS', '')}</div>
                  <StatusBadge status={status} />
                  <div style={{ fontSize: '10px', color: '#777', marginTop: '6px', lineHeight: 1.4 }}>{topConcern}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3 + 4: Waterfall + Risk side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          {/* Waterfall */}
          <div className="amazon-card" style={{ padding: '20px' }}>
            <div className="section-header">30-Day OTD Change Decomposition</div>
            <div style={{ fontSize: '12px', color: '#565959', marginBottom: '12px' }}>
              Waterfall breakdown showing which factors drove the change in on-time delivery rate month-over-month.
            </div>
            <WaterfallChart data={waterfallData} height={300} valueLabel="pp" />
            <div style={{ fontSize: '12px', color: '#565959', marginTop: '12px', lineHeight: 1.5 }}>
              <strong>Net result:</strong> {waterfallData[waterfallData.length - 1]?.value?.toFixed(2)}% OTD vs {waterfallData[0]?.value?.toFixed(2)}% baseline.
              Volume growth and weather were headwinds; route optimisation and new driver onboarding were tailwinds.
            </div>
          </div>

          {/* Risk Register */}
          <div className="amazon-card" style={{ padding: '20px' }}>
            <div className="section-header">Risk Register — Likelihood vs Impact</div>
            <div style={{ fontSize: '12px', color: '#565959', marginBottom: '12px' }}>
              Click a risk marker or list item to view mitigation strategy. Top-right = highest priority for mitigation.
            </div>
            <RiskHeatmap risks={riskItems} />
          </div>
        </div>

        {/* Network OTD summary */}
        <div className="amazon-card" style={{ padding: '20px' }}>
          <div className="section-header">EU Network 30-Day Performance Snapshot</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {[
              { label: 'Network Avg OTD', value: formatPct(mean(STATIONS.map(s => s.performance.on_time_delivery))), good: true },
              { label: 'Best Performing Station', value: [...STATIONS].sort((a, b) => b.performance.on_time_delivery - a.performance.on_time_delivery)[0].code, good: true },
              { label: 'Stations Below Target', value: STATIONS.filter(s => s.performance.on_time_delivery < 0.960).length.toString(), good: false },
              { label: 'Stations Above 90% Util.', value: STATIONS.filter(s => s.operational.utilization_rate > 0.90).length.toString(), good: false },
            ].map(item => (
              <div key={item.label} style={{ padding: '16px', backgroundColor: '#F9F9F9', borderRadius: '4px', border: '1px solid #EEE' }}>
                <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{item.label}</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: item.good ? '#067D62' : '#CC0C39' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
