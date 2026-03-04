/**
 * Historical volume data — 180 days per station for ML model training.
 * Extends delivery data backward by 90 days (May–Aug 2024).
 * Uses the same seeded PRNG and seasonality logic as deliveryData for consistency.
 */

import { STATIONS } from './stationData.js';
import { getStationDeliveryData } from './deliveryData.js';

function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const DOW_MULTIPLIERS = [0.72, 1.12, 1.05, 1.02, 1.08, 0.88, 0.78];
// Historical weather disruptions (different days from the main 90-day window)
const HIST_WEATHER_DAYS = new Set([5, 19, 34, 58, 72, 88, 112, 141, 162]);
const HIST_SALE_DAYS = new Set([88, 89, 90]); // Summer sale in historical period

/**
 * Generate 180 days of historical volume data for a single station.
 * Returns array of { date, dayIndex, stationId, volume } sorted chronologically.
 */
export function generateHistoricalVolumes(station) {
  const volumes = [];
  const startDate = new Date('2024-03-05'); // 180 days before Dec 1

  for (let day = 0; day < 180; day++) {
    const r = mulberry32(station.id.charCodeAt(6) * 333 + day * 17 + 99);
    const date = new Date(startDate);
    date.setDate(date.getDate() + day);

    const dow = date.getDay();
    const dowMult = DOW_MULTIPLIERS[dow];
    // Slight upward trend over historical period (pre-dates current period)
    const growthMult = 0.96 + (day / 180) * 0.04;
    const randomNoise = 0.92 + r() * 0.16;

    let volume = station.operational.avg_daily_volume * dowMult * growthMult * randomNoise;
    if (HIST_WEATHER_DAYS.has(day)) volume *= 0.84 + r() * 0.07;
    if (HIST_SALE_DAYS.has(day)) volume *= 1.28 + r() * 0.09;

    volumes.push({
      date: date.toISOString().split('T')[0],
      dayIndex: day,
      stationId: station.id,
      volume: Math.round(volume)
    });
  }

  return volumes;
}

/**
 * Get flat array of just the volume numbers for ML training — 180 values per station.
 */
export function getTrainingVolumes(stationId) {
  const station = STATIONS.find(s => s.id === stationId);
  if (!station) return [];
  return generateHistoricalVolumes(station).map(r => r.volume);
}

/**
 * Get all historical data for all stations (used for aggregate analysis)
 */
export function getAllHistoricalData() {
  return STATIONS.flatMap(station => generateHistoricalVolumes(station));
}

/** Get combined historical + current (270 days) for chart display */
export function getFullTimeSeries(stationId) {
  const historical = generateHistoricalVolumes(
    STATIONS.find(s => s.id === stationId)
  );
  const current = getStationDeliveryData(stationId).map(r => ({
    date: r.date,
    dayIndex: r.dayIndex + 180,
    stationId: r.stationId,
    volume: r.actual_volume
  }));
  return [...historical, ...current];
}
