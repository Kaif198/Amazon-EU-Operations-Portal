/**
 * LSTM-based volume forecaster using TensorFlow.js.
 * Trains in the browser on 180 days of historical data and predicts next 7 days.
 */

import * as tf from '@tensorflow/tfjs';
import { mean, stdDev, mape as calcMape, rmse as calcRmse, rSquared as calcR2 } from '../utils/calculations.js';

export class VolumeForecaster {
  constructor() {
    this.model = null;
    this.lookback = 14;
    this.scaler = { min: 0, max: 1 };
    this.onProgress = null;   // callback: (epoch, totalEpochs, loss, valLoss)
    this.trainedAt = null;
    this.metrics = null;
  }

  normalize(data) {
    this.scaler.min = Math.min(...data);
    this.scaler.max = Math.max(...data);
    const range = this.scaler.max - this.scaler.min || 1;
    return data.map(v => (v - this.scaler.min) / range);
  }

  denormalize(value) {
    return value * (this.scaler.max - this.scaler.min) + this.scaler.min;
  }

  createSequences(data) {
    const X = [], Y = [];
    for (let i = 0; i < data.length - this.lookback; i++) {
      X.push(data.slice(i, i + this.lookback));
      Y.push(data[i + this.lookback]);
    }
    return { X, Y };
  }

  async buildAndTrain(historicalVolumes, epochs = 50) {
    if (!historicalVolumes || historicalVolumes.length < this.lookback + 10) {
      throw new Error('Insufficient training data. Need at least 24 days of history.');
    }

    const normalized = this.normalize(historicalVolumes);
    const { X, Y } = this.createSequences(normalized);

    const xs = tf.tensor3d(X.map(seq => seq.map(v => [v])));
    const ys = tf.tensor2d(Y.map(v => [v]));

    // Dispose previous model if exists
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }

    this.model = tf.sequential();
    this.model.add(tf.layers.lstm({
      units: 32,
      inputShape: [this.lookback, 1],
      returnSequences: false,
      kernelInitializer: 'glorotUniform',
      recurrentDropout: 0
    }));
    this.model.add(tf.layers.dropout({ rate: 0.15 }));
    this.model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    this.model.add(tf.layers.dense({ units: 1 }));

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mse']
    });

    const lossHistory = [];

    await this.model.fit(xs, ys, {
      epochs,
      batchSize: 16,
      validationSplit: 0.15,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          lossHistory.push({ epoch, loss: logs.loss, valLoss: logs.val_loss });
          if (this.onProgress) {
            this.onProgress(epoch + 1, epochs, logs.loss, logs.val_loss);
          }
        }
      }
    });

    xs.dispose();
    ys.dispose();

    this.trainedAt = new Date().toISOString();
    this.metrics = await this._evaluate(historicalVolumes);
    this.metrics.lossHistory = lossHistory;

    return this.metrics;
  }

  async predict(recentDays) {
    if (!this.model) throw new Error('Model not trained. Call buildAndTrain() first.');
    if (recentDays.length < this.lookback) {
      throw new Error(`Need at least ${this.lookback} recent days for prediction.`);
    }

    const normalized = recentDays.map(v =>
      (v - this.scaler.min) / (this.scaler.max - this.scaler.min || 1)
    );

    const predictions = [];
    let input = [...normalized.slice(-this.lookback)];

    for (let i = 0; i < 7; i++) {
      const tensor = tf.tensor3d([input.map(v => [v])]);
      const predTensor = this.model.predict(tensor);
      const value = (await predTensor.data())[0];
      predictions.push(this.denormalize(Math.max(0, value)));
      input = [...input.slice(1), Math.max(0, value)];
      tensor.dispose();
      predTensor.dispose();
    }

    return predictions;
  }

  async _evaluate(historicalVolumes) {
    // Use last 30 days as test set, rest as training reference
    const testStart = historicalVolumes.length - 30;
    const actual = historicalVolumes.slice(testStart);
    const predicted = [];

    for (let i = testStart; i < historicalVolumes.length; i++) {
      const input = historicalVolumes.slice(i - this.lookback, i);
      const normalized = input.map(v =>
        (v - this.scaler.min) / (this.scaler.max - this.scaler.min || 1)
      );
      const tensor = tf.tensor3d([normalized.map(v => [v])]);
      const predTensor = this.model.predict(tensor);
      const value = (await predTensor.data())[0];
      predicted.push(this.denormalize(Math.max(0, value)));
      tensor.dispose();
      predTensor.dispose();
    }

    const mapeVal = calcMape(actual, predicted);
    const rmseVal = calcRmse(actual, predicted);
    const r2Val = calcR2(actual, predicted);
    const mae = actual.reduce((s, a, i) => s + Math.abs(a - predicted[i]), 0) / actual.length;

    return {
      mape: Math.round(mapeVal * 10) / 10,
      rmse: Math.round(rmseVal),
      r2: Math.round(r2Val * 1000) / 1000,
      mae: Math.round(mae),
      sampleCount: historicalVolumes.length,
      trainedAt: this.trainedAt
    };
  }

  /**
   * Compute confidence interval for predictions using historical residual std.
   * Returns { lower, upper } arrays for a given predictions array.
   */
  getConfidenceInterval(predictions, historicalVolumes) {
    if (!historicalVolumes || historicalVolumes.length < 30) {
      const std = mean(predictions) * 0.05;
      return {
        lower: predictions.map(p => Math.max(0, p - 1.5 * std)),
        upper: predictions.map(p => p + 1.5 * std)
      };
    }

    const std = stdDev(historicalVolumes.slice(-60));
    return {
      lower: predictions.map(p => Math.max(0, p - 1.5 * std)),
      upper: predictions.map(p => p + 1.5 * std)
    };
  }

  dispose() {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}

export default VolumeForecaster;
