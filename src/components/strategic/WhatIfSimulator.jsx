import React, { useState, useMemo } from 'react';
import AmazonButton from '../common/AmazonButton.jsx';
import { formatNumber, formatPct, formatEUR } from '../../utils/formatters.js';
import { clamp } from '../../utils/calculations.js';

/**
 * Interactive what-if simulator with sliders.
 * User adjusts volume change, driver count, vehicle count — sees real-time impact.
 */
export default function WhatIfSimulator({ baseScenario }) {
  const [volumeChange, setVolumeChange] = useState(0);
  const [additionalDrivers, setAdditionalDrivers] = useState(0);
  const [additionalVehicles, setAdditionalVehicles] = useState(0);
  const [simulated, setSimulated] = useState(false);

  const result = useMemo(() => {
    if (!baseScenario) return null;

    const { capacity, operational, performance } = baseScenario;
    const newVolume = operational.avg_daily_volume * (1 + volumeChange / 100);
    const newDrivers = capacity.drivers + additionalDrivers;
    const newVehicles = capacity.vehicles + additionalVehicles;
    const newCapacity = capacity.packages_per_day * (newDrivers / capacity.drivers);
    const newUtilization = newVolume / newCapacity;

    // On-time delivery model: decreases as utilization exceeds 85%
    const utilizationPenalty = Math.max(0, (newUtilization - 0.85) * 0.45);
    const volumePenalty = Math.max(0, (volumeChange / 100) * 0.05);
    const newOTD = clamp(performance.on_time_delivery - utilizationPenalty - volumePenalty, 0.85, 0.995);

    // Cost model
    const laborCostChange = additionalDrivers * 180;
    const lateDeliveries = Math.round(newVolume * (1 - newOTD));
    const latePenaltyCost = lateDeliveries * 4.5;
    const fuelCostChange = additionalVehicles * 85;
    const idleDriverCost = Math.max(0, newDrivers - Math.ceil(newVolume / 110)) * 180;

    const baseLateCost = Math.round(operational.avg_daily_volume * (1 - performance.on_time_delivery)) * 4.5;
    const netCostDelta = laborCostChange + fuelCostChange + idleDriverCost + latePenaltyCost - baseLateCost;

    return {
      newVolume: Math.round(newVolume),
      newCapacity: Math.round(newCapacity),
      newUtilization,
      newOTD,
      newDrivers,
      newVehicles,
      netCostDelta: Math.round(netCostDelta),
      lateDeliveries,
      recommendation: newUtilization > 0.95
        ? 'Station is over capacity. Add more flex drivers or redirect volume.'
        : newUtilization < 0.65
          ? 'Station is under-utilized. Consider redistributing drivers to higher-demand stations.'
          : 'Capacity balance is acceptable. Monitor OTD closely.'
    };
  }, [baseScenario, volumeChange, additionalDrivers, additionalVehicles]);

  if (!baseScenario) {
    return (
      <div style={{ padding: '24px', color: '#999', fontSize: '13px' }}>
        Select a station to run the simulator.
      </div>
    );
  }

  const { capacity, operational, performance } = baseScenario;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="section-header">What-If Simulator</div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Volume change */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
            <span style={{ fontWeight: 600 }}>Volume Change</span>
            <span style={{ color: volumeChange > 0 ? '#CC0C39' : volumeChange < 0 ? '#067D62' : '#555', fontWeight: 700 }}>
              {volumeChange > 0 ? '+' : ''}{volumeChange}%
            </span>
          </div>
          <input
            type="range" min={-20} max={30} step={1}
            value={volumeChange}
            onChange={e => setVolumeChange(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#FF9900' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#999' }}>
            <span>-20%</span><span>0%</span><span>+30%</span>
          </div>
        </div>

        {/* Add flex drivers */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
            <span style={{ fontWeight: 600 }}>Additional Flex Drivers</span>
            <span style={{ color: '#007185', fontWeight: 700 }}>+{additionalDrivers}</span>
          </div>
          <input
            type="range" min={0} max={50} step={1}
            value={additionalDrivers}
            onChange={e => setAdditionalDrivers(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#FF9900' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#999' }}>
            <span>0</span><span>25</span><span>50</span>
          </div>
        </div>

        {/* Add vehicles */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
            <span style={{ fontWeight: 600 }}>Additional Vehicles</span>
            <span style={{ color: '#007185', fontWeight: 700 }}>+{additionalVehicles}</span>
          </div>
          <input
            type="range" min={0} max={20} step={1}
            value={additionalVehicles}
            onChange={e => setAdditionalVehicles(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#FF9900' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#999' }}>
            <span>0</span><span>10</span><span>20</span>
          </div>
        </div>
      </div>

      {/* Before / After comparison */}
      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#999', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Before</div>
            <div className="amazon-card" style={{ padding: '12px' }}>
              <CompareRow label="Daily Volume" value={formatNumber(operational.avg_daily_volume)} />
              <CompareRow label="Utilisation" value={formatPct(operational.utilization_rate)} />
              <CompareRow label="On-Time Delivery" value={formatPct(performance.on_time_delivery)} />
              <CompareRow label="Drivers" value={formatNumber(capacity.drivers)} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#FF9900', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>After Simulation</div>
            <div className="amazon-card" style={{ padding: '12px', borderColor: '#FF9900' }}>
              <CompareRow label="Daily Volume" value={formatNumber(result.newVolume)}
                delta={result.newVolume - operational.avg_daily_volume} higherIsBetter={false} />
              <CompareRow label="Utilisation" value={formatPct(result.newUtilization)}
                delta={result.newUtilization - operational.utilization_rate} higherIsBetter={false} />
              <CompareRow label="On-Time Delivery" value={formatPct(result.newOTD)}
                delta={result.newOTD - performance.on_time_delivery} higherIsBetter={true} />
              <CompareRow label="Drivers" value={formatNumber(result.newDrivers)}
                delta={additionalDrivers} higherIsBetter={true} />
            </div>
          </div>
        </div>
      )}

      {/* Cost impact */}
      {result && (
        <div style={{ padding: '12px', borderRadius: '4px', backgroundColor: result.netCostDelta < 0 ? '#E8F5EE' : '#FFF3CD', border: `1px solid ${result.netCostDelta < 0 ? '#BFE6CC' : '#FFD14D'}` }}>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
            Net Daily Cost Impact: <span style={{ color: result.netCostDelta < 0 ? '#067D62' : '#C7511F' }}>
              {result.netCostDelta <= 0 ? '' : '+'}{formatEUR(result.netCostDelta)}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#565959' }}>{result.recommendation}</div>
        </div>
      )}

      <AmazonButton variant="secondary" size="sm" onClick={() => { setVolumeChange(0); setAdditionalDrivers(0); setAdditionalVehicles(0); }}>
        Reset to Baseline
      </AmazonButton>
    </div>
  );
}

function CompareRow({ label, value, delta, higherIsBetter }) {
  let deltaColor = '#565959';
  if (delta !== undefined) {
    if (delta > 0) deltaColor = higherIsBetter ? '#067D62' : '#CC0C39';
    else if (delta < 0) deltaColor = higherIsBetter ? '#CC0C39' : '#067D62';
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #F5F5F5', fontSize: '12px' }}>
      <span style={{ color: '#565959' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontWeight: 700 }}>{value}</span>
        {delta !== undefined && Math.abs(delta) > 0 && (
          <span style={{ fontSize: '10px', color: deltaColor, fontWeight: 600 }}>
            {delta > 0 ? '+' : ''}{typeof delta === 'number' && Math.abs(delta) < 1 && !String(delta).includes('.') ? `${(delta * 100).toFixed(1)}pp` : String(delta).includes('.') ? delta.toFixed(3) : delta}
          </span>
        )}
      </div>
    </div>
  );
}
