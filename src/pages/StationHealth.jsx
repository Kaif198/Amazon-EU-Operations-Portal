import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PageTransition from '../components/layout/PageTransition.jsx';
import TabInterface from '../components/common/TabInterface.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import AmazonButton from '../components/common/AmazonButton.jsx';
import { DualAxisChart, TimeSeriesChart, StackedAreaChart } from '../components/charts/TimeSeriesChart.jsx';
import RootCauseTree from '../components/strategic/RootCauseTree.jsx';
import { STATIONS, computeHealthScore, getStationStatus } from '../data/stationData.js';
import { getStationDeliveryData } from '../data/deliveryData.js';
import { AnomalyDetector } from '../ml/anomalyDetector.js';
import { formatNumber, formatPct, formatEUR, formatDate } from '../utils/formatters.js';
import { mean, calculateOTDTrend } from '../utils/calculations.js';

export default function StationHealth({ selectedStationId }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const stationId = searchParams.get('id') || selectedStationId || STATIONS[0].id;

  const [selectedLocalStation, setSelectedLocalStation] = useState(stationId || STATIONS[0].id);

  useEffect(() => {
    if (stationId) setSelectedLocalStation(stationId);
  }, [stationId]);

  const station = STATIONS.find(s => s.id === selectedLocalStation) || STATIONS[0];
  const records = useMemo(() => getStationDeliveryData(station.id), [station.id]);

  const healthScore = computeHealthScore(station);
  const status = getStationStatus(station);
  const otdTrend = calculateOTDTrend(records);
  const last30 = records.slice(-30);
  const prior30 = records.slice(-60, -30);
  const avgOTDLast = mean(last30.map(r => r.on_time_rate));
  const avgOTDPrior = mean(prior30.map(r => r.on_time_rate));

  // Anomaly detection
  const { anomalies, rootCauseTree } = useMemo(() => {
    const detector = new AnomalyDetector();
    const detected = detector.detect(records.slice(-60), 30, 2.0);
    const primary = detected[0];
    const related = detected.filter(a => a.date === primary?.date && a !== primary);
    const tree = detector.buildRootCauseTree(primary, related);
    return { anomalies: detected.slice(0, 20), rootCauseTree: tree };
  }, [records]);

  // Chart data
  const volumeChartData = records.slice(-45).map(r => ({
    date: r.date,
    volume: r.actual_volume,
    utilization: r.utilization_rate
  }));

  const qualityChartData = records.slice(-45).map(r => ({
    date: r.date,
    on_time: r.on_time_rate,
    first_attempt: r.first_attempt_rate,
    damage: r.damage_rate
  }));

  const costChartData = records.slice(-45).map(r => ({
    date: r.date,
    labor: r.driver_hours * 18,
    fuel: r.fuel_cost,
    overhead: r.actual_volume * 0.25
  }));

  const efficiencyChartData = records.slice(-45).map(r => ({
    date: r.date,
    stops_per_hour: station.operational.avg_route_stops / 8.5 * (0.95 + Math.random() * 0.1),
    packages_per_driver: r.actual_volume / station.capacity.drivers
  }));

  const flagColor = status === 'Healthy' ? '#067D62' : status === 'At Risk' ? '#C7511F' : '#CC0C39';

  const tabs = [
    {
      label: 'Volume & Utilisation',
      content: (
        <div>
          <DualAxisChart
            data={volumeChartData}
            barKey="volume"
            lineKey="utilization"
            barLabel="Daily Volume"
            lineLabel="Utilisation Rate"
            height={280}
          />
        </div>
      )
    },
    {
      label: 'Quality Metrics',
      content: (
        <TimeSeriesChart
          data={qualityChartData}
          series={[
            { key: 'on_time', label: 'On-Time Delivery', color: '#067D62' },
            { key: 'first_attempt', label: 'First Attempt', color: '#007185' },
            { key: 'damage', label: 'Damage Rate', color: '#CC0C39' }
          ]}
          xKey="date"
          height={280}
          yFormatter={v => `${(v * 100).toFixed(1)}%`}
          tooltipFormatter={(v, name) => [formatPct(v), name]}
        />
      )
    },
    {
      label: 'Cost Analysis',
      content: (
        <StackedAreaChart
          data={costChartData}
          series={[
            { key: 'labor', label: 'Labour', color: '#232F3E' },
            { key: 'fuel', label: 'Fuel', color: '#FF9900' },
            { key: 'overhead', label: 'Overhead', color: '#DDD' }
          ]}
          xKey="date"
          height={280}
        />
      )
    },
    {
      label: 'Route Efficiency',
      content: (
        <TimeSeriesChart
          data={efficiencyChartData}
          series={[
            { key: 'packages_per_driver', label: 'Packages per Driver', color: '#232F3E' }
          ]}
          xKey="date"
          height={280}
          yFormatter={v => v.toFixed(0)}
          tooltipFormatter={(v, name) => [v.toFixed(1), name]}
        />
      )
    }
  ];

  return (
    <PageTransition>
      <div style={{ padding: '24px', backgroundColor: '#EAEDED', minHeight: '100%' }}>
        {/* Station selector */}
        <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedLocalStation}
            onChange={e => {
              setSelectedLocalStation(e.target.value);
              navigate(`/stations?id=${e.target.value}`);
            }}
            style={{ padding: '6px 10px', border: '1px solid #DDD', borderRadius: '4px', fontSize: '13px', backgroundColor: '#FFF', minWidth: '200px' }}
          >
            {STATIONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* Station header */}
        <div className="amazon-card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F1111', margin: 0 }}>{station.name}</h1>
                <StatusBadge status={status} size="md" />
              </div>
              <div style={{ fontSize: '13px', color: '#565959' }}>
                {station.city}, {station.country} · Station Code: {station.code}
              </div>
            </div>

            {/* Health score gauge */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '42px', fontWeight: 700, color: flagColor, lineHeight: 1 }}>{healthScore}</div>
              <div style={{ fontSize: '12px', color: '#565959' }}>Health Score / 100</div>
            </div>
          </div>

          {/* Quick stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #EEE' }}>
            {[
              { label: 'Avg Daily Volume', value: formatNumber(station.operational.avg_daily_volume) },
              { label: 'Capacity', value: formatNumber(station.capacity.packages_per_day) },
              { label: 'Drivers', value: formatNumber(station.capacity.drivers) },
              { label: 'Vehicles', value: formatNumber(station.capacity.vehicles) },
              { label: 'Sort Lanes', value: station.capacity.sort_lanes },
              { label: 'Utilisation', value: formatPct(station.operational.utilization_rate) }
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>{item.label}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F1111' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Key performance metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '16px' }}>
          {[
            { label: 'On-Time Delivery', value: formatPct(station.performance.on_time_delivery), good: station.performance.on_time_delivery >= 0.965 },
            { label: 'First Attempt', value: formatPct(station.performance.first_attempt_delivery), good: station.performance.first_attempt_delivery >= 0.940 },
            { label: 'Damage Rate', value: formatPct(station.performance.damage_rate, 3), good: station.performance.damage_rate <= 0.003 },
            { label: 'Customer Score', value: `${station.performance.customer_satisfaction}/5`, good: station.performance.customer_satisfaction >= 4.5 },
            { label: 'Cost Per Package', value: formatEUR(station.performance.cost_per_package), good: station.performance.cost_per_package <= 2.40 }
          ].map(item => (
            <div key={item.label} className="amazon-card" style={{ padding: '14px' }}>
              <div style={{ fontSize: '12px', color: '#565959' }}>{item.label}</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: item.good ? '#067D62' : '#C7511F', marginTop: '4px' }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Performance trends */}
        <div className="amazon-card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div className="section-header">Performance Trends — Last 45 Days</div>
          <TabInterface tabs={tabs} />
        </div>

        {/* Anomaly timeline */}
        {anomalies.length > 0 && (
          <div className="amazon-card" style={{ padding: '20px', marginBottom: '16px' }}>
            <div className="section-header">Anomaly Timeline — Last 60 Days</div>
            <div style={{ position: 'relative', paddingLeft: '24px' }}>
              <div style={{ position: 'absolute', left: '10px', top: 0, bottom: 0, width: '2px', backgroundColor: '#EEE' }} />
              {anomalies.slice(0, 8).map((a, i) => {
                const dotColor = a.severity === 'High' ? '#CC0C39' : a.severity === 'Medium' ? '#C7511F' : '#007185';
                return (
                  <div key={i} style={{ position: 'relative', marginBottom: '12px', paddingLeft: '16px' }}>
                    <div style={{
                      position: 'absolute', left: '-20px', top: '4px',
                      width: '10px', height: '10px', borderRadius: '50%',
                      backgroundColor: dotColor, border: '2px solid #FFF',
                      boxShadow: `0 0 0 2px ${dotColor}`
                    }} />
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F1111' }}>
                      {formatDate(a.date)} — {a.metricLabel}
                    </div>
                    <div style={{ fontSize: '12px', color: '#565959' }}>
                      Value {a.value} vs expected {a.expected} ({a.deviation}σ deviation) · {a.confidence} anomaly
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Root cause tree */}
        <div className="amazon-card" style={{ padding: '20px' }}>
          <RootCauseTree
            title="Root Cause Analysis"
            rootNode={anomalies.length > 0 ? rootCauseTree : null}
          />
        </div>
      </div>
    </PageTransition>
  );
}
