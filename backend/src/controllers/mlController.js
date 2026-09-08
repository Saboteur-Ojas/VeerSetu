const Personnel = require('../models/Personnel');
const mlService = require('../services/mlService');
const { asyncHandler } = require('../utils/asyncHandler');
const { NotFoundError } = require('../utils/errors');

const personnelById = async (personnelId) => {
  const personnel = await Personnel.exists({ _id: personnelId });
  if (!personnel) throw new NotFoundError('Personnel not found');
  return personnelId;
};

const predict = asyncHandler(async (req, res) => {
  const { personnelId, modelType, context } = req.body;

  await personnelById(personnelId);

  const signals = await mlService.buildSignals(personnelId, context.recentActivityDays || 14);
  const payload = mlService.buildPayloadFromSignals(signals, modelType);
  const prediction = await mlService.predict({ personnelId, modelType, payload });

  return res.status(201).json({ success: true, data: prediction });
});

const batchPredict = asyncHandler(async (req, res) => {
  const { personnelIds, modelType } = req.body;

  const existing = await Personnel.find({ _id: { $in: personnelIds } })
    .select('_id')
    .lean();
  const validIds = existing.map((p) => p._id.toString());
  if (validIds.length !== personnelIds.length) {
    const missing = personnelIds.filter((id) => !validIds.includes(id));
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: 'Some personnel do not exist',
      details: missing.map((id) => ({ field: 'personnelIds', message: `Not found: ${id}` })),
    });
  }

  const signals = await Promise.all(
    validIds.map((id) => mlService.buildSignals(id, 14))
  );
  const payload = mlService.buildPayloadFromSignals(signals, modelType);

  const predictions = await mlService.batchPredict({
    personnelIds: validIds,
    modelType,
    payload,
  });

  return res.status(201).json({ success: true, data: predictions });
});

const health = asyncHandler(async (req, res) => {
  const health = await mlService.healthCheck();
  const status = health.ok ? 200 : 503;
  return res.status(status).json({ success: health.ok, status, data: health });
});

module.exports = { predict, batchPredict, health };