import React, { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { SparklineChart } from '../charts/TimeSeriesChart.jsx';

/**
 * Amazon-style metric card with animated count-up number and trend indicator.
 *
 * Props:
 *   label       — metric label text (e.g. "Total Packages Today")
 *   value       — numeric value to display
 *   formatter   — function to format the value for display (defaults to toLocaleString)
 *   trend       — number representing change (e.g. 0.032 for +3.2%)
 *   trendLabel  — text for the trend (e.g. "vs last week")
 *   trendIsGood — boolean: is an upward trend positive? (default true)
 *   sparkData   — array of numbers for sparkline (optional)
 *   sparkColor  — color for the sparkline (optional, defaults to green/red based on trend)
 *   suffix      — string suffix appended to value (e.g. "%")
 *   prefix      — string prefix prepended to value (e.g. "€")
 *   alert       — if true, renders orange left border highlight
 */
export default function MetricCard({
  label,
  value,
  formatter,
  trend,
  trendLabel = 'vs prior period',
  trendIsGood = true,
  sparkData,
  sparkColor,
  suffix = '',
  prefix = '',
  alert = false,
  style = {}
}) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, v => {
    if (formatter) return formatter(v);
    const formatted = Math.round(v).toLocaleString('en-GB');
    return `${prefix}${formatted}${suffix}`;
  });

  useEffect(() => {
    const animation = animate(count, Number(value) || 0, {
      duration: 1.2,
      ease: 'easeOut'
    });
    return animation.stop;
  }, [value]);

  const trendUp = trend > 0;
  const trendDown = trend < 0;
  const isPositive = trendIsGood ? trendUp : trendDown;
  const isNegative = trendIsGood ? trendDown : trendUp;
  const trendColor = trendUp && trendIsGood ? '#067D62'
    : trendDown && !trendIsGood ? '#067D62'
    : trendUp && !trendIsGood ? '#CC0C39'
    : trendDown && trendIsGood ? '#CC0C39'
    : '#565959';

  const displaySpark = sparkColor || (isPositive ? '#067D62' : isNegative ? '#CC0C39' : '#999');

  return (
    <div className="amazon-card" style={{
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      borderLeft: alert ? '3px solid #CC0C39' : undefined,
      transition: 'box-shadow 0.2s ease',
      cursor: 'default',
      ...style
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 5px 0 rgba(213,217,217,0.5)'}
    >
      {/* Label */}
      <div style={{ fontSize: '13px', color: '#565959', fontWeight: 400 }}>{label}</div>

      {/* Value */}
      <motion.div style={{ fontSize: '28px', fontWeight: 700, color: '#0F1111', lineHeight: 1.1 }}>
        {rounded}
      </motion.div>

      {/* Trend + Sparkline row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: trendColor }}>
          {trendUp ? <TrendingUp size={13} /> : trendDown ? <TrendingDown size={13} /> : <Minus size={13} />}
          <span style={{ fontWeight: 600 }}>
            {trend !== undefined && trend !== null
              ? `${trend >= 0 ? '+' : ''}${(typeof trend === 'number' && Math.abs(trend) < 1 && !suffix.includes('%'))
                  ? (trend * 100).toFixed(1) + '%'
                  : typeof trend === 'number' ? trend.toFixed(1) : trend}`
              : '—'
            }
          </span>
          <span style={{ color: '#999' }}>{trendLabel}</span>
        </div>

        {sparkData && sparkData.length > 0 && (
          <SparklineChart data={sparkData} color={displaySpark} />
        )}
      </div>
    </div>
  );
}
