const personnelService = require('../services/personnelService');
const { asyncHandler } = require('../utils/asyncHandler');

const getProfile = asyncHandler(async (req, res) => {
  const profile = await personnelService.getProfile(req.user.id);
  return res.status(200).json({ success: true, data: profile });
});

const updateProfile = asyncHandler(async (req, res) => {
  const profile = await personnelService.updateProfile(req.user.id, req.body);
  return res.status(200).json({ success: true, data: profile });
});

const getDailyRecords = asyncHandler(async (req, res) => {
  const result = await personnelService.listDailyRecords(req.user.id, {
    ...req.query,
    page: req.query.page || 1,
    limit: req.query.limit || 30,
    sortBy: req.query.sortBy || '-date',
  });
  return res.status(200).json({ success: true, data: result });
});

const createDailyRecord = asyncHandler(async (req, res) => {
  const record = await personnelService.createDailyRecord(req.user.id, req.body);
  return res.status(201).json({ success: true, data: record });
});

const getSelfReviews = asyncHandler(async (req, res) => {
  const result = await personnelService.listSelfReviews(req.user.id, {
    ...req.query,
    page: req.query.page || 1,
    limit: req.query.limit || 20,
    sortBy: req.query.sortBy || '-periodStart',
  });
  return res.status(200).json({ success: true, data: result });
});

const createSelfReview = asyncHandler(async (req, res) => {
  const review = await personnelService.createSelfReview(req.user.id, req.body);
  return res.status(201).json({ success: true, data: review });
});

const getHistory = asyncHandler(async (req, res) => {
  const history = await personnelService.getHistory(req.user.id);
  return res.status(200).json({ success: true, data: history });
});

const createHelpRequest = asyncHandler(async (req, res) => {
  const entry = await personnelService.createHelpRequest(req.user.id, req.body, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  return res.status(201).json({
    success: true,
    message: 'Help request received. A counsellor will reach out shortly.',
    data: entry,
  });
});

const createStressReport = asyncHandler(async (req, res) => {
  const entry = await personnelService.createStressReport(req.user.id, req.body);
  return res.status(201).json({ success: true, data: entry });
});

const createFatigueReport = asyncHandler(async (req, res) => {
  const entry = await personnelService.createFatigueReport(req.user.id, req.body);
  return res.status(201).json({ success: true, data: entry });
});

module.exports = {
  getProfile,
  updateProfile,
  getDailyRecords,
  createDailyRecord,
  getSelfReviews,
  createSelfReview,
  getHistory,
  createHelpRequest,
  createStressReport,
  createFatigueReport,
};