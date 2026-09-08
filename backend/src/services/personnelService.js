const Personnel = require('../models/Personnel');
const DailyRecord = require('../models/DailyRecord');
const SelfReview = require('../models/SelfReview');
const BehaviouralData = require('../models/BehaviouralData');
const CounsellingCase = require('../models/CounsellingCase');
const WelfareReport = require('../models/WelfareReport');
const Prediction = require('../models/Prediction');
const { NotFoundError, ConflictError } = require('../utils/errors');
const { notifyHelpRequestAcknowledged } = require('./notificationService');

const requireLinkedPersonnel = async (userId) => {
  const personnel = await Personnel.findOne({ user: userId }).lean();
  if (!personnel) throw new NotFoundError('Personnel profile not linked to this account');
  return personnel;
};

const getProfile = async (userId) => {
  const personnel = await Personnel.findOne({ user: userId }).lean();
  if (!personnel) throw new NotFoundError('Personnel profile not found');
  return personnel;
};

const updateProfile = async (userId, updates) => {
  const personnel = await Personnel.findOne({ user: userId });
  if (!personnel) throw new NotFoundError('Personnel profile not found');
  Object.assign(personnel, updates);
  await personnel.save();
  return personnel.toObject();
};

const createDailyRecord = async (userId, payload) => {
  const personnel = await requireLinkedPersonnel(userId);
  const exists = await DailyRecord.exists({ personnel: personnel._id, date: payload.date });
  if (exists) throw new ConflictError('A daily record already exists for this date');
  return DailyRecord.create({ personnel: personnel._id, ...payload });
};

const listDailyRecords = async (userId, { page, limit, sortBy, from, to }) => {
  const personnel = await requireLinkedPersonnel(userId);
  const filter = { personnel: personnel._id };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }
  const [docs, total] = await Promise.all([
    DailyRecord.find(filter).sort(sortBy).skip((page - 1) * limit).limit(limit).lean(),
    DailyRecord.countDocuments(filter),
  ]);
  return { docs, total, page, limit };
};

const createSelfReview = async (userId, payload) => {
  const personnel = await requireLinkedPersonnel(userId);
  return SelfReview.create({ personnel: personnel._id, ...payload });
};

const listSelfReviews = async (userId, { page, limit, sortBy }) => {
  const personnel = await requireLinkedPersonnel(userId);
  const filter = { personnel: personnel._id };
  const [docs, total] = await Promise.all([
    SelfReview.find(filter).sort(sortBy).skip((page - 1) * limit).limit(limit).lean(),
    SelfReview.countDocuments(filter),
  ]);
  return { docs, total, page, limit };
};

const getHistory = async (userId) => {
  const personnel = await requireLinkedPersonnel(userId);
  const pid = personnel._id;

  const [daily, reviews, predictions, behaviour, cases, welfare] = await Promise.all([
    DailyRecord.find({ personnel: pid }).sort({ date: -1 }).limit(90).lean(),
    SelfReview.find({ personnel: pid }).sort({ periodStart: -1 }).limit(26).lean(),
    Prediction.find({ personnel: pid }).sort({ predictedAt: -1 }).limit(30).lean(),
    BehaviouralData.find({ personnel: pid }).populate('observedBy', 'username').sort({ timestamp: -1 }).limit(50).lean(),
    CounsellingCase.find({ personnel: pid }).sort({ openedAt: -1 }).lean(),
    WelfareReport.find({ personnel: pid }).sort({ date: -1 }).limit(50).lean(),
  ]);

  return {
    daily,
    selfReviews: reviews,
    predictions,
    behavioural: behaviour,
    counsellingCases: cases,
    welfareReports: welfare,
  };
};

const createHelpRequest = async (userId, payload, ctx = {}) => {
  const personnel = await requireLinkedPersonnel(userId);
  const entry = await BehaviouralData.create({
    personnel: personnel._id,
    source: 'SYSTEM',
    category: 'OTHER',
    severity: 8,
    notes: `HELP_REQUEST | ${payload.category}: ${payload.message}`,
  });
  await notifyHelpRequestAcknowledged(personnel._id, ctx);
  return entry;
};

const createStressReport = async (userId, payload) => {
  const personnel = await requireLinkedPersonnel(userId);
  return BehaviouralData.create({
    personnel: personnel._id,
    source: 'SYSTEM',
    category: 'SELF_HARM_SIGNAL',
    severity: payload.level,
    notes: `STRESS_REPORT | trigger: ${payload.trigger || 'not specified'} | durationHours: ${payload.durationHours}`,
  });
};

const createFatigueReport = async (userId, payload) => {
  const personnel = await requireLinkedPersonnel(userId);
  return BehaviouralData.create({
    personnel: personnel._id,
    source: 'SYSTEM',
    category: 'SLEEP_CHANGE',
    severity: payload.level,
    notes: `FATIGUE_REPORT | recentSleepAvgHours: ${payload.recentSleepAvgHours ?? 'n/a'} | cause: ${payload.suspectedCause || 'not specified'}`,
  });
};

module.exports = {
  getProfile,
  updateProfile,
  createDailyRecord,
  listDailyRecords,
  createSelfReview,
  listSelfReviews,
  getHistory,
  createHelpRequest,
  createStressReport,
  createFatigueReport,
};