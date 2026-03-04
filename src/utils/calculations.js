/**
 * Statistical and operational calculations for AMZL Central Ops Intelligence.
 */

/** Calculate mean of an array */
export function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}

/** Calculate standard deviation */
export function stdDev(arr) {
  if (!arr || arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length);
}

/** Calculate median */
export function median(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Calculate percentile (0-100) */
export function percentile(arr, p) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const frac = idx - lower;
  if (lower >= sorted.length - 1) return sorted[sorted.length - 1];
  return sorted[lower] + frac * (sorted[lower + 1] - sorted[lower]);
}

/** Calculate MAPE (Mean Absolute Percentage Error) */
export function mape(actual, predicted) {
  if (!actual || !predicted || actual.length !== predicted.length) return null;
  const n = actual.length;
  const sum = actual.reduce((s, a, i) => {
    if (a === 0) return s;
    return s + Math.abs((a - predicted[i]) / a);
  }, 0);
  return (sum / n) * 100;
}

/** Calculate RMSE */
export function rmse(actual, predicted) {
  if (!actual || !predicted || actual.length !== predicted.length) return null;
  const sum = actual.reduce((s, a, i) => s + (a - predicted[i]) ** 2, 0);
  return Math.sqrt(sum / actual.length);
}

/** Calculate R-squared */
export function rSquared(actual, predicted) {
  if (!actual || !predicted || actual.length !== predicted.length) return null;
  const actualMean = mean(actual);
  const ssTot = actual.reduce((s, a) => s + (a - actualMean) ** 2, 0);
  const ssRes = actual.reduce((s, a, i) => s + (a - predicted[i]) ** 2, 0);
  if (ssTot === 0) return 1;
  return 1 - ssRes / ssTot;
}

/** Calculate rolling N-day average */
export function rollingMean(arr, window) {
  return arr.map((_, i) => {
    if (i < window - 1) return null;
    return mean(arr.slice(i - window + 1, i + 1));
  });
}

/** Linear regression slope and intercept */
export function linearRegression(y) {
  const n = y.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const xMean = mean(x);
  const yMean = mean(y);
  const slope = x.reduce((s, xi, i) => s + (xi - xMean) * (y[i] - yMean), 0) /
                x.reduce((s, xi) => s + (xi - xMean) ** 2, 0);
  const intercept = yMean - slope * xMean;
  return { slope, intercept };
}

/** Compute composite utilization risk score */
export function utilizationRiskScore(utilizationRate) {
  if (utilizationRate >= 0.95) return 'critical';
  if (utilizationRate >= 0.85) return 'warning';
  return 'healthy';
}

/** Calculate on-time delivery trend over last N days */
export function calculateOTDTrend(stationRecords, days = 7) {
  const recent = stationRecords.slice(-days);
  const prior = stationRecords.slice(-days * 2, -days);
  if (!prior.length) return 0;
  const recentAvg = mean(recent.map(r => r.on_time_rate));
  const priorAvg = mean(prior.map(r => r.on_time_rate));
  return recentAvg - priorAvg;
}

/** Clamp a value between min and max */
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
