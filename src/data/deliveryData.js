/**
 * Delivery data generator — produces 90 days of per-station delivery records.
 * Uses a seeded pseudo-random number generator for deterministic, reproducible output.
 * Includes realistic seasonality, growth trends, weather events, and sale spikes.
 */

import { STATIONS } from './stationData.js';

// Seeded PRNG (mulberry32)
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);

// Day-of-week multipliers (0=Sun, 1=Mon ... 6=Sat)
const DOW_MULTIPLIERS = [0.72, 1.12, 1.05, 1.02, 1.08, 0.88, 0.78];

// Weather disruption days (indices into the 90-day window)
const WEATHER_DAYS = new Set([8, 23, 37, 51, 62, 76, 84]);

// Sale event days (Prime-like spikes)
const SALE_DAYS = new Set([44, 45]); // 2 consecutive sale days

/**
 * Generate volume for a given day/station with realistic variance
 */
function generateDayVolume(baseVolume, dayIndex, stationSeed) {
  const r = mulberry32(stationSeed + dayIndex * 7);
  const dow = (dayIndex % 7);
  const dowMult = DOW_MULTIPLIERS[dow];
  const growthMult = 1 + (dayIndex / 90) * 0.027; // 2.7% growth over 90 days
  const randomNoise = 0.93 + r() * 0.14; // ±7% random noise

  let volume = baseVolume * dowMult * growthMult * randomNoise;

  if (WEATHER_DAYS.has(dayIndex)) volume *= 0.85 + r() * 0.06; // 9-15% drop
  if (SALE_DAYS.has(dayIndex)) volume *= 1.32 + r() * 0.08;   // 32-40% spike

  return Math.round(volume);
}

/**
 * Generate on-time performance given volume vs capacity and disruptions
 */
function generateOnTimeRate(volume, capacity, basePerfOTD, dayIndex, r) {
  const utilizationRatio = volume / capacity;
  const pressurePenalty = utilizationRatio > 0.90 ? (utilizationRatio - 0.90) * 0.45 : 0;
  const weatherPenalty = WEATHER_DAYS.has(dayIndex) ? 0.018 + r() * 0.012 : 0;
  const salePenalty = SALE_DAYS.has(dayIndex) ? 0.025 + r() * 0.010 : 0;
  const noiseAdj = (r() - 0.5) * 0.008;

  return Math.max(0.88, Math.min(0.995,
    basePerfOTD - pressurePenalty - weatherPenalty - salePenalty + noiseAdj
  ));
}

/**
 * Main data generation function — creates 90 days × 15 stations records
 */
export function generateDeliveryData() {
  const records = [];
  const startDate = new Date('2024-09-01');

  STATIONS.forEach((station, sIdx) => {
    for (let day = 0; day < 90; day++) {
      const r = mulberry32(sIdx * 1000 + day * 13 + 7);
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);

      const volume = generateDayVolume(
        station.operational.avg_daily_volume,
        day,
        sIdx * 199 + 17
      );
      const onTimeRate = generateOnTimeRate(
        volume, station.capacity.packages_per_day,
        station.performance.on_time_delivery, day, r
      );

      const firstAttemptRate = Math.max(0.85, onTimeRate - 0.022 - r() * 0.008);
      const damageRate = station.performance.damage_rate * (0.85 + r() * 0.3);
      const overtimeRate = Math.max(0, (volume / station.capacity.packages_per_day - 0.88) * 1.8 + (r() - 0.5) * 0.05);

      const onTimeCount = Math.round(volume * onTimeRate);
      const lateCount = Math.round(volume * (1 - onTimeRate) * 0.65);
      const failedCount = Math.round(volume * (1 - firstAttemptRate) * 0.35);
      const returnedCount = Math.round(volume * 0.012 * (0.8 + r() * 0.4));
      const damagedCount = Math.round(volume * damageRate);

      const driverHours = station.capacity.drivers * 8.5 * (1 + overtimeRate);
      const fuelCost = volume * (0.18 + r() * 0.04) + (WEATHER_DAYS.has(day) ? volume * 0.03 : 0);
      const overtimeHours = station.capacity.drivers * 8.5 * overtimeRate;

      // Predicted volume (what the forecast would have been — with realistic error)
      const forecastError = (r() - 0.5) * 0.08;
      const predictedVolume = Math.round(volume * (1 + forecastError));

      records.push({
        date: date.toISOString().split('T')[0],
        dayIndex: day,
        stationId: station.id,
        stationCode: station.code,
        actual_volume: volume,
        predicted_volume: predictedVolume,
        on_time_count: onTimeCount,
        late_count: lateCount,
        failed_count: failedCount,
        returned_count: returnedCount,
        damaged_count: damagedCount,
        on_time_rate: onTimeRate,
        first_attempt_rate: firstAttemptRate,
        damage_rate: damageRate,
        driver_hours: Math.round(driverHours * 10) / 10,
        fuel_cost: Math.round(fuelCost),
        overtime_hours: Math.round(overtimeHours * 10) / 10,
        utilization_rate: volume / station.capacity.packages_per_day,
        is_weather_disruption: WEATHER_DAYS.has(day),
        is_sale_event: SALE_DAYS.has(day),
        cost_per_package: Math.round((fuelCost / volume + 1.85 + overtimeRate * 0.8 + damagedCount * 4.5 / volume) * 100) / 100
      });
    }
  });

  return records;
}

// Lazy singleton — compute once and cache
let _cachedData = null;
export function getDeliveryData() {
  if (!_cachedData) _cachedData = generateDeliveryData();
  return _cachedData;
}

/** Filter delivery data for a specific station */
export function getStationDeliveryData(stationId) {
  return getDeliveryData().filter(r => r.stationId === stationId);
}

/** Get aggregated network totals per day */
export function getNetworkDailyTotals() {
  const data = getDeliveryData();
  const byDay = {};

  data.forEach(r => {
    if (!byDay[r.date]) {
      byDay[r.date] = {
        date: r.date,
        dayIndex: r.dayIndex,
        total_volume: 0, total_on_time: 0, total_late: 0,
        total_failed: 0, total_fuel_cost: 0, total_driver_hours: 0,
        station_count: 0
      };
    }
    const d = byDay[r.date];
    d.total_volume += r.actual_volume;
    d.total_on_time += r.on_time_count;
    d.total_late += r.late_count;
    d.total_failed += r.failed_count;
    d.total_fuel_cost += r.fuel_cost;
    d.total_driver_hours += r.driver_hours;
    d.station_count++;
  });

  return Object.values(byDay).sort((a, b) => a.dayIndex - b.dayIndex).map(d => ({
    ...d,
    on_time_rate: d.total_on_time / (d.total_volume || 1),
    avg_cost_per_package: d.total_fuel_cost / (d.total_volume || 1) + 1.85
  }));
}
