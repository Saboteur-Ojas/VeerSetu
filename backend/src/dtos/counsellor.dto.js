const Joi = require('joi');

const objectId = Joi.string().hex().length(24).messages({
  'string.hex': '{{#label}} must be a valid ObjectId',
  'string.length': '{{#label}} must be a valid ObjectId',
});

const paramIdSchema = Joi.object({
  id: objectId.required(),
});

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().default('-createdAt'),
  search: Joi.string().trim().max(128).allow('').default(''),
  unit: Joi.string().trim().max(128).optional(),
  riskFilter: Joi.string().valid('LOW', 'MODERATE', 'HIGH', 'CRITICAL').optional(),
  status: Joi.string()
    .valid('ACTIVE', 'DEPLOYED', 'ON_LEAVE', 'SICK', 'RESTRICTED', 'INACTIVE')
    .optional(),
});

const createCaseSchema = Joi.object({
  personnelId: objectId.required(),
  category: Joi.string()
    .valid(
      'PTSD', 'ANXIETY', 'DEPRESSION', 'STRESS', 'FAMILY_ISSUE',
      'FINANCIAL_ISSUE', 'SUICIDAL_IDEATION', 'SUBSTANCE_USE', 'GRIEF', 'OTHER'
    )
    .required(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL').default('MEDIUM'),
  description: Joi.string().max(5000).required(),
});

const updateCaseSchema = Joi.object({
  status: Joi.string().valid('OPEN', 'IN_PROGRESS', 'FOLLOW_UP', 'ESCALATED', 'CLOSED').optional(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL').optional(),
  category: Joi.string()
    .valid(
      'PTSD', 'ANXIETY', 'DEPRESSION', 'STRESS', 'FAMILY_ISSUE',
      'FINANCIAL_ISSUE', 'SUICIDAL_IDEATION', 'SUBSTANCE_USE', 'GRIEF', 'OTHER'
    )
    .optional(),
  description: Joi.string().max(5000).optional(),
}).min(1);

const followUpSchema = Joi.object({
  type: Joi.string().valid('PHONE', 'SESSION', 'REVIEW', 'FIELD_VISIT').default('SESSION'),
  notes: Joi.string().max(3000).required(),
  moodTrend: Joi.string().valid('IMPROVING', 'STABLE', 'DETERIORATING', 'UNKNOWN').default('UNKNOWN'),
});

const escalateCaseSchema = Joi.object({
  escalatedTo: Joi.string().max(128).required(),
  reason: Joi.string().min(10).max(2000).required(),
});

module.exports = {
  paramIdSchema,
  paginationSchema,
  createCaseSchema,
  updateCaseSchema,
  followUpSchema,
  escalateCaseSchema,
};