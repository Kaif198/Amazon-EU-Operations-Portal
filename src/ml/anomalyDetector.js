/**
 * Statistical anomaly detector using Z-score + IQR hybrid method.
 * Generates root cause hypotheses from co-occurring anomaly patterns.
 */

import { mean, stdDev, percentile } from '../utils/calculations.js';

export class AnomalyDetector {
  /**
   * Detect anomalies in a station's time series data.
   *
   * stationRecords — array of daily delivery records for one station
   * windowDays     — rolling window for computing mean/std (default 30)
   * zThreshold     — Z-score threshold for flagging (default 2.0)
   *
   * Returns array of anomaly objects sorted by severity desc.
   */
  detect(stationRecords, windowDays = 30, zThreshold = 2.0) {
    if (!stationRecords || stationRecords.length < windowDays + 1) return [];

    const METRICS = [
      { key: 'actual_volume', label: 'Daily Volume', higherIsBad: false },
      { key: 'on_time_rate', label: 'On-Time Delivery Rate', higherIsBad: false },
      { key: 'damage_rate', label: 'Damage Rate', higherIsBad: true },
      { key: 'overtime_hours', label: 'Overtime Hours', higherIsBad: true },
      { key: 'utilization_rate', label: 'Station Utilisation', higherIsBad: true },
      { key: 'cost_per_package', label: 'Cost Per Package', higherIsBad: true },
      { key: 'fuel_cost', label: 'Fuel Cost', higherIsBad: true }
    ];

    const anomalies = [];

    METRICS.forEach(metric => {
      // For each day with sufficient history, compute rolling stats
      for (let i = windowDays; i < stationRecords.length; i++) {
        const window = stationRecords.slice(i - windowDays, i).map(r => r[metric.key]).filter(v => v !== null && v !== undefined);
        if (window.length < 10) continue;

        const current = stationRecords[i][metric.key];
        if (current === null || current === undefined) continue;

        const windowMean = mean(window);
        const windowStd = stdDev(window) || windowMean * 0.05;
        const zScore = (current - windowMean) / windowStd;

        // IQR method
        const q1 = percentile(window, 25);
        const q3 = percentile(window, 75);
        const iqr = q3 - q1;
        const lowerFence = q1 - 1.5 * iqr;
        const upperFence = q3 + 1.5 * iqr;
        const iqrFlagged = current < lowerFence || current > upperFence;

        const zFlagged = Math.abs(zScore) > zThreshold;
        const absZ = Math.abs(zScore);

        if (!zFlagged && !iqrFlagged) continue;

        const severity = absZ >= 3 ? 'High' : absZ >= 2 ? 'Medium' : 'Low';
        const method = zFlagged && iqrFlagged ? 'Confirmed' : zFlagged ? 'Z-Score' : 'IQR';
        const confidence = zFlagged && iqrFlagged ? 'Confirmed' : 'Potential';

        const expectedMin = Math.round((windowMean - windowStd) * 1000) / 1000;
        const expectedMax = Math.round((windowMean + windowStd) * 1000) / 1000;

        anomalies.push({
          stationId: stationRecords[i].stationId,
          stationCode: stationRecords[i].stationCode,
          date: stationRecords[i].date,
          dayIndex: i,
          metric: metric.key,
          metricLabel: metric.label,
          value: Math.round(current * 10000) / 10000,
          expected: Math.round(windowMean * 10000) / 10000,
          expectedRange: `${metric.key.includes('rate') ? (expectedMin * 100).toFixed(1) + '% – ' + (expectedMax * 100).toFixed(1) + '%' : Math.round(expectedMin) + ' – ' + Math.round(expectedMax)}`,
          deviation: Math.round(zScore * 10) / 10,
          severity,
          method,
          confidence,
          higherIsBad: metric.higherIsBad,
          isWorrying: metric.higherIsBad ? zScore > zThreshold : zScore < -zThreshold
        });
      }
    });

    return anomalies
      .sort((a, b) => {
        const sevOrder = { High: 0, Medium: 1, Low: 2 };
        return (sevOrder[a.severity] ?? 3) - (sevOrder[b.severity] ?? 3);
      });
  }

  /**
   * Generate rule-based root cause hypotheses for co-occurring anomalies.
   * Looks at the pattern of which metrics are anomalous together.
   */
  generateHypotheses(anomalies) {
    const byDate = {};
    anomalies.forEach(a => {
      if (!byDate[a.date]) byDate[a.date] = [];
      byDate[a.date].push(a);
    });

    const hypotheses = [];

    Object.entries(byDate).forEach(([date, dayAnomalies]) => {
      const metrics = new Set(dayAnomalies.map(a => a.metric));
      const has = m => metrics.has(m);

      // Pattern: Demand surge without capacity response
      if (has('actual_volume') && !has('on_time_rate') && has('overtime_hours')) {
        hypotheses.push({
          date,
          hypothesis: 'Demand surge without proportional capacity increase',
          action: 'Activate pre-approved flex driver pool. Review forecast model accuracy for this day-of-week.',
          severity: 'High',
          pattern: 'volume-spike'
        });
      }

      // Pattern: OTD decline + volume normal → process issue
      if (has('on_time_rate') && !has('actual_volume') && has('damage_rate')) {
        hypotheses.push({
          date,
          hypothesis: 'Process quality degradation — investigate sort operations and loading procedures',
          action: 'Conduct sort audit. Review vehicle load quality checks. Identify shift-specific patterns.',
          severity: 'High',
          pattern: 'quality-degradation'
        });
      }

      // Pattern: Fuel cost spike + distance increase → routing issue
      if (has('fuel_cost') && !has('actual_volume')) {
        hypotheses.push({
          date,
          hypothesis: 'Route inefficiency — potential routing algorithm issue or traffic disruption',
          action: 'Review routing algorithm output for anomalous sequences. Check traffic incident reports.',
          severity: 'Medium',
          pattern: 'route-inefficiency'
        });
      }

      // Pattern: High utilization + OTD decline → capacity constrained
      if (has('utilization_rate') && has('on_time_rate')) {
        hypotheses.push({
          date,
          hypothesis: 'Capacity-constrained performance degradation — station operating above sustainable threshold',
          action: 'Initiate emergency flex driver activation. Consider routing volume overflow to adjacent station.',
          severity: 'High',
          pattern: 'capacity-constraint'
        });
      }

      // Pattern: Cost spike alone
      if (has('cost_per_package') && !has('actual_volume') && !has('on_time_rate')) {
        hypotheses.push({
          date,
          hypothesis: 'Cost efficiency anomaly without volume or quality change — investigate fuel or overtime charges',
          action: 'Review fuel receipts and overtime approvals. Check vehicle maintenance records.',
          severity: 'Medium',
          pattern: 'cost-spike'
        });
      }

      // Generic fallback
      if (dayAnomalies.length > 0 && !hypotheses.find(h => h.date === date)) {
        hypotheses.push({
          date,
          hypothesis: `Isolated ${dayAnomalies[0].metricLabel} anomaly — monitor for 2+ consecutive days before escalating`,
          action: 'Log in station ops journal. Review with shift manager at next stand-up.',
          severity: 'Low',
          pattern: 'isolated'
        });
      }
    });

    return hypotheses.sort((a, b) => {
      const sevOrder = { High: 0, Medium: 1, Low: 2 };
      return (sevOrder[a.severity] ?? 3) - (sevOrder[b.severity] ?? 3);
    });
  }

  /**
   * Generate a root cause tree structure for the RootCauseTree component.
   * Takes a primary anomaly and builds a branching investigation tree.
   */
  buildRootCauseTree(primaryAnomaly, relatedAnomalies = []) {
    if (!primaryAnomaly) return null;

    const branches = [];

    // Branch based on related anomaly patterns
    if (relatedAnomalies.some(a => a.metric === 'actual_volume')) {
      branches.push({
        label: 'Volume Spike Detected',
        severity: 'high',
        description: `Volume ${relatedAnomalies.find(a => a.metric === 'actual_volume')?.deviation > 0 ? 'exceeded' : 'fell below'} expected range`,
        action: 'Validate against forecast — trigger model retrain if error >10%',
        children: [
          { label: 'Forecast Model Accuracy Check', severity: 'medium', description: 'Compare predicted vs actual for last 14 days', action: 'Retrain LSTM model with latest data' },
          { label: 'DSP Capacity Review', severity: 'medium', description: 'Verify driver and vehicle availability matches planned schedule', action: 'Escalate to DSP account manager if shortfall confirmed' }
        ]
      });
    }

    if (relatedAnomalies.some(a => a.metric === 'overtime_hours')) {
      branches.push({
        label: 'Overtime Hours Elevated',
        severity: 'medium',
        description: `Overtime ${Math.abs(relatedAnomalies.find(a => a.metric === 'overtime_hours')?.deviation).toFixed(1)}σ above normal`,
        action: 'Review shift schedule vs actual working hours',
        children: [
          { label: 'DSP Scheduling Conflict', severity: 'medium', description: 'Driver shortage vs plan may indicate DSP attendance issue', action: 'Escalate to DSP account manager for root cause' }
        ]
      });
    }

    if (relatedAnomalies.some(a => a.metric === 'damage_rate')) {
      branches.push({
        label: 'Sort Quality Issue',
        severity: 'high',
        description: 'Elevated damage rate correlated with sort process',
        action: 'Schedule preventive maintenance inspection',
        children: [
          { label: 'Equipment Maintenance Backlog', severity: 'medium', description: 'Sort belt or conveyor maintenance may be overdue', action: 'Raise maintenance ticket — target resolution within 48h' }
        ]
      });
    }

    if (branches.length === 0) {
      branches.push({
        label: 'No correlated anomalies identified',
        severity: 'low',
        description: 'This appears to be an isolated deviation',
        action: 'Monitor for 2+ additional days before escalating'
      });
    }

    return {
      label: `${primaryAnomaly.metricLabel} Anomaly — ${primaryAnomaly.stationCode}`,
      severity: primaryAnomaly.severity === 'High' ? 'high' : primaryAnomaly.severity === 'Medium' ? 'medium' : 'low',
      description: `${primaryAnomaly.confidence} anomaly: value ${primaryAnomaly.value} vs expected ${primaryAnomaly.expected} (${primaryAnomaly.deviation}σ)`,
      children: branches
    };
  }
}

export default AnomalyDetector;
