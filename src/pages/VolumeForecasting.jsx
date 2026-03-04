import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import PageTransition from '../components/layout/PageTransition.jsx';
import MetricCard from '../components/common/MetricCard.jsx';
import AmazonButton from '../components/common/AmazonButton.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import TimeSeriesChart from '../components/charts/TimeSeriesChart.jsx';
import { STATIONS } from '../data/stationData.js';
import { getStationDeliveryData } from '../data/deliveryData.js';
import { getTrainingVolumes } from '../data/forecastData.js';
import { VolumeForecaster } from '../ml/volumeForecaster.js';
import { formatNumber, formatPct, formatEUR, formatDate, formatDayOfWeek } from '../utils/formatters.js';
import { mean, stdDev } from '../utils/calculations.js';
import { generateCapacityWarning } from '../utils/strategicFrameworks.js';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function VolumeForecasting() {
  const [selectedId, setSelectedId] = useState(STATIONS[0].id);
  const [training, setTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [trainedMetrics, setTrainedMetrics] = useState(null);
  const [forecasts, setForecasts] = useState(null);
  const [lossHistory, setLossHistory] = useState([]);
  const [error, setError] = useState(null);
  const forecasterRef = useRef(null);

  const station = STATIONS.find(s => s.id === selectedId);
  const deliveryRecords = useMemo(() => getStationDeliveryData(selectedId), [selectedId]);
  const historicalVolumes = useMemo(() => getTrainingVolumes(selectedId), [selectedId]);

  // Chart data: historical + forecast
  const chartData = useMemo(() => {
    const hist = deliveryRecords.slice(-45).map(r => ({
      date: r.date,
      actual: r.actual_volume,
      type: 'actual'
    }));

    if (!forecasts) return hist;

    const lastDate = new Date(hist[hist.length - 1]?.date || '2024-11-29');
    const forecastPoints = forecasts.predictions.map((vol, i) => {
      const d = new Date(lastDate);
      d.setDate(d.getDate() + i + 1);
      return {
        date: d.toISOString().split('T')[0],
        forecast: Math.round(vol),
        forecastUpper: Math.round(forecasts.upper[i]),
        forecastLower: Math.round(forecasts.lower[i]),
        type: 'forecast'
      };
    });

    return [...hist, ...forecastPoints];
  }, [deliveryRecords, forecasts]);

  const forecastBoundaryDate = forecasts
    ? deliveryRecords[deliveryRecords.length - 1]?.date
    : null;

  const handleTrain = useCallback(async () => {
    setTraining(true);
    setProgress(0);
    setCurrentEpoch(0);
    setLossHistory([]);
    setError(null);
    setForecasts(null);

    try {
      if (forecasterRef.current) forecasterRef.current.dispose();
      const forecaster = new VolumeForecaster();
      forecasterRef.current = forecaster;

      const lossData = [];
      forecaster.onProgress = (epoch, total, loss, valLoss) => {
        setProgress(Math.round((epoch / total) * 100));
        setCurrentEpoch(epoch);
        lossData.push({ epoch, loss: Math.round(loss * 10000) / 10000, valLoss: valLoss ? Math.round(valLoss * 10000) / 10000 : null });
        setLossHistory([...lossData]);
      };

      const metrics = await forecaster.buildAndTrain(historicalVolumes, 50);
      setTrainedMetrics(metrics);

      // Predict next 7 days
      const recentVolumes = historicalVolumes.slice(-14);
      const predictions = await forecaster.predict(recentVolumes);
      const ci = forecaster.getConfidenceInterval(predictions, historicalVolumes);

      setForecasts({ predictions, upper: ci.upper, lower: ci.lower });
    } catch (err) {
      setError(err.message);
    } finally {
      setTraining(false);
    }
  }, [historicalVolumes]);

  // Generate 7 forecast day objects with capacity risk
  const forecastDays = useMemo(() => {
    if (!forecasts) return [];
    const startDate = new Date('2024-12-02');
    return forecasts.predictions.map((vol, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
      const utilization = vol / station.capacity.packages_per_day;
      const riskLevel = utilization >= 1.0 ? 'Critical'
        : utilization >= 0.90 ? 'At Risk'
        : 'Healthy';

      return {
        date: d.toISOString().split('T')[0],
        dow,
        volume: Math.round(vol),
        lower: Math.round(forecasts.lower[i]),
        upper: Math.round(forecasts.upper[i]),
        utilization,
        riskLevel,
        excessVolume: Math.max(0, Math.round(vol - station.capacity.packages_per_day))
      };
    });
  }, [forecasts, station]);

  const capacityWarningDays = forecastDays.filter(d => d.riskLevel !== 'Healthy');

  return (
    <PageTransition>
      <div style={{ padding: '24px', backgroundColor: '#EAEDED', minHeight: '100%' }}>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F1111', margin: 0 }}>Volume Forecast</h1>
            <div style={{ fontSize: '13px', color: '#565959', marginTop: '4px' }}>
              LSTM Neural Network — 7-day delivery volume prediction per station
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={selectedId}
              onChange={e => { setSelectedId(e.target.value); setForecasts(null); setTrainedMetrics(null); setLossHistory([]); }}
              style={{ padding: '6px 10px', border: '1px solid #DDD', borderRadius: '4px', fontSize: '13px', backgroundColor: '#FFF', minWidth: '180px' }}
            >
              {STATIONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <AmazonButton variant="primary" onClick={handleTrain} disabled={training}>
              {training ? `Training... Epoch ${currentEpoch}/50` : 'Train Model'}
            </AmazonButton>
          </div>
        </div>

        {/* Model status card */}
        <div className="amazon-card" style={{ padding: '16px', marginBottom: '16px', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Model Architecture</div>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>LSTM Neural Network (32 units, 14-day lookback)</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Training Samples</div>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>{formatNumber(historicalVolumes.length - 14)} sequences</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Station</div>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>{station.name}</div>
          </div>
          {trainedMetrics && (
            <>
              <div>
                <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>MAPE</div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: trainedMetrics.mape < 6 ? '#067D62' : '#C7511F' }}>{trainedMetrics.mape}%</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>RMSE</div>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>{formatNumber(trainedMetrics.rmse)}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>R²</div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: trainedMetrics.r2 > 0.85 ? '#067D62' : '#C7511F' }}>{trainedMetrics.r2}</div>
              </div>
            </>
          )}
          {!trainedMetrics && !training && (
            <div style={{ fontSize: '13px', color: '#999' }}>
              Click "Train Model" to run the LSTM on historical data and generate a 7-day forecast.
            </div>
          )}
        </div>

        {/* Training progress */}
        {training && (
          <div className="amazon-card" style={{ padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
              <span style={{ fontWeight: 600 }}>Training in browser... Epoch {currentEpoch}/50</span>
              <span style={{ color: '#565959' }}>{progress}% complete</span>
            </div>
            <div style={{ height: '8px', backgroundColor: '#EEE', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#FF9900',
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }} />
            </div>
            {lossHistory.length > 0 && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#565959' }}>
                Current Loss: {lossHistory[lossHistory.length - 1]?.loss?.toFixed(6)}
                {lossHistory[lossHistory.length - 1]?.valLoss && ` | Val Loss: ${lossHistory[lossHistory.length - 1].valLoss.toFixed(6)}`}
              </div>
            )}
          </div>
        )}

        {/* Loss curve */}
        {lossHistory.length > 2 && !training && (
          <div className="amazon-card" style={{ padding: '20px', marginBottom: '16px' }}>
            <div className="section-header">Training Loss Curve</div>
            <TimeSeriesChart
              data={lossHistory}
              series={[
                { key: 'loss', label: 'Training Loss', color: '#232F3E' },
                { key: 'valLoss', label: 'Validation Loss', color: '#FF9900', dashed: true }
              ]}
              xKey="epoch"
              height={180}
              xFormatter={v => `Epoch ${v}`}
              yFormatter={v => v.toFixed(4)}
              tooltipFormatter={(v, name) => [v?.toFixed(6), name]}
            />
            {trainedMetrics && (
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#565959', lineHeight: 1.6 }}>
                <strong>Model Interpretation:</strong> A MAPE of {trainedMetrics.mape}% means predictions are typically within {trainedMetrics.mape}% of actual volumes — equivalent to approximately ±{formatNumber(Math.round(station.operational.avg_daily_volume * trainedMetrics.mape / 100))} packages for {station.name}. {trainedMetrics.mape < 6 ? 'This accuracy is sufficient for weekly capacity planning decisions.' : 'Consider collecting more historical data or adjusting training epochs to improve accuracy.'}
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div style={{ padding: '16px', backgroundColor: '#FDECEA', border: '1px solid #CC0C39', borderRadius: '4px', marginBottom: '16px', color: '#CC0C39', fontSize: '13px' }}>
            <strong>Model Error:</strong> {error}. Try selecting a different station or refreshing the page.
          </div>
        )}

        {/* Main forecast chart */}
        <div className="amazon-card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div className="section-header" style={{ marginBottom: 0, borderBottom: 'none' }}>
              {station.name} — Historical Volume + {forecasts ? '7-Day Forecast' : '45-Day History'}
            </div>
            <div style={{ fontSize: '12px', color: '#565959' }}>
              Capacity: {formatNumber(station.capacity.packages_per_day)} pkg/day
            </div>
          </div>
          <TimeSeriesChart
            data={chartData}
            series={[
              { key: 'actual', label: 'Actual Volume', color: '#232F3E', strokeWidth: 2 },
              ...(forecasts ? [
                { key: 'forecast', label: '7-Day Forecast', color: '#FF9900', dashed: true, strokeWidth: 2 },
                { key: 'forecastUpper', label: 'Upper Bound', color: '#FF9900', strokeWidth: 1, dashed: true },
                { key: 'forecastLower', label: 'Lower Bound', color: '#FF9900', strokeWidth: 1, dashed: true },
              ] : [])
            ]}
            xKey="date"
            height={340}
            referenceLineX={forecastBoundaryDate}
          />
        </div>

        {/* Forecast table + risk assessment */}
        {forecasts && forecastDays.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {/* Day-by-day forecast table */}
            <div className="amazon-card" style={{ padding: '20px' }}>
              <div className="section-header">7-Day Forecast Detail</div>
              <table className="amazon-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th style={{ textAlign: 'right' }}>Forecast</th>
                    <th style={{ textAlign: 'right' }}>Range</th>
                    <th style={{ textAlign: 'right' }}>Utilisation</th>
                    <th>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastDays.map((day, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{day.dow} {formatDate(day.date).split(' ')[0]} {formatDate(day.date).split(' ')[1]}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatNumber(day.volume)}</td>
                      <td style={{ textAlign: 'right', color: '#565959', fontSize: '11px' }}>{formatNumber(day.lower)}–{formatNumber(day.upper)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ color: day.utilization >= 0.95 ? '#CC0C39' : day.utilization >= 0.85 ? '#C7511F' : '#067D62', fontWeight: 600 }}>
                          {formatPct(day.utilization)}
                        </span>
                      </td>
                      <td><StatusBadge status={day.riskLevel} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Risk assessment */}
            <div className="amazon-card" style={{ padding: '20px' }}>
              <div className="section-header">Forecast Risk Assessment</div>
              {capacityWarningDays.length === 0 ? (
                <div style={{ padding: '16px', backgroundColor: '#E8F5EE', borderRadius: '4px', fontSize: '13px', color: '#067D62', lineHeight: 1.6 }}>
                  All 7 forecast days are within {station.name}'s comfortable operating range. No capacity interventions required this week. Continue monitoring utilisation — alert threshold is 85%.
                </div>
              ) : (
                <div>
                  {capacityWarningDays.map((day, i) => (
                    <div key={i} style={{
                      marginBottom: '12px',
                      padding: '12px',
                      backgroundColor: day.riskLevel === 'Critical' ? '#FEF0EF' : '#FFF8EE',
                      borderRadius: '4px',
                      borderLeft: `4px solid ${day.riskLevel === 'Critical' ? '#CC0C39' : '#C7511F'}`
                    }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px', color: day.riskLevel === 'Critical' ? '#CC0C39' : '#C7511F' }}>
                        {day.dow} — {day.riskLevel} ({formatPct(day.utilization)} utilisation)
                      </div>
                      <div style={{ fontSize: '12px', color: '#565959', lineHeight: 1.6 }}>
                        {generateCapacityWarning(station, day.volume, day.dow)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Model accuracy context */}
              {trainedMetrics && (
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#F5F9FE', borderRadius: '4px', fontSize: '12px', color: '#565959', lineHeight: 1.6 }}>
                  <strong>Accuracy context:</strong> Model MAPE of {trainedMetrics.mape}% means typical forecast error of ±{formatNumber(Math.round(station.operational.avg_daily_volume * trainedMetrics.mape / 100))} packages. Factor this uncertainty into capacity decisions.
                </div>
              )}
            </div>
          </div>
        )}

        {!forecasts && !training && (
          <div className="amazon-card" style={{ padding: '48px', textAlign: 'center', color: '#999' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: '#0F1111' }}>Train the LSTM model to generate a forecast</div>
            <div style={{ fontSize: '13px', marginBottom: '20px' }}>
              The model will train on {formatNumber(historicalVolumes.length)} days of {station.name} historical volume data in your browser. Training takes approximately 15-30 seconds.
            </div>
            <AmazonButton variant="primary" onClick={handleTrain}>Train Model Now</AmazonButton>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
