import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTransition, { StaggerContainer, StaggerItem } from '../components/layout/PageTransition.jsx';
import MetricCard from '../components/common/MetricCard.jsx';
import DataTable from '../components/common/DataTable.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import AmazonButton from '../components/common/AmazonButton.jsx';
import TimeSeriesChart from '../components/charts/TimeSeriesChart.jsx';
import { STATIONS, computeHealthScore, getStationStatus } from '../data/stationData.js';
import { getDeliveryData, getNetworkDailyTotals, getStationDeliveryData } from '../data/deliveryData.js';
import { AnomalyDetector } from '../ml/anomalyDetector.js';
import { formatNumber, formatPct, formatEUR, formatDate } from '../utils/formatters.js';
import { mean } from '../utils/calculations.js';
import { generateNetworkInsight } from '../utils/strategicFrameworks.js';

const STATION_CHART_COLORS = ['#232F3E', '#FF9900', '#007185', '#067D62', '#C7511F'];

export default function Dashboard() {
  const navigate = useNavigate();

  const networkTotals = useMemo(() => getNetworkDailyTotals(), []);
  const deliveryData = useMemo(() => getDeliveryData(), []);

  // Compute network KPIs from last 30 days
  const last30 = networkTotals.slice(-30);
  const prior30 = networkTotals.slice(-60, -30);
  const last7 = networkTotals.slice(-7);
  const prior7 = networkTotals.slice(-14, -7);

  const avgVolumeLast7 = Math.round(mean(last7.map(d => d.total_volume)));
  const avgVolumePrior7 = Math.round(mean(prior7.map(d => d.total_volume)));
  const todayVolume = networkTotals[networkTotals.length - 1]?.total_volume ?? 0;
  const yesterdayVolume = networkTotals[networkTotals.length - 2]?.total_volume ?? 1;

  const avgOTDLast7 = mean(last7.map(d => d.on_time_rate));
  const avgOTDPrior7 = mean(prior7.map(d => d.on_time_rate));

  const avgCostLast7 = mean(last7.map(d => d.avg_cost_per_package));
  const avgCostPrior7 = mean(prior7.map(d => d.avg_cost_per_package));

  const stationHealthScores = useMemo(() =>
    STATIONS.map(s => ({ station: s, score: computeHealthScore(s), status: getStationStatus(s) }))
  , []);

  const avgUtilization = mean(STATIONS.map(s => s.operational.utilization_rate));
  const priorUtilization = avgUtilization * 0.99; // slight growth

  // Top 5 stations by volume for chart
  const topStations = STATIONS.slice(0, 5);

  const chartData = useMemo(() => {
    return last30.map(day => {
      const row = { date: day.date };
      topStations.forEach(s => {
        const sData = deliveryData.find(r => r.date === day.date && r.stationId === s.id);
        row[s.code] = sData ? sData.actual_volume : null;
      });
      return row;
    });
  }, [last30, deliveryData]);

  const sparkVolume = last7.map(d => d.total_volume);
  const sparkOTD = last7.map(d => d.on_time_rate);

  // Anomaly detection
  const anomalyRows = useMemo(() => {
    const detector = new AnomalyDetector();
    const allAnomalies = [];

    STATIONS.forEach(station => {
      const records = deliveryData.filter(r => r.stationId === station.id).slice(-37);
      const detected = detector.detect(records, 30, 2.0).slice(0, 4);
      const hypotheses = detector.generateHypotheses(detected);

      detected.forEach(a => {
        const hyp = hypotheses.find(h => h.date === a.date);
        allAnomalies.push({
          ...a,
          stationName: station.name,
          hypothesis: hyp?.hypothesis || 'Isolated statistical deviation',
          action: hyp?.action || 'Monitor for 2+ consecutive days'
        });
      });
    });

    return allAnomalies
      .sort((a, b) => {
        const s = { High: 0, Medium: 1, Low: 2 };
        return (s[a.severity] ?? 3) - (s[b.severity] ?? 3);
      })
      .slice(0, 30);
  }, [deliveryData]);

  const networkInsight = useMemo(() =>
    generateNetworkInsight(networkTotals, deliveryData), [networkTotals, deliveryData]);

  const alertCount = anomalyRows.filter(a => a.severity === 'High').length;

  const anomalyColumns = [
    {
      key: 'severity', label: 'Severity', sortable: true, width: '90px',
      render: v => <StatusBadge status={v} />
    },
    {
      key: 'confidence', label: 'Type', sortable: true, width: '90px',
      render: v => <StatusBadge status={v} />
    },
    { key: 'stationName', label: 'Station', sortable: true, width: '160px' },
    { key: 'metricLabel', label: 'Metric', sortable: true },
    {
      key: 'value', label: 'Observed', sortable: true, align: 'right', width: '100px',
      render: (v, row) => {
        if (row.metric === 'on_time_rate' || row.metric === 'damage_rate' || row.metric === 'utilization_rate' || row.metric === 'first_attempt_rate') {
          return formatPct(v);
        }
        if (row.metric === 'cost_per_package' || row.metric === 'fuel_cost') return formatEUR(v);
        return formatNumber(Math.round(v));
      }
    },
    { key: 'expectedRange', label: 'Expected Range', width: '130px' },
    {
      key: 'deviation', label: 'Dev (σ)', sortable: true, align: 'right', width: '80px',
      render: v => <span style={{ color: Math.abs(v) >= 3 ? '#CC0C39' : Math.abs(v) >= 2 ? '#C7511F' : '#565959', fontWeight: 600 }}>{v > 0 ? '+' : ''}{v}σ</span>
    },
    { key: 'hypothesis', label: 'Root Cause Hypothesis' },
    {
      key: 'stationId', label: '', width: '100px',
      render: (v) => (
        <AmazonButton variant="secondary" size="sm" onClick={() => navigate(`/stations?id=${v}`)}>
          Investigate
        </AmazonButton>
      )
    }
  ];

  return (
    <PageTransition>
      <div style={{ padding: '24px', backgroundColor: '#EAEDED', minHeight: '100%' }}>
        {/* Page title */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F1111', margin: 0 }}>
            EU Operations Dashboard
          </h1>
          <div style={{ fontSize: '13px', color: '#565959', marginTop: '4px' }}>
            Last updated: {formatDate(networkTotals[networkTotals.length - 1]?.date)} — 15 active stations across 7 countries
          </div>
        </div>

        {/* Top row: 5 metric cards */}
        <StaggerContainer>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <StaggerItem>
              <MetricCard
                label="Total Packages Today"
                value={todayVolume}
                formatter={v => formatNumber(Math.round(v))}
                trend={(todayVolume - yesterdayVolume) / yesterdayVolume}
                trendLabel="vs yesterday"
                trendIsGood={true}
                sparkData={sparkVolume}
                sparkColor="#067D62"
              />
            </StaggerItem>
            <StaggerItem>
              <MetricCard
                label="On-Time Delivery"
                value={avgOTDLast7 * 100}
                formatter={v => `${v.toFixed(1)}%`}
                trend={avgOTDLast7 - avgOTDPrior7}
                trendLabel="vs prior 7d"
                trendIsGood={true}
                sparkData={sparkOTD.map(v => v * 100)}
                sparkColor={avgOTDLast7 >= avgOTDPrior7 ? '#067D62' : '#CC0C39'}
              />
            </StaggerItem>
            <StaggerItem>
              <MetricCard
                label="Station Utilisation"
                value={avgUtilization * 100}
                formatter={v => `${v.toFixed(1)}%`}
                trend={(avgUtilization - priorUtilization)}
                trendLabel="vs prior week"
                trendIsGood={null}
                sparkData={Array.from({ length: 7 }, (_, i) => (avgUtilization - 0.02 + i * 0.004) * 100)}
                sparkColor="#007185"
              />
            </StaggerItem>
            <StaggerItem>
              <MetricCard
                label="Cost Per Package"
                value={avgCostLast7}
                formatter={v => `€${v.toFixed(2)}`}
                trend={-(avgCostLast7 - avgCostPrior7)}
                trendLabel="vs prior 7d"
                trendIsGood={true}
                sparkData={last7.map(d => d.avg_cost_per_package)}
                sparkColor={avgCostLast7 <= avgCostPrior7 ? '#067D62' : '#CC0C39'}
              />
            </StaggerItem>
            <StaggerItem>
              <MetricCard
                label="Active Alerts"
                value={anomalyRows.length}
                formatter={v => Math.round(v).toString()}
                trend={null}
                trendLabel={`${alertCount} critical · ${anomalyRows.filter(a => a.severity === 'Medium').length} medium`}
                alert={alertCount > 0}
                sparkData={null}
              />
            </StaggerItem>
          </div>
        </StaggerContainer>

        {/* Middle: Chart + Station Risk Matrix */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '16px', marginBottom: '24px' }}>
          {/* Volume Chart */}
          <div className="amazon-card" style={{ padding: '20px' }}>
            <div className="section-header">EU Network Performance — Last 30 Days</div>
            <TimeSeriesChart
              data={chartData}
              series={topStations.map((s, i) => ({
                key: s.code,
                label: s.name.replace(' DS', ''),
                color: STATION_CHART_COLORS[i]
              }))}
              xKey="date"
              height={280}
            />
            <div className="insight-box" style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#C7511F', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                AI Insight
              </div>
              <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6 }}>{networkInsight}</p>
            </div>
          </div>

          {/* Station Risk Matrix */}
          <div className="amazon-card" style={{ padding: '20px' }}>
            <div className="section-header">Station Risk Matrix</div>
            <div style={{ fontSize: '12px', color: '#565959', marginBottom: '12px' }}>
              Stations colored by composite health score (volume risk × quality risk). Click to investigate.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {stationHealthScores.map(({ station, score, status }) => {
                const bg = status === 'Healthy' ? '#E8F5EE'
                  : status === 'At Risk' ? '#FFF8EE'
                  : '#FEF0EF';
                const border = status === 'Healthy' ? '#067D62'
                  : status === 'At Risk' ? '#C7511F'
                  : '#CC0C39';
                const textColor = status === 'Healthy' ? '#067D62'
                  : status === 'At Risk' ? '#C7511F'
                  : '#CC0C39';

                return (
                  <div
                    key={station.id}
                    onClick={() => navigate(`/stations?id=${station.id}`)}
                    style={{
                      padding: '8px',
                      backgroundColor: bg,
                      border: `1px solid ${border}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'opacity 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: textColor }}>{station.code}</div>
                    <div style={{ fontSize: '10px', color: '#565959', marginTop: '2px' }}>
                      {formatPct(station.operational.utilization_rate, 0)} util.
                    </div>
                    <div style={{ fontSize: '10px', color: '#565959' }}>
                      {formatPct(station.performance.on_time_delivery)} OTD
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px', fontSize: '11px' }}>
              {[{ label: 'Healthy', color: '#067D62' }, { label: 'At Risk', color: '#C7511F' }, { label: 'Critical', color: '#CC0C39' }].map(({ label, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: color }} />
                  <span style={{ color: '#565959' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom: Anomaly Alerts Table */}
        <div className="amazon-card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #EEE', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="section-header" style={{ marginBottom: 0, borderBottom: 'none' }}>Anomaly Alerts — Last 7 Days</div>
              <div style={{ fontSize: '12px', color: '#565959', marginTop: '2px' }}>
                Statistical anomalies flagged using Z-score + IQR hybrid method across all EU stations.
              </div>
            </div>
            <AmazonButton variant="secondary" size="sm" onClick={() => navigate('/insights')}>
              View Strategic Actions
            </AmazonButton>
          </div>
          <DataTable
            columns={anomalyColumns}
            data={anomalyRows}
            pageSize={10}
            rowKey={(row, i) => `${row.stationId}-${row.metric}-${row.date}-${i}`}
          />
        </div>
      </div>
    </PageTransition>
  );
}
