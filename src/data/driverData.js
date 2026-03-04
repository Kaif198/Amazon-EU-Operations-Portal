/**
 * DSP (Delivery Service Partner) driver performance data.
 * 200 simulated drivers across all 15 EU stations.
 */

import { STATIONS } from './stationData.js';

function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  'James', 'Oliver', 'Mohammed', 'Liam', 'Noah', 'Lucas', 'Ethan', 'Daniel',
  'Emma', 'Sophie', 'Aisha', 'Maria', 'Elena', 'Laura', 'Fatima', 'Ana',
  'Thomas', 'Stefan', 'Pierre', 'Marco', 'Jan', 'Carlos', 'Ahmed', 'Patrick'
];
const LAST_NAMES = [
  'Smith', 'Jones', 'Williams', 'Brown', 'Taylor', 'Davies', 'Evans',
  'Muller', 'Schmidt', 'Fischer', 'Dupont', 'Martin', 'Bernard', 'Garcia',
  'Rodriguez', 'Rossi', 'Ferrari', 'Bakker', 'De Jong', 'Kelly', 'Murphy'
];

const DSP_COMPANIES = [
  'SwiftRoute Ltd', 'FastPath Logistics', 'Urban Courier Group',
  'MetroDelivery BV', 'EuroExpress DSP', 'CityLink Solutions',
  'LastMile Pro', 'FlexiDrive GmbH'
];

/**
 * Generate driver roster with realistic performance metrics.
 * ~13-14 drivers per station (scaled to match station capacity).
 */
export function generateDriverData() {
  const drivers = [];
  let driverId = 1001;

  STATIONS.forEach((station, sIdx) => {
    const driverCount = Math.round(station.capacity.drivers * 0.1); // 10% sample
    const rand = mulberry32(sIdx * 307 + 42);

    for (let i = 0; i < driverCount; i++) {
      const r = mulberry32(driverId * 13 + 7);
      const tenure = Math.floor(r() * 48) + 1; // 1-48 months

      // Performance correlates loosely with tenure
      const tenureBonus = Math.min(0.06, tenure * 0.0012);
      const baseOTD = station.performance.on_time_delivery;

      const stopsPerHour = 12 + r() * 10; // 12-22 stops/hour
      const successRate = Math.max(0.88, baseOTD + tenureBonus + (r() - 0.5) * 0.04);
      const attendanceRate = Math.max(0.80, 0.94 + (r() - 0.5) * 0.10);
      const defectRate = Math.max(0, station.performance.damage_rate * (0.5 + r() * 1.0));
      const customerScore = Math.max(3.5, Math.min(5.0,
        station.performance.customer_satisfaction + (r() - 0.5) * 0.6
      ));

      drivers.push({
        id: `DRV-${driverId}`,
        name: `${FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`,
        stationId: station.id,
        stationCode: station.code,
        dspCompany: DSP_COMPANIES[Math.floor(rand() * DSP_COMPANIES.length)],
        tenure_months: tenure,
        weekly_avg_stops: Math.round(stopsPerHour * 8.5 * 5),
        stops_per_hour: Math.round(stopsPerHour * 10) / 10,
        success_rate: Math.round(successRate * 1000) / 1000,
        attendance_rate: Math.round(attendanceRate * 1000) / 1000,
        defect_rate: Math.round(defectRate * 10000) / 10000,
        customer_score: Math.round(customerScore * 10) / 10,
        packages_last_30d: Math.round(stopsPerHour * 8.5 * 20 * (0.9 + rand() * 0.2)),
        performance_tier: stopsPerHour >= 18 && successRate >= 0.96
          ? 'Elite'
          : stopsPerHour >= 14 && successRate >= 0.93
            ? 'Standard'
            : stopsPerHour >= 11 && successRate >= 0.90
              ? 'Underperforming'
              : 'Critical'
      });

      driverId++;
    }
  });

  return drivers;
}

let _cachedDrivers = null;
export function getDriverData() {
  if (!_cachedDrivers) _cachedDrivers = generateDriverData();
  return _cachedDrivers;
}

export function getStationDrivers(stationId) {
  return getDriverData().filter(d => d.stationId === stationId);
}
