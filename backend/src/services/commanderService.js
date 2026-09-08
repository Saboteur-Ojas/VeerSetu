const Personnel = require('../models/Personnel');
const Prediction = require('../models/Prediction');
const CounsellingCase = require('../models/CounsellingCase');
const WeeklyReport = require('../models/WeeklyReport');
const { aggregateUnitRisk, getUnitOperationalStats } = require('./aggregationService');
const { NotFoundError } = require('../utils/errors');

/**
 * PRIVACY NOTE:
 * Commander-facing responses MUST NOT include clinical narratives, personal
 * identifiers beyond operational identity, or raw readiness documents.
 * Every method here returns hand-picked, projected, de-identified payloads.
 */

const getDashboard = async () => {
  const personnel = await Personnel.find({ isActive: true })
    .select(Personnel.OPERATIONAL_PROJECTION)
    .lean();

  const accessibleUnits = [...new Set(personnel.map((p) => p.unit))].filter(Boolean);

  const unitIds = personnel.map((p) => p._id);
  const risk = await aggregateUnitRisk(unitIds);
  const opsStats = await getUnitOperationalStats(unitIds);

  const latestWeekly = await WeeklyReport.findOne().sort({ generatedAt: -1 }).lean();

  return {
    units: accessibleUnits,
    personnelCount: personnel.length,
    riskPosture: risk,
    operational: opsStats,
    trendDirection: latestWeekly?.summary?.trendDirection || 'UNKNOWN',
  };
};

const getUnitOverview = async (unit) => {
  const filter = { isActive: true };
  if (unit) filter.unit = unit;

  const personnel = await Personnel.find(filter)
    .select(Personnel.OPERATIONAL_PROJECTION)
    .lean();

  const unitIds = personnel.map((p) => p._id);
  const risk = await aggregateUnitRisk(unitIds);
  const opsStats = await getUnitOperationalStats(unitIds);

  const byRank = personnel.reduce((acc, p) => {
    acc[p.rank] = (acc[p.rank] || 0) + 1;
    return acc;
  }, {});
  const byOperationalStatus = personnel.reduce((acc, p) => {
    acc[p.operationalStatus] = (acc[p.operationalStatus] || 0) + 1;
    return acc;
  }, {});

  return {
    unit: unit || 'ALL',
    personnelCount: personnel.length,
    readiness: opsStats.readiness,
    risk,
    deployments: personnel
      .filter((p) => p.operationalStatus === 'DEPLOYED')
      .map((p) => ({ id: p._id, name: p.name, location: p.deploymentInfo?.currentLocation || 'N/A', since: p.deploymentInfo?.deployedSince })),
    byRank,
    byOperationalStatus,
  };
};

const listPersonnel = async ({ page, limit, search, unit }) => {
  const filter = { isActive: true };
  if (unit) filter.unit = unit;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { serviceNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const [docs, total] = await Promise.all([
    Personnel.find(filter)
      .select(Personnel.OPERATIONAL_PROJECTION)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Personnel.countDocuments(filter),
  ]);

  // Attach only the most recent de-identified risk level, never raw notes.
  const latestPredictions = await Prediction.find({
    personnel: { $in: docs.map((d) => d._id) },
    modelType: 'RISK',
  })
    .sort({ predictedAt: -1 })
    .lean();

  const riskByPersonnel = new Map();
  latestPredictions.forEach((p) => {
    if (!riskByPersonnel.has(p.personnel.toString())) {
      riskByPersonnel.set(p.personnel.toString(), {
        riskLevel: p.riskLevel,
        confidence: p.confidence,
      });
    }
  });

  const enriched = docs.map((d) => ({
    ...d,
    risk: riskByPersonnel.get(d._id.toString()) || { riskLevel: 'UNKNOWN', confidence: 0 },
  }));

  return { docs: enriched, total, page, limit };
};

const getDeploymentSummary = async () => {
  const deployed = await Personnel.find({ operationalStatus: 'DEPLOYED' })
    .select(Personnel.OPERATIONAL_PROJECTION)
    .sort({ 'deploymentInfo.deployedSince': 1 })
    .lean();

  const groupedByLocation = deployed.reduce((acc, p) => {
    const loc = p.deploymentInfo?.currentLocation || 'Unknown';
    acc[loc] = (acc[loc] || 0) + 1;
    return acc;
  }, {});

  return {
    totalDeployed: deployed.length,
    groupedByLocation,
    deployments: deployed.map((p) => ({
      id: p._id,
      name: p.name,
      rank: p.rank,
      location: p.deploymentInfo?.currentLocation || 'N/A',
      since: p.deploymentInfo?.deployedSince,
      deploymentType: p.deploymentInfo?.deploymentType || '',
    })),
  };
};

const getReadinessOverview = async (unit) => {
  const filter = { isActive: true };
  if (unit) filter.unit = unit;

  const personnel = await Personnel.find(filter).select('_id').lean();
  const unitIds = personnel.map((p) => p._id);
  const opsStats = await getUnitOperationalStats(unitIds);

  return {
    unit: unit || 'ALL',
    personnelCount: personnel.length,
    readiness: opsStats.readiness,
    flaggedCount: opsStats.flaggedCount,
    activeCasesCount: opsStats.activeCases,
  };
};

const getWeeklyReport = async ({ unit, periodStart }) => {
  const query = { ...(unit ? { unit } : {}) };
  const report = await WeeklyReport.findOne({ ...query, periodStart: { $gte: periodStart || new Date(0) } })
    .sort({ periodStart: -1 })
    .lean();

  if (!report) throw new NotFoundError('Weekly report not found');

  // Resolve flagged personnel refs to operational identity ONLY.
  let flagged = [];
  if (report.flaggedPersonnel?.length) {
    const ids = report.flaggedPersonnel.map((f) => f.personnel);
    const names = await Personnel.find({ _id: { $in: ids } })
      .select(Personnel.OPERATIONAL_PROJECTION)
      .lean();
    const nameById = new Map(names.map((n) => [n._id.toString(), n]));
    flagged = report.flaggedPersonnel.map((f) => ({
      personnel: {
        id: f.personnel?.toString(),
        name: nameById.get(f.personnel?.toString())?.name || 'Unknown',
        rank: nameById.get(f.personnel?.toString())?.rank || '',
      },
      riskLevel: f.riskLevel,
      primaryFactor: f.primaryFactor,
    }));
  }

  return {
    unit: report.unit,
    period: { start: report.periodStart, end: report.periodEnd },
    summary: report.summary,
    flagged,
    healthTrends: report.healthTrends || {},
  };
};

const getEscalation = async (caseId) => {
  const doc = await CounsellingCase.findById(caseId).lean();
  if (!doc) throw new NotFoundError('Case not found');
  if (!doc.escalation?.escalatedAt) {
    throw new NotFoundError('This case was not escalated');
  }

  const personnel = await Personnel.findById(doc.personnel)
    .select(Personnel.OPERATIONAL_PROJECTION)
    .lean();

  // Escalation detail exposes context, NOT clinical notes or raw case description.
  return {
    caseRef: doc.caseRef,
    priority: doc.priority,
    category: doc.category,
    status: doc.status,
    escalatedAt: doc.escalation.escalatedAt,
    escalatedTo: doc.escalation.escalatedTo,
    reason: doc.escalation.reason,
    personnel: personnel
      ? { id: personnel._id, name: personnel.name, rank: personnel.rank, unit: personnel.unit }
      : null,
  };
};

module.exports = {
  getDashboard,
  getUnitOverview,
  listPersonnel,
  getDeploymentSummary,
  getReadinessOverview,
  getWeeklyReport,
  getEscalation,
};