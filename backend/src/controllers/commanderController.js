const commanderService = require('../services/commanderService');
const { asyncHandler } = require('../utils/asyncHandler');

/**
 * NOTE: Every commander controller response is a hand-picked, projected,
 * de-identified payload produced by commanderService. No raw Medical /
 * Psychological documents or notes are ever returned to this role.
 */

const getDashboard = asyncHandler(async (req, res) => {
  const dashboard = await commanderService.getDashboard();
  return res.status(200).json({ success: true, data: dashboard });
});

const getUnit = asyncHandler(async (req, res) => {
  const unitOverview = await commanderService.getUnitOverview(req.query.unit);
  return res.status(200).json({ success: true, data: unitOverview });
});

const listPersonnel = asyncHandler(async (req, res) => {
  const result = await commanderService.listPersonnel({
    page: req.query.page || 1,
    limit: req.query.limit || 20,
    search: req.query.search || '',
    unit: req.query.unit || undefined,
  });
  return res.status(200).json({ success: true, data: result });
});

const getDeployment = asyncHandler(async (req, res) => {
  const deployment = await commanderService.getDeploymentSummary();
  return res.status(200).json({ success: true, data: deployment });
});

const getReadiness = asyncHandler(async (req, res) => {
  const readiness = await commanderService.getReadinessOverview(req.query.unit);
  return res.status(200).json({ success: true, data: readiness });
});

const getWeeklyReport = asyncHandler(async (req, res) => {
  const report = await commanderService.getWeeklyReport({
    unit: req.query.unit,
    periodStart: req.query.periodStart,
  });
  return res.status(200).json({ success: true, data: report });
});

const getEscalation = asyncHandler(async (req, res) => {
  const escalation = await commanderService.getEscalation(req.params.id);
  return res.status(200).json({ success: true, data: escalation });
});

module.exports = {
  getDashboard,
  getUnit,
  listPersonnel,
  getDeployment,
  getReadiness,
  getWeeklyReport,
  getEscalation,
};