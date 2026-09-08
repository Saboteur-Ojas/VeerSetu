const WeeklyReport = require('../models/WeeklyReport');
const WelfareReport = require('../models/WelfareReport');
const Personnel = require('../models/Personnel');
const Prediction = require('../models/Prediction');
const CounsellingCase = require('../models/CounsellingCase');
const { aggregateUnitRisk, computeReadiness } = require('./aggregationService');
const { NotFoundError } = require('../utils/errors');

/**
 * Generates (or refreshes) the de-identified weekly readiness report for a unit.
 */
const generateWeeklyReport = async ({ unit, periodStart, periodEnd, generatedBy }) => {
  const personnel = await Personnel.find({ unit, isActive: true }).select('_id').lean();
  const unitPersonnelIds = personnel.map((p) => p._id);

  const riskAgg = await aggregateUnitRisk(unitPersonnelIds);

  const readinessScores = await Promise.all(
    unitPersonnelIds.map((id) => computeReadiness(id, 14))
  );
  const scored = readinessScores.filter((r) => r.score !== null);
  const avgReadiness =
    scored.length > 0
      ? Math.round((scored.reduce((s, r) => s + r.score, 0) / scored.length) * 10) / 10
      : 0;

  const activeCasesCount = await CounsellingCase.countDocuments({
    personnel: { $in: unitPersonnelIds },
    status: { $in: ['OPEN', 'IN_PROGRESS', 'FOLLOW_UP'] },
  });

  const flaggedPredictions = await Prediction.find({
    personnel: { $in: unitPersonnelIds },
    modelType: 'RISK',
    riskLevel: { $in: ['HIGH', 'CRITICAL'] },
  })
    .sort({ predictedAt: -1 })
    .lean();

  const latestByPersonnel = new Map();
  flaggedPredictions.forEach((p) => {
    const key = p.personnel.toString();
    if (!latestByPersonnel.has(key)) latestByPersonnel.set(key, p);
  });

  const flaggedPersonnel = [...latestByPersonnel.values()].map((p) => ({
    personnel: p.personnel,
    riskLevel: p.riskLevel,
    primaryFactor: p.topFactors?.[0]?.name || '',
  }));

  const trendDirection =
    avgReadiness >= 75 ? 'IMPROVING' : avgReadiness >= 55 ? 'STABLE' : 'DETERIORATING';

  const report = await WeeklyReport.findOneAndUpdate(
    { unit, periodStart: { $gte: periodStart, $lte: periodEnd } },
    {
      $set: {
        unit,
        periodStart,
        periodEnd,
        generatedBy,
        generatedAt: new Date(),
        summary: {
          personnelCount: unitPersonnelIds.length,
          averageReadinessScore: avgReadiness,
          averageRiskScore: riskAgg.averageRisk,
          flaggedPersonnelCount: flaggedPersonnel.length,
          activeCasesCount,
          highRiskCount: riskAgg.distribution.HIGH,
          trendDirection,
        },
        flaggedPersonnel,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  return report;
};

/**
 * Creates a welfare report (counsellor-facing record).
 */
const createWelfareReport = async ({ personnelId, counsellorId, payload }) =>
  WelfareReport.create({
    personnel: personnelId,
    counsellor: counsellorId,
    type: payload.type,
    summary: payload.summary,
    assessmentScore: payload.assessmentScore,
    recommendations: payload.recommendations,
    status: payload.status,
    followUpDate: payload.followUpDate,
    date: payload.date || new Date(),
  });

const listWelfareReports = async ({ personnelId, counsellorId, page, limit, sortBy }) => {
  const filter = {};
  if (personnelId) filter.personnel = personnelId;
  if (counsellorId) filter.counsellor = counsellorId;

  const [docs, total] = await Promise.all([
    WelfareReport.find(filter).sort(sortBy).skip((page - 1) * limit).limit(limit).lean(),
    WelfareReport.countDocuments(filter),
  ]);
  return { docs, total, page, limit };
};

const getWeeklyReport = async ({ unit, periodStart }) => {
  const report = await WeeklyReport.findOne({ unit, periodStart: { $gte: periodStart } })
    .sort({ periodStart: -1 })
    .lean();
  if (!report) throw new NotFoundError(`No weekly report found for unit '${unit}'`);
  return report;
};

module.exports = {
  generateWeeklyReport,
  createWelfareReport,
  listWelfareReports,
  getWeeklyReport,
};