const counsellorService = require('../services/counsellorService');
const reportService = require('../services/reportService');
const { asyncHandler } = require('../utils/asyncHandler');

const getDashboard = asyncHandler(async (req, res) => {
  const dashboard = await counsellorService.getDashboard(req.user.id);
  return res.status(200).json({ success: true, data: dashboard });
});

const listPersonnel = asyncHandler(async (req, res) => {
  const result = await counsellorService.listPersonnel(req.query);
  return res.status(200).json({ success: true, data: result });
});

const getPersonnelDetail = asyncHandler(async (req, res) => {
  const detail = await counsellorService.getPersonnelDetail(req.params.id);
  return res.status(200).json({ success: true, data: detail });
});

const getPersonnelPredictions = asyncHandler(async (req, res) => {
  const result = await counsellorService.getPredictionsForPersonnel(req.params.id, {
    page: req.query.page || 1,
    limit: req.query.limit || 20,
  });
  return res.status(200).json({ success: true, data: result });
});

const getPersonnelTrends = asyncHandler(async (req, res) => {
  const trends = await counsellorService.getTrendsForPersonnel(
    req.params.id,
    parseInt(req.query.days || 30, 10)
  );
  return res.status(200).json({ success: true, data: trends });
});

const listWelfareReports = asyncHandler(async (req, res) => {
  const result = await reportService.listWelfareReports({
    personnelId: req.query.personnelId || null,
    counsellorId: req.user.id,
    page: req.query.page || 1,
    limit: req.query.limit || 20,
    sortBy: req.query.sortBy || '-date',
  });
  return res.status(200).json({ success: true, data: result });
});

const createWelfareReport = asyncHandler(async (req, res) => {
  const report = await reportService.createWelfareReport({
    personnelId: req.body.personnelId,
    counsellorId: req.user.id,
    payload: req.body,
  });
  return res.status(201).json({ success: true, data: report });
});

const listCases = asyncHandler(async (req, res) => {
  const result = await counsellorService.listCases({
    counsellorId: req.user.id,
    status: req.query.status || 'ALL',
    page: req.query.page || 1,
    limit: req.query.limit || 20,
    sortBy: req.query.sortBy || '-openedAt',
  });
  return res.status(200).json({ success: true, data: result });
});

const createCase = asyncHandler(async (req, res) => {
  const created = await counsellorService.createCase({
    counsellorId: req.user.id,
    personnelId: req.body.personnelId,
    payload: req.body,
  });
  return res.status(201).json({ success: true, data: created });
});

const updateCase = asyncHandler(async (req, res) => {
  const updated = await counsellorService.updateCase(
    req.params.id,
    req.user.id,
    req.body
  );
  return res.status(200).json({ success: true, data: updated });
});

const addFollowUp = asyncHandler(async (req, res) => {
  const updated = await counsellorService.addFollowUp(
    req.params.id,
    req.user.id,
    req.body
  );
  return res.status(200).json({ success: true, data: updated });
});

const escalateCase = asyncHandler(async (req, res) => {
  const updated = await counsellorService.escalateCase(
    req.params.id,
    req.user.id,
    req.body,
    { ip: req.ip, userAgent: req.get('user-agent') }
  );
  return res.status(200).json({ success: true, data: updated });
});

module.exports = {
  getDashboard,
  listPersonnel,
  getPersonnelDetail,
  getPersonnelPredictions,
  getPersonnelTrends,
  listWelfareReports,
  createWelfareReport,
  listCases,
  createCase,
  updateCase,
  addFollowUp,
  escalateCase,
};