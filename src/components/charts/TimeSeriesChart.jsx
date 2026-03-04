import React, { memo } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { formatNumber, formatDate, abbreviateNumber } from '../../utils/formatters.js';

const STATION_COLORS = [
  '#232F3E', '#FF9900', '#007185', '#067D62', '#C7511F',
  '#6B47A8', '#CC0C39', '#0066B2', '#38761D', '#8B4513'
];

/**
 * Main time-series line chart for volume data.
 * Supports multiple series (one per station), reference lines, forecast areas.
 */
export const TimeSeriesChart = memo(function TimeSeriesChart({
  data = [],
  series = [],       // [{ key, label, color, dashed }]
  xKey = 'date',
  height = 320,
  showGrid = true,
  showLegend = true,
  referenceLineX = null,   // value on x for "forecast starts here" line
  confidenceBand = null,   // { upperKey, lowerKey } for shaded area
  yFormatter = (v) => abbreviateNumber(v),
  tooltipFormatter = (v, name) => [formatNumber(Math.round(v)), name],
  xFormatter = (v) => {
    if (!v) return '';
    // Try to format as date, fallback to string
    const d = new Date(v);
    return isNaN(d) ? v : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
}) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '13px' }}>
        No data to display.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#EEE" vertical={false} />}
        <XAxis
          dataKey={xKey}
          tickFormatter={xFormatter}
          tick={{ fontSize: 11, fill: '#888' }}
          axisLine={{ stroke: '#DDD' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={yFormatter}
          tick={{ fontSize: 11, fill: '#888' }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          formatter={tooltipFormatter}
          labelFormatter={xFormatter}
          contentStyle={{
            border: '1px solid #DDD',
            borderRadius: '4px',
            fontSize: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        />
        {showLegend && (
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
            iconType="line"
            iconSize={14}
          />
        )}

        {/* Confidence band */}
        {confidenceBand && (
          <Area
            type="monotone"
            dataKey={confidenceBand.upperKey}
            stroke="none"
            fill="#FF9900"
            fillOpacity={0.1}
            legendType="none"
          />
        )}

        {/* Reference line: forecast boundary */}
        {referenceLineX && (
          <ReferenceLine
            x={referenceLineX}
            stroke="#999"
            strokeDasharray="4 4"
            label={{ value: 'Forecast', position: 'top', fill: '#999', fontSize: 11 }}
          />
        )}

        {/* Data series */}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label || s.key}
            stroke={s.color || STATION_COLORS[i % STATION_COLORS.length]}
            strokeWidth={s.strokeWidth || 2}
            strokeDasharray={s.dashed ? '5 3' : undefined}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
});

/**
 * Dual-axis chart: bars + line on secondary Y axis.
 */
export const DualAxisChart = memo(function DualAxisChart({
  data = [],
  barKey,
  lineKey,
  barLabel,
  lineLabel,
  height = 320,
  barColor = '#232F3E',
  lineColor = '#FF9900',
  xKey = 'date',
  barFormatter = v => abbreviateNumber(v),
  lineFormatter = v => `${(v * 100).toFixed(1)}%`,
  xFormatter = v => {
    const d = new Date(v);
    return isNaN(d) ? v : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 40, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEE" vertical={false} />
        <XAxis dataKey={xKey} tickFormatter={xFormatter} tick={{ fontSize: 11, fill: '#888' }} axisLine={{ stroke: '#DDD' }} tickLine={false} interval="preserveStartEnd" />
        <YAxis yAxisId="left" tickFormatter={barFormatter} tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} width={48} />
        <YAxis yAxisId="right" orientation="right" tickFormatter={lineFormatter} tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} width={48} domain={[0.85, 1]} />
        <Tooltip
          formatter={(v, name) => name === lineLabel ? [`${(v * 100).toFixed(1)}%`, name] : [formatNumber(Math.round(v)), name]}
          contentStyle={{ border: '1px solid #DDD', borderRadius: '4px', fontSize: '12px' }}
        />
        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
        <Bar yAxisId="left" dataKey={barKey} name={barLabel} fill={barColor} radius={[2, 2, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey={lineKey} name={lineLabel} stroke={lineColor} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </BarChart>
    </ResponsiveContainer>
  );
});

/**
 * Stacked area chart for cost breakdown.
 */
export const StackedAreaChart = memo(function StackedAreaChart({
  data = [],
  series = [],
  xKey = 'date',
  height = 280,
  xFormatter = v => {
    const d = new Date(v);
    return isNaN(d) ? v : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEE" vertical={false} />
        <XAxis dataKey={xKey} tickFormatter={xFormatter} tick={{ fontSize: 11, fill: '#888' }} axisLine={{ stroke: '#DDD' }} tickLine={false} interval="preserveStartEnd" />
        <YAxis tickFormatter={v => `€${abbreviateNumber(v)}`} tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} width={52} />
        <Tooltip formatter={(v, n) => [`€${formatNumber(Math.round(v))}`, n]} contentStyle={{ border: '1px solid #DDD', borderRadius: '4px', fontSize: '12px' }} />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        {series.map((s, i) => (
          <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stackId="1"
            stroke={s.color || STATION_COLORS[i]} fill={s.color || STATION_COLORS[i]} fillOpacity={0.75} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
});

/**
 * Tiny sparkline for MetricCard — 80x30px inline chart.
 */
export const SparklineChart = memo(function SparklineChart({ data = [], color = '#067D62', width = 80, height = 30 }) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
});

export default TimeSeriesChart;
