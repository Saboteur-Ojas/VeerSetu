const Joi = require('joi');

const objectId = Joi.string().hex().length(24).messages({
  'string.hex': '{{#label}} must be a valid ObjectId',
  'string.length': '{{#label}} must be a valid ObjectId',
});

const predictSchema = Joi.object({
  personnelId: objectId.required(),
  modelType: Joi.string().valid('RISK', 'TREND', 'READINESS', 'FATIGUE').default('RISK'),
  context: Joi.object({
    recentActivityDays: Joi.number().integer().min(1).max(90).default(14),
  }).default({}),
});

const batchPredictSchema = Joi.object({
  personnelIds: Joi.array().items(objectId).min(1).max(1000).required(),
  modelType: Joi.string().valid('RISK', 'TREND', 'READINESS', 'FATIGUE').default('RISK'),
});

module.exports = {
  predictSchema,
  batchPredictSchema,
};