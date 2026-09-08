const Personnel = require('../models/Personnel');
const CounsellingCase = require('../models/CounsellingCase');
const WelfareReport = require('../models/WelfareReport');
const Prediction = require('../models/Prediction');
const { computeReadiness, getTrends, aggregateUnitRisk } = require('./aggregationService');
const { notifyEscalation } = require('./notificationService');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

const toObjectId = (v) => v?._id?.toString?.() || v?.toString?.() || v;

const getDashboard = async (counsellorId) => {
  const [openCases, activePersonnel, highRisk, pendingFollowUps, recentReports] = await Promise.all([
    CounsellingCase.find({ counsellor: counsellorId, status: { $in: ['OPEN', 'IN_PROGRESS', 'FOLLOW_UP', 'ESCALATED'] } })
      .populate('personnel', Personnel.COUNSELLOR_PROJECTION)
      .sort({ priority: -1, openedAt: -1 })
      .limit(20)
      .lean(),
    Personnel.countDocuments({ isActive: true }),
    Prediction.find({ modelType: 'RISK', riskLevel: { $in: ['HIGH', 'CRITICAL'] } })
      .sort({ predictedAt: -1 })
      .limit(25)
      .lean(),
    WelfareReport.find({ counsellor: counsellorId, followUpDate: { $ne: null, $lte: new Date() } })
      .sort({ followUpDate: 1 })
      .limit(10)
      .lean(),
    WelfareReport.find({ counsellor: counsellorId }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  const groupped = { OPEN: 0, IN_PROGRESS: 0, FOLLOW_UP: 0, ESCALATED: 0, CLOSED: 0, other: 0 };
  openCases.forEach((c) => {
    if (c.status in groupped) groupped[c.status] += 1;
    else groupped.other += 1;
  });

  return {
    cases: openCases,
    caseCounts: groupped,
    activePersonnel,
    highRiskCases: highRisk.map((p) => ({
      personnel: toObjectId(p.personnel),
      riskScore: p.riskScore,
      riskLevel: p.riskLevel,
      predictedAt: p.predictedAt,
    })),
    dueFollowUps: pendingFollowUps,
    recentReports,
  };
};

const listPersonnel = async ({ page, limit, sortBy, search, unit, riskFilter, status }) => {
  const filter = { isActive: true };
  if (unit) filter.unit = unit;
  if (status) filter.operationalStatus = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { serviceNumber: { $regex: search, $options: 'i' } },
      { rank: { $regex: search, $options: 'i' } },
    ];
  }

  const projection = Personnel.COUNSELLOR_PROJECTION;
  const [docs, total] = await Promise.all([
    Personnel.find(filter).select(projection).sort(sortBy).skip((page - 1) * limit).limit(limit).lean(),
    Personnel.countDocuments(filter),
  ]);

  let enriched = docs;

  if (riskFilter) {
    const latestPredictions = await Prediction.find({
      personnel: { $in: docs.map((d) => d._id) },
      modelType: 'RISK',
      riskLevel: riskFilter,
    })
      .sort({ predictedAt: -1 })
      .lean();

    const idsWithLevel = new Set(latestPredictions.map((p) => p.personnel.toString()));
    enriched = docs.filter((d) => idsWithLevel.has(d._id.toString()));
  }

  return { docs: enriched, total, page, limit };
};

const getPersonnelDetail = async (personnelId) => {
  const personnel = await Personnel.findById(personnelId)
    .select(Personnel.COUNSELLOR_PROJECTION)
    .lean();
  if (!personnel) throw new NotFoundError('Personnel not found');

  const [readiness, latestPrediction, cases, reports] = await Promise.all([
    computeReadiness(personnelId, 14),
    Prediction.findOne({ personnel: personnelId, modelType: 'RISK' }).sort({ predictedAt: -1 }).lean(),
    CounsellingCase.find({ personnel: personnelId }).sort({ openedAt: -1 }).lean(),
    WelfareReport.find({ personnel: personnelId }).sort({ date: -1 }).limit(10).lean(),
  ]);

  return {
    personnel,
    readiness,
    latestRisk: latestPrediction
      ? {
          riskScore: latestPrediction.riskScore,
          riskLevel: latestPrediction.riskLevel,
          confidence: latestPrediction.confidence,
          predictedAt: latestPrediction.predictedAt,
        }
      : null,
    cases,
    welfareReports: reports,
  };
};

const getPredictionsForPersonnel = async (personnelId, { page, limit }) => {
  const [docs, total] = await Promise.all([
    Prediction.find({ personnel: personnelId })
      .sort({ predictedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Prediction.countDocuments({ personnel: personnelId }),
  ]);
  return { docs, total, page, limit };
};

const getTrendsForPersonnel = async (personnelId, days = 30) =>
  getTrends(personnelId, days);

const listCases = async ({ counsellorId, page, limit, sortBy, status }) => {
  const filter = {};
  if (counsellorId) filter.counsellor = counsellorId;
  if (status && status !== 'ALL') filter.status = status;

  const [docs, total] = await Promise.all([
    CounsellingCase.find(filter)
      .populate('personnel', Personnel.COUNSELLOR_PROJECTION)
      .sort(sortBy)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    CounsellingCase.countDocuments(filter),
  ]);
  return { docs, total, page, limit };
};

const createCase = async ({ counsellorId, personnelId, payload }) => {
  const personnel = await Personnel.findById(personnelId).lean();
  if (!personnel) throw new NotFoundError('Personnel not found');

  const caseRef = `CSH-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
  const created = await CounsellingCase.create({
    caseRef,
    personnel: personnelId,
    counsellor: counsellorId,
    category: payload.category,
    priority: payload.priority,
    description: payload.description,
  });
  return (await created.populate('personnel', Personnel.COUNSELLOR_PROJECTION)).toObject();
};

const updateCase = async (caseId, counsellorId, updates) => {
  const doc = await CounsellingCase.findById(caseId);
  if (!doc) throw new NotFoundError('Case not found');
  if (doc.counsellor.toString() !== counsellorId.toString() && updates.status !== 'ESCALATED') {
    throw new ForbiddenError('You can only update cases assigned to you');
  }
  Object.assign(doc, updates);
  await doc.save();
  return doc.toObject();
};

const addFollowUp = async (caseId, counsellorId, payload) => {
  const doc = await CounsellingCase.findById(caseId);
  if (!doc) throw new NotFoundError('Case not found');
  if (doc.counsellor.toString() !== counsellorId.toString()) {
    throw new ForbiddenError('You can only follow up on cases assigned to you');
  }
  doc.followUps.push({ ...payload, by: counsellorId });
  if (doc.status === 'OPEN') doc.status = 'IN_PROGRESS';
  await doc.save();
  return doc.toObject();
};

const escalateCase = async (caseId, counsellorId, payload, ctx = {}) => {
  const doc = await CounsellingCase.findById(caseId);
  if (!doc) throw new NotFoundError('Case not found');
  if (doc.counsellor.toString() !== counsellorId.toString()) {
    throw new ForbiddenError('You can only escalate cases assigned to you');
  }
  doc.status = 'ESCALATED';
  doc.escalation = {
    escalatedTo: payload.escalatedTo,
    escalatedAt: new Date(),
    reason: payload.reason,
  };
  doc.priority = doc.priority === 'LOW' || doc.priority === 'MEDIUM' ? 'HIGH' : doc.priority;
  await doc.save();

  await notifyEscalation(
    { caseRef: doc.caseRef, escalatedTo: payload.escalatedTo, priority: doc.priority },
    ctx
  );

  return doc.toObject();
};

const listUnitRisk = async () => {
  const personnel = await Personnel.find({ isActive: true }).select('_id').lean();
  return aggregateUnitRisk(personnel.map((p) => p._id));
};

module.exports = {
  getDashboard,
  listPersonnel,
  getPersonnelDetail,
  getPredictionsForPersonnel,
  getTrendsForPersonnel,
  listCases,
  createCase,
  updateCase,
  addFollowUp,
  escalateCase,
  listUnitRisk,
};