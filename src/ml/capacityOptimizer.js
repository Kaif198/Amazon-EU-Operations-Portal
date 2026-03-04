/**
 * Constraint-based capacity optimizer.
 * Computes optimal driver allocation, identifies gaps, and recommends rebalancing.
 */

import { STATIONS } from '../data/stationData.js';

const PACKAGES_PER_DRIVER_PER_DAY = 110;
const IDLE_DRIVER_COST_EUR = 180;
const LATE_PACKAGE_PENALTY_EUR = 4.5;
const FLEX_DRIVER_COST_EUR = 180;

export class CapacityOptimizer {
  /**
   * Optimize driver allocation across all stations for a given set of forecasted volumes.
   *
   * forecastedVolumes — { [stationId]: [vol_day1, vol_day2, ..., vol_day7] }
   * Returns daily plans with gaps, costs, and rebalancing recommendations.
   */
  optimize(forecastedVolumes) {
    const days = 7;
    const dayLabels = this._generateDayLabels(days);
    const dailyPlans = [];

    for (let d = 0; d < days; d++) {
      const stationPlans = STATIONS.map(station => {
        const forecasted = forecastedVolumes[station.id]?.[d] ?? station.operational.avg_daily_volume;
        const capacity = station.capacity.packages_per_day;
        const availableDrivers = station.capacity.drivers;

        const requiredDrivers = Math.ceil(forecasted / PACKAGES_PER_DRIVER_PER_DAY);
        const driverGap = availableDrivers - requiredDrivers;
        const volumeGap = capacity - forecasted;
        const utilization = forecasted / capacity;

        const idleCost = Math.max(0, driverGap) * IDLE_DRIVER_COST_EUR;
        const deficitDrivers = Math.max(0, -driverGap);
        const flexCost = deficitDrivers * FLEX_DRIVER_COST_EUR;
        const estimatedLatePackages = utilization > 0.95
          ? Math.round(forecasted * (utilization - 0.95) * 0.8)
          : 0;
        const latePenalty = estimatedLatePackages * LATE_PACKAGE_PENALTY_EUR;

        return {
          stationId: station.id,
          stationCode: station.code,
          stationName: station.name,
          forecasted: Math.round(forecasted),
          capacity,
          utilization,
          availableDrivers,
          requiredDrivers,
          driverGap,
          volumeGap: Math.round(volumeGap),
          status: utilization >= 0.95 ? 'critical'
            : utilization >= 0.85 ? 'warning'
            : utilization < 0.65 ? 'surplus'
            : 'healthy',
          idleCost: Math.round(idleCost),
          flexCost: Math.round(flexCost),
          latePenalty: Math.round(latePenalty),
          totalCost: Math.round(idleCost + flexCost + latePenalty),
          flexDriversNeeded: deficitDrivers
        };
      });

      const networkCost = stationPlans.reduce((s, p) => s + p.totalCost, 0);
      const criticalCount = stationPlans.filter(p => p.status === 'critical').length;
      const warningCount = stationPlans.filter(p => p.status === 'warning').length;

      dailyPlans.push({
        dayIndex: d,
        dayLabel: dayLabels[d],
        stationPlans,
        networkCost: Math.round(networkCost),
        criticalCount,
        warningCount,
        totalForecasted: stationPlans.reduce((s, p) => s + p.forecasted, 0),
        totalCapacity: stationPlans.reduce((s, p) => s + p.capacity, 0)
      });
    }

    const rebalancing = this._generateRebalancingRecommendations(dailyPlans);
    const costSummary = this._computeCostSummary(dailyPlans);

    return { dailyPlans, rebalancing, costSummary };
  }

  /**
   * Generate rebalancing recommendations — match surplus stations with deficit stations.
   */
  _generateRebalancingRecommendations(dailyPlans) {
    const recommendations = [];

    // Aggregate surplus/deficit by station across the 7-day window
    const stationSummary = {};
    STATIONS.forEach(s => {
      stationSummary[s.id] = {
        station: s,
        avgDriverGap: 0,
        daysDeficit: 0,
        daysSurplus: 0,
        totalFlexCost: 0,
        totalIdleCost: 0
      };
    });

    dailyPlans.forEach(day => {
      day.stationPlans.forEach(p => {
        const summary = stationSummary[p.stationId];
        if (!summary) return;
        summary.avgDriverGap += p.driverGap / dailyPlans.length;
        if (p.driverGap < -2) summary.daysDeficit++;
        if (p.driverGap > 5) summary.daysSurplus++;
        summary.totalFlexCost += p.flexCost;
        summary.totalIdleCost += p.idleCost;
      });
    });

    // Find deficit-surplus pairs in same country
    const deficitStations = Object.values(stationSummary)
      .filter(s => s.daysDeficit >= 2 && s.avgDriverGap < -3)
      .sort((a, b) => a.avgDriverGap - b.avgDriverGap);

    const surplusStations = Object.values(stationSummary)
      .filter(s => s.daysSurplus >= 2 && s.avgDriverGap > 5)
      .sort((a, b) => b.avgDriverGap - a.avgDriverGap);

    deficitStations.forEach(deficit => {
      const matchedSurplus = surplusStations.find(surplus =>
        surplus.station.country === deficit.station.country
      );
      if (!matchedSurplus) return;

      const transferDrivers = Math.min(
        Math.ceil(Math.abs(deficit.avgDriverGap)),
        Math.floor(matchedSurplus.avgDriverGap * 0.7)
      );
      if (transferDrivers < 1) return;

      const affectedDays = dailyPlans
        .filter(day => {
          const defPlan = day.stationPlans.find(p => p.stationId === deficit.station.id);
          return defPlan && defPlan.driverGap < -2;
        })
        .map(d => d.dayLabel);

      const estimatedOTDImprovement = transferDrivers * 0.008;
      const remainingUtilization = 1 - (matchedSurplus.avgDriverGap - transferDrivers) /
        matchedSurplus.station.capacity.drivers;

      recommendations.push({
        id: `REB-${deficit.station.code}-${matchedSurplus.station.code}`,
        fromStation: matchedSurplus.station,
        toStation: deficit.station,
        drivers: transferDrivers,
        affectedDays,
        estimatedOTDImprovement,
        remainingFromUtilization: Math.round(remainingUtilization * 100),
        estimatedCostSaving: Math.round(transferDrivers * FLEX_DRIVER_COST_EUR * affectedDays.length),
        rationale: `${matchedSurplus.station.name} averages +${matchedSurplus.avgDriverGap.toFixed(1)} drivers surplus over the 7-day window. Transferring ${transferDrivers} drivers to ${deficit.station.name} (${deficit.avgDriverGap.toFixed(1)} driver deficit) improves ${deficit.station.name}'s on-time delivery by approximately ${(estimatedOTDImprovement * 100).toFixed(1)} percentage points. ${matchedSurplus.station.name} remains above minimum threshold at ${(remainingUtilization * 100).toFixed(0)}% utilisation.`
      });
    });

    return recommendations;
  }

  _computeCostSummary(dailyPlans) {
    const totalFlex = dailyPlans.flatMap(d => d.stationPlans).reduce((s, p) => s + p.flexCost, 0);
    const totalIdle = dailyPlans.flatMap(d => d.stationPlans).reduce((s, p) => s + p.idleCost, 0);
    const totalPenalty = dailyPlans.flatMap(d => d.stationPlans).reduce((s, p) => s + p.latePenalty, 0);
    return {
      totalFlexCost: Math.round(totalFlex),
      totalIdleCost: Math.round(totalIdle),
      totalLatePenalty: Math.round(totalPenalty),
      totalCost: Math.round(totalFlex + totalIdle + totalPenalty)
    };
  }

  /**
   * What-if simulation — user changes scenario variables, sees updated output.
   */
  simulate(baseScenario, changes) {
    const { volume_change_pct = 0, driver_change = 0, vehicle_change = 0 } = changes;

    const newVolume = baseScenario.operational.avg_daily_volume * (1 + volume_change_pct / 100);
    const newDrivers = baseScenario.capacity.drivers + driver_change;
    const newCapacity = baseScenario.capacity.packages_per_day * (newDrivers / baseScenario.capacity.drivers);
    const newUtilization = newVolume / newCapacity;

    const requiredDrivers = Math.ceil(newVolume / PACKAGES_PER_DRIVER_PER_DAY);
    const driverGap = newDrivers - requiredDrivers;
    const idleCost = Math.max(0, driverGap) * IDLE_DRIVER_COST_EUR;
    const flexCost = Math.max(0, -driverGap) * FLEX_DRIVER_COST_EUR;
    const lateRate = Math.max(0, (newUtilization - 0.95) * 0.8);
    const latePenalty = Math.round(newVolume * lateRate * LATE_PACKAGE_PENALTY_EUR);

    const utilizationPenalty = Math.max(0, (newUtilization - 0.85) * 0.45);
    const newOTD = Math.max(0.85, baseScenario.performance.on_time_delivery - utilizationPenalty);

    return {
      newVolume: Math.round(newVolume),
      newCapacity: Math.round(newCapacity),
      newUtilization,
      newOTD,
      newDrivers,
      driverGap,
      dailyCost: Math.round(idleCost + flexCost + latePenalty),
      idleCost: Math.round(idleCost),
      flexCost: Math.round(flexCost),
      latePenalty,
      netCostVsBaseline: Math.round(idleCost + flexCost + latePenalty - baseScenario.baseDailyCost)
    };
  }

  _generateDayLabels(count) {
    const labels = [];
    const now = new Date('2024-12-02');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 0; i < count; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      labels.push(`${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`);
    }
    return labels;
  }

  /**
   * Generate capacity heatmap data for HeatmapGrid component.
   */
  buildHeatmapData(dailyPlans) {
    return STATIONS.map(station => {
      return dailyPlans.map(day => {
        const plan = day.stationPlans.find(p => p.stationId === station.id);
        if (!plan) return null;
        return {
          utilization: plan.utilization,
          forecasted: plan.forecasted,
          capacity: plan.capacity,
          gap: plan.volumeGap
        };
      });
    });
  }
}

export default CapacityOptimizer;
