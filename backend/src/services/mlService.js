const axios = require('axios');

const environment = require('../config/environment');
const Prediction = require('../models/Prediction');
const DailyRecord = require('../models/DailyRecord');
const SelfReview = require('../models/SelfReview');
const { AppError } = require('../utils/errors');
const { log } = require('./auditService');

const ML_ENDPOINTS = {
  PREDICT: `${environment.ml.serviceUrl}/predict`,
  BATCH_PREDICT: `${environment.ml.serviceUrl}/batch-predict`,
  HEALTH: `${environment.ml.serviceUrl}/health`,
};

const TIMEOUT_MS = environment.ml.timeoutMs;

/**
 * Simple circuit breaker: after CIRCUIT_THRESHOLD consecutive failures within
 * CIRCUIT_RESET_MS, the breaker opens and requests fail fast (DEGRADED) for
 * CIRCUIT_RESET_MS before probing the ML service again.
 */
const circuit = {
  failures: 0,
  open: false,
  openedAt: null,
  threshold: 5,
  resetMs: 30000,
};

const isCircuitOpen = () => {
  if (!circuit.open) return false;
  if (Date.now() - circuit.openedAt >= circuit.resetMs) {
    circuit.open = false;
    circuit.failures = 0;
    return false;
  }
  return true;
};

const recordFailure = () => {
  circuit.failures += 1;
  if (circuit.failures >= circuit.threshold && !circuit.open) {
    circuit.open = true;
    circuit.openedAt = Date.now();
    console.warn('[ml] circuit breaker OPENED — ML service considered unhealthy');
  }
};

const recordSuccess = () => {
  circuit.failures = 0;
  if (circuit.open) {
    circuit.open = false;
    console.log('[ml] circuit breaker CLOSED — ML service healthy');
  }
};

const axiosClient = axios.create({
  timeout: TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Api-Key': environment.ml.apiKey,
  },
  // The browser never talks to FastAPI; this backend is the only client.
  validateStatus: (status) => status >= 200 && status < 300,
});

const callMl = async (url, payload) => {
  if (isCircuitOpen() && url !== ML_ENDPOINTS.HEALTH) {
    throw new AppError(503, 'ML service temporarily unavailable (circuit open)');
  }
  try {
    const { data } = await axiosClient.post(url, payload);
    recordSuccess();
    return data;
  } catch (err) {
    recordFailure();
    if (err instanceof AppError) throw err;
    const timeoutHit = err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT';
    throw new AppError(
      timeoutHit ? 504 : 502,
      timeoutHit
        ? 'ML service timed out. Please retry.'
        : 'ML service unreachable.',
      { service: environment.ml.serviceUrl }
    );
  }
};

/**
 * Persists an ML result as a Prediction document.
 */
const persistPrediction = async ({ personnelId, modelType, modelVersion, result }) => {
  const doc = await Prediction.create({
    personnel: personnelId,
    modelType,
    modelVersion: modelVersion || (result && result.model_version) || '1.0.0',
    riskScore: result?.risk_score ?? null,
    riskLevel: result?.risk_level || null,
    confidence: result?.confidence ?? null,
    topFactors: (result?.top_factors || []).map((f) => ({
      name: f.name,
      weight: f.weight,
    })),
    rawOutput: result,
    recommendationSummary: result?.recommendation_summary || '',
  });
  return doc;
};

/**
 * Single prediction. Builds a payload from recent data signals.
 */
/**
 * Sanitized feature extraction for the ML model.
 * Only numeric aggregates and de-identified signals leave the backend.
 */
const buildSignals = async (personnelId, days = 14) => {
  const since = new Date(Date.now() - days * 86400000);

  const [daily, recentDaily, reviews, latestPrediction] = await Promise.all([
    DailyRecord.find({ personnel: personnelId, date: { $gte: since } }).sort({ date: 1 }).lean(),
    DailyRecord.find({ personnel: personnelId, flagged: { $ne: null } }).sort({ date: -1 }).lean(),
    SelfReview.find({ personnel: personnelId, createdAt: { $gte: since } }).sort({ createdAt: 1 }).lean(),
    Prediction.find({ personnel: personnelId }).sort({ predictedAt: -1 }).limit(1).lean(),
  ]);

  const avg = (nums) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null);

  return {
    personnel_id: personnelId,
    observation_window_days: days,
    daily_records: daily.map((r) => ({
      date: r.date.toISOString(),
      sleep_hours: r.sleep?.hours,
      sleep_quality: r.sleep?.quality,
      mood_score: r.moodScore,
      stress_level: r.stressLevel,
      fatigue_level: r.fatigueLevel,
      duty_hours: r.dutyHours,
      flagged: r.flagged?.isFlagged || false,
    })),
    aggregates: {
      avg_mood: avg(daily.map((r) => r.moodScore)),
      avg_stress: avg(daily.map((r) => r.stressLevel)),
      avg_fatigue: avg(daily.map((r) => r.fatigueLevel)),
      avg_sleep_hours: avg(daily.map((r) => r.sleep?.hours)),
      flagged_days: daily.filter((r) => r.flagged?.isFlagged).length,
      recent_flagged: Boolean(recentDaily.length),
      last_risk_score: latestPrediction[0]?.riskScore ?? null,
    },
    self_reviews: reviews.map((r) => ({
      period_start: r.periodStart.toISOString(),
      overall_score: r.overallScore,
      flagged: r.flagged?.isFlagged ?? false,
    })),
  };
};

const predict = async ({ personnelId, modelType, payload }) => {
  const result = await callMl(ML_ENDPOINTS.PREDICT, payload);
  return persistPrediction({ personnelId, modelType, result });
};

/**
 * Batch prediction via the service; persists each result individually.
 */
const batchPredict = async ({ personnelIds, modelType, payload }) => {
  const result = await callMl(ML_ENDPOINTS.BATCH_PREDICT, payload);

  const batch = Array.isArray(result) ? result : result.results || [];
  const persisted = [];
  for (const item of batch) {
    const pid = item.personnel_id || item.personnelId;
    if (!pid) continue;
    const doc = await persistPrediction({
      personnelId: pid,
      modelType,
      result: item,
    });
    persisted.push(doc);
  }
  return persisted;
};

const healthCheck = async () => {
  const url = ML_ENDPOINTS.HEALTH;
  try {
    const { data } = await axiosClient.get(url);
    return { ok: true, data, circuitOpen: circuit.open };
  } catch (err) {
    recordFailure();
    return {
      ok: false,
      circuitOpen: circuit.open,
      message: err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT'
        ? 'ML service timed out'
        : 'ML service unhealthy',
    };
  }
};

const buildPayloadFromSignals = (signals, modelType) => ({
  model_type: modelType.toLowerCase(),
  features: signals,
  requested_at: new Date().toISOString(),
});

module.exports = {
  predict,
  batchPredict,
  healthCheck,
  buildPayloadFromSignals,
  buildSignals,
  persistPrediction,
};