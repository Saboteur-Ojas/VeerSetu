const DailyRecord = require('../models/DailyRecord');
const SelfReview = require('../models/SelfReview');
const Prediction = require('../models/Prediction');
const BehaviouralData = require('../models/BehaviouralData');
const CounsellingCase = require('../models/CounsellingCase');

const readinessBucket = (score) => {
  if (score >= 85) return 'HIGH';
  if (score >= 65) return 'MODERATE';
  return 'LOW';
};

/**
 * Readiness score 0-100 derived from recent daily wellbeing telemetry.
 */
const computeReadiness = async (personnelId, days = 14) => {
  const since = new Date(Date.now() - days * 86400000);
  const records = await DailyRecord.find({ personnel: personnelId, date: { $gte: since } })
    .sort({ date: 1 })
    .lean();

  if (records.length === 0) {
    return { score: null, bucket: 'UNKNOWN', basis: 0, daysCovered: 0 };
  }

  // Each sub-metric is mapped to 0..100 where higher is better.
  const mood = records.reduce((s, r) => s + (r.moodScore / 10) * 100, 0) / records.length;
  const stress = records.reduce((s, r) => s + (1 - r.stressLevel / 10) * 100, 0) / records.length;
  const fatigue = records.reduce((s, r) => s + (1 - r.fatigueLevel / 10) * 100, 0) / records.length;
  const sleep = records.reduce((s, r) => {
    const hours = r.sleep?.hours ?? 7;
    const quality = r.sleep?.quality ?? 7;
    return s + ((hours / 8 < 1 ? hours / 8 : 1) * 0.6 + (quality / 10) * 0.4) * 100;
  }, 0) / records.length;

  const score = Math.round((mood * 0.3 + stress * 0.3 + fatigue * 0.2 + sleep * 0.2) * 10) / 10;

  return {
    score,
    bucket: readinessBucket(score),
    breakdown: { mood, stress, fatigue, sleep },
    basis: records.length,
    daysCovered: days,
  };
};

/**
 * Aggregated risk posture for an entire unit — strictly de-identified.
 */
const aggregateUnitRisk = async (unitPersonnelIds) => {
  if (!unitPersonnelIds.length) {
    return { averageRisk: 0, distribution: { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 }, tracked: 0 };
  }

  const predictions = await Prediction.find({
    personnel: { $in: unitPersonnelIds },
    modelType: 'RISK',
  })
    .sort({ predictedAt: -1 })
    .lean();

  const latest = new Map();
  predictions.forEach((p) => {
    if (!latest.has(p.personnel.toString())) latest.set(p.personnel.toString(), p);
  });

  const latestValues = [...latest.values()];
  const distribution = { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 };
  latestValues.forEach((p) => {
    distribution[p.riskLevel] = (distribution[p.riskLevel] || 0) + 1;
  });

  const averageRisk =
    latestValues.length > 0
      ? latestValues.reduce((s, p) => s + (p.riskScore || 0), 0) / latestValues.length
      : 0;

  return { averageRisk, distribution, tracked: latestValues.length };
};

const getTrends = async (personnelId, days = 30) => {
  const since = new Date(Date.now() - days * 86400000);

  const [daily, reviews, predictions, behavioural] = await Promise.all([
    DailyRecord.find({ personnel: personnelId, date: { $gte: since } })
      .sort({ date: 1 })
      .lean(),
    SelfReview.find({ personnel: personnelId, createdAt: { $gte: since } })
      .sort({ createdAt: 1 })
      .lean(),
    Prediction.find({ personnel: personnelId, predictedAt: { $gte: since } })
      .sort({ predictedAt: 1 })
      .lean(),
    BehaviouralData.find({ personnel: personnelId, timestamp: { $gte: since } })
      .sort({ timestamp: 1 })
      .lean(),
  ]);

  return {
    daily: daily.map((r) => ({
      date: r.date,
      moodScore: r.moodScore,
      stressLevel: r.stressLevel,
      fatigueLevel: r.fatigueLevel,
      sleepHours: r.sleep?.hours,
      flagged: r.flagged?.isFlagged,
    })),
    selfReviews: reviews.map((r) => ({
      periodStart: r.periodStart,
      overallScore: r.overallScore,
      flaggedDimensions: r.responses.filter((x) => x.score <= 3).map((x) => x.dimension),
    })),
    predictions: predictions.map((p) => ({
      modelType: p.modelType,
      riskScore: p.riskScore,
      riskLevel: p.riskLevel,
      confidence: p.confidence,
      predictedAt: p.predictedAt,
    })),
    behavioural: behavioural.map((b) => ({
      category: b.category,
      severity: b.severity,
      timestamp: b.timestamp,
    })),
  };
};

const getUnitOperationalStats = async (unitPersonnelIds) => {
  const [activeCases, riskAgg, ready] = await Promise.all([
    CounsellingCase.countDocuments({
      personnel: { $in: unitPersonnelIds },
      status: { $in: ['OPEN', 'IN_PROGRESS', 'FOLLOW_UP'] },
    }),
    aggregateUnitRisk(unitPersonnelIds),
    Promise.all(
      unitPersonnelIds.map((id) => computeReadiness(id, 14))
    ),
  ]);

  const scored = ready.filter((r) => r.score !== null);
  const readiness = scored.length
    ? {
        average: Math.round((scored.reduce((s, r) => s + r.score, 0) / scored.length) * 10) / 10,
        high: scored.filter((r) => r.bucket === 'HIGH').length,
        moderate: scored.filter((r) => r.bucket === 'MODERATE').length,
        low: scored.filter((r) => r.bucket === 'LOW').length,
      }
    : null;

  return {
    activeCases,
    flaggedCount: riskAgg.distribution.HIGH + riskAgg.distribution.CRITICAL,
    readiness,
    risk: { average: riskAgg.averageRisk },
  };
};

module.exports = {
  computeReadiness,
  aggregateUnitRisk,
  getTrends,
  getUnitOperationalStats,
};