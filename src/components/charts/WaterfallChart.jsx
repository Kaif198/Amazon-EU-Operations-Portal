import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine, ResponsiveContainer
} from 'recharts';

/**
 * Waterfall chart for showing decomposition of a change (e.g. OTD delta).
 * Items with isTotal=true are rendered as standalone totals.
 */
export default function WaterfallChart({ data = [], height = 320, valueLabel = 'pp' }) {
  // Build waterfall data with running cumulative for bar positioning
  let running = 0;
  const chartData = data.map((item, i) => {
    if (item.isTotal) {
      return { ...item, base: 0, displayValue: item.value, isPositive: false };
    }
    const base = running;
    running += item.value;
    return {
      ...item,
      base,
      displayValue: Math.abs(item.value),
      isPositive: item.value >= 0
    };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    const sign = d.isTotal ? '' : d.value >= 0 ? '+' : '-';
    return (
      <div style={{ background: '#FFF', border: '1px solid #DDD', borderRadius: '4px', padding: '8px 12px', fontSize: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ fontWeight: 700 }}>{label}</div>
        <div style={{ color: d.isTotal ? '#0F1111' : d.value >= 0 ? '#067D62' : '#CC0C39' }}>
          {sign}{Math.abs(d.value).toFixed(2)}{valueLabel}
        </div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 16, right: 16, bottom: 32, left: 16 }} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke="#EEE" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} axisLine={{ stroke: '#DDD' }} tickLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} width={44} tickFormatter={v => `${v > 0 ? '+' : ''}${v.toFixed(1)}`} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={0} stroke="#DDD" />

        {/* Invisible base bar for stacking */}
        <Bar dataKey="base" stackId="waterfall" fill="transparent" legendType="none" />

        {/* Visible value bar */}
        <Bar dataKey="displayValue" stackId="waterfall" radius={[2, 2, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.isTotal ? '#232F3E' : entry.isPositive ? '#067D62' : '#CC0C39'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
