/**
 * K-Means clustering for route efficiency tiers.
 * Implemented from scratch — no external library required.
 * Clusters routes into Elite / Standard / Underperforming / Critical.
 */

import { mean, stdDev } from '../utils/calculations.js';
import { STATIONS } from '../data/stationData.js';

function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(77);

export class RouteClusterer {
  constructor(k = 4) {
    this.k = k;
    this.centroids = null;
    this.clusterLabels = ['Elite', 'Standard', 'Underperforming', 'Critical'];
  }

  /**
   * Generate synthetic route data for all stations.
   * Each route: { stopsPerHour, successRate, distance, timeAtDoor, stationId, stationCode }
   */
  generateRouteData() {
    const routes = [];

    STATIONS.forEach((station, si) => {
      const routeCount = Math.round(station.capacity.drivers * 0.8);

      for (let i = 0; i < routeCount; i++) {
        const r = mulberry32(si * 500 + i * 13 + 3);
        // Use a mixture model to generate distinct clusters
        const clusterPick = r();
        let stopsPerHour, successRate, distance;

        if (clusterPick < 0.25) {
          // Elite: 17-22 stops/h, 97-99.5% success
          stopsPerHour = 17 + r() * 5;
          successRate = 0.970 + r() * 0.025;
          distance = 55 + r() * 25;
        } else if (clusterPick < 0.65) {
          // Standard: 13-18 stops/h, 93-97% success
          stopsPerHour = 13 + r() * 5;
          successRate = 0.930 + r() * 0.040;
          distance = 65 + r() * 30;
        } else if (clusterPick < 0.88) {
          // Underperforming: 9-14 stops/h, 88-93%
          stopsPerHour = 9 + r() * 5;
          successRate = 0.880 + r() * 0.050;
          distance = 75 + r() * 35;
        } else {
          // Critical: 6-10 stops/h, 83-89%
          stopsPerHour = 6 + r() * 4;
          successRate = 0.830 + r() * 0.060;
          distance = 80 + r() * 40;
        }

        // Apply station-specific modifier
        successRate = Math.min(0.999, successRate * (0.97 + station.performance.on_time_delivery * 0.03));

        routes.push({
          id: `RT-${station.code}-${String(i + 1).padStart(3, '0')}`,
          stopsPerHour: Math.round(stopsPerHour * 10) / 10,
          successRate: Math.round(successRate * 1000) / 1000,
          distance: Math.round(distance),
          timeAtDoor: Math.round(90 + rand() * 60), // seconds
          stationId: station.id,
          stationCode: station.code,
          stationName: station.name
        });
      }
    });

    return routes;
  }

  /**
   * Normalize features to 0-1 range for K-Means.
   */
  _normalizeFeatures(routes) {
    const stopsArr = routes.map(r => r.stopsPerHour);
    const successArr = routes.map(r => r.successRate);

    const stopsMin = Math.min(...stopsArr), stopsMax = Math.max(...stopsArr);
    const successMin = Math.min(...successArr), successMax = Math.max(...successArr);

    return {
      normalized: routes.map(r => [
        (r.stopsPerHour - stopsMin) / (stopsMax - stopsMin || 1),
        (r.successRate - successMin) / (successMax - successMin || 1)
      ]),
      stopsRange: { min: stopsMin, max: stopsMax },
      successRange: { min: successMin, max: successMax }
    };
  }

  _euclidean(a, b) {
    return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
  }

  /**
   * K-Means clustering — returns routes with cluster assignments.
   */
  kMeans(routes) {
    const { normalized } = this._normalizeFeatures(routes);
    const k = this.k;

    // Initialize centroids as spread initial points
    let centroids = [
      [0.9, 0.9],   // Elite area
      [0.6, 0.6],   // Standard area
      [0.35, 0.35], // Underperforming area
      [0.1, 0.1]    // Critical area
    ];

    let assignments = new Array(routes.length).fill(0);
    let iterations = 0;

    while (iterations < 100) {
      const newAssignments = normalized.map(point => {
        let minDist = Infinity, bestCluster = 0;
        centroids.forEach((c, ci) => {
          const d = this._euclidean(point, c);
          if (d < minDist) { minDist = d; bestCluster = ci; }
        });
        return bestCluster;
      });

      if (JSON.stringify(newAssignments) === JSON.stringify(assignments)) break;
      assignments = newAssignments;

      // Update centroids
      centroids = Array.from({ length: k }, (_, ci) => {
        const clusterPoints = normalized.filter((_, i) => assignments[i] === ci);
        if (clusterPoints.length === 0) return centroids[ci];
        return [
          mean(clusterPoints.map(p => p[0])),
          mean(clusterPoints.map(p => p[1]))
        ];
      });

      iterations++;
    }

    this.centroids = centroids;

    // Sort clusters by quality (stops/hour + success rate combined)
    // Cluster with highest quality → "Elite", lowest → "Critical"
    const clusterScores = centroids.map((c, ci) => ({ ci, score: c[0] + c[1] }));
    clusterScores.sort((a, b) => b.score - a.score);
    const labelMap = {};
    clusterScores.forEach((c, rank) => {
      labelMap[c.ci] = this.clusterLabels[rank];
    });

    return routes.map((route, i) => ({
      ...route,
      cluster: labelMap[assignments[i]] || 'Standard',
      clusterIndex: assignments[i]
    }));
  }

  /**
   * Compute aggregate stats per cluster.
   */
  getClusterStats(clusteredRoutes) {
    const clusters = {};
    this.clusterLabels.forEach(label => { clusters[label] = []; });

    clusteredRoutes.forEach(r => {
      if (clusters[r.cluster]) clusters[r.cluster].push(r);
    });

    return this.clusterLabels.map(label => {
      const routes = clusters[label] || [];
      if (routes.length === 0) return { label, count: 0 };

      const avgStops = mean(routes.map(r => r.stopsPerHour));
      const avgSuccess = mean(routes.map(r => r.successRate));
      const avgDistance = mean(routes.map(r => r.distance));
      const pct = ((routes.length / clusteredRoutes.length) * 100).toFixed(0);

      return {
        label,
        count: routes.length,
        pct,
        avgStopsPerHour: Math.round(avgStops * 10) / 10,
        avgSuccessRate: Math.round(avgSuccess * 1000) / 1000,
        avgDistance: Math.round(avgDistance),
        insight: this._getClusterInsight(label, avgStops, avgSuccess, avgDistance, routes.length, clusteredRoutes.length),
        recommendation: this._getClusterRecommendation(label, avgStops, avgSuccess, pct)
      };
    });
  }

  _getClusterInsight(label, stops, success, distance, count, total) {
    const pct = ((count / total) * 100).toFixed(0);
    switch (label) {
      case 'Elite':
        return `Elite routes average ${stops.toFixed(1)} stops/hour with ${(success * 100).toFixed(1)}% delivery success rate. Key pattern: compact geographies with predictable access and high address density. ${pct}% of the network fleet operates at this tier.`;
      case 'Standard':
        return `Standard routes represent the core operational tier at ${pct}% of routes. Averaging ${stops.toFixed(1)} stops/hour with ${(success * 100).toFixed(1)}% success rate, these routes operate within acceptable KPI bounds but have clear upside potential.`;
      case 'Underperforming':
        return `Underperforming routes (${pct}% of fleet) average only ${stops.toFixed(1)} stops/hour — ${((18.3 - stops) / 18.3 * 100).toFixed(0)}% below Elite tier efficiency. Common factors: rural coverage, long inter-stop distances (avg ${distance} km), multi-floor residential buildings.`;
      case 'Critical':
        return `Critical routes (${pct}% of fleet) require immediate intervention. At ${stops.toFixed(1)} stops/hour and ${(success * 100).toFixed(1)}% success, these routes incur significantly elevated costs and customer impact. Immediate redesign recommended.`;
      default:
        return '';
    }
  }

  _getClusterRecommendation(label, stops, success, pct) {
    switch (label) {
      case 'Elite':
        return 'Use as template for route design in similar geographies. Extract best practices for driver training programme. Prioritise route preservation during any network restructuring.';
      case 'Standard':
        return 'Identify the top 20% of Standard routes closest to Elite thresholds and prioritise for sequence optimisation. Target: move 15% of Standard routes to Elite within 90 days.';
      case 'Underperforming':
        return 'Conduct route redesign workshop. Evaluate access point partnerships in high-density areas. Implement driver training for time-at-door efficiency. Target: reduce this cluster by 30% within 60 days.';
      case 'Critical':
        return 'Escalate to Regional Ops Manager. Redesign route sequences immediately. Consider temporary volume reallocation to adjacent stations while redesign is in progress. Target: zero Critical routes within 30 days.';
      default:
        return '';
    }
  }
}

export default RouteClusterer;
