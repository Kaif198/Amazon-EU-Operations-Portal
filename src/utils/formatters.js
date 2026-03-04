/**
 * Formatting utilities for AMZL Central Ops Intelligence.
 */

/** Format a number as a localized integer with comma separators */
export function formatNumber(n, decimals = 0) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/** Format a percentage (0.967 → "96.7%") */
export function formatPct(n, decimals = 1) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return `${(n * 100).toFixed(decimals)}%`;
}

/** Format a currency value in EUR */
export function formatEUR(n, decimals = 2) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return `€${Number(n).toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
}

/** Format a date string "2024-11-15" → "15 Nov 2024" */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Format a date to short label "Mon 15 Nov" */
export function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Format a date to day-of-week "Monday" */
export function formatDayOfWeek(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'long' });
}

/** Abbreviate large numbers: 243847 → "243.8K" */
export function abbreviateNumber(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

/** Format delta with sign: 0.032 → "+3.2%" */
export function formatDelta(n, decimals = 1, isPercentage = true) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const val = isPercentage ? (n * 100).toFixed(decimals) : n.toFixed(decimals);
  const sign = n >= 0 ? '+' : '';
  return `${sign}${val}${isPercentage ? '%' : ''}`;
}

/** Format minutes as "3h 05m" */
export function formatMinutes(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/** Compute trend direction */
export function getTrend(current, previous) {
  if (!previous) return 'neutral';
  return current > previous ? 'up' : current < previous ? 'down' : 'neutral';
}

/** Get color for metric based on trend and whether up is good */
export function getTrendColor(current, previous, higherIsBetter = true) {
  const trend = getTrend(current, previous);
  if (trend === 'neutral') return '#565959';
  if (higherIsBetter) return trend === 'up' ? '#067D62' : '#CC0C39';
  return trend === 'up' ? '#CC0C39' : '#067D62';
}
