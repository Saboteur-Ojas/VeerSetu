const Joi = require('joi');

const objectId = Joi.string().hex().length(24).messages({
  'string.hex': '{{#label}} must be a valid ObjectId',
  'string.length': '{{#label}} must be a valid ObjectId',
});

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().default('-createdAt'),
});

const dateRangeSchema = Joi.object({
  from: Joi.date().iso(),
  to: Joi.date().iso().min(Joi.ref('from')),
});

const dailyRecordsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(30),
  sortBy: Joi.string().default('-date'),
  from: Joi.date().iso(),
  to: Joi.date().iso().min(Joi.ref('from')),
});

const updateProfileSchema = Joi.object({
  contactEmail: Joi.string().email().optional().allow(''),
  contactPhone: Joi.string().pattern(/^\+?[0-9]{10,15}$/).optional().allow(''),
  maritalStatus: Joi.string().valid('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED').optional(),
  dependents: Joi.number().integer().min(0).max(20).optional(),
  bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').optional(),
}).min(1);

const dailyRecordSchema = Joi.object({
  date: Joi.date().iso().max('now').required(),
  sleep: Joi.object({
    hours: Joi.number().min(0).max(24).required(),
    quality: Joi.number().integer().min(1).max(10).required(),
  }).required(),
  moodScore: Joi.number().integer().min(1).max(10).required(),
  stressLevel: Joi.number().integer().min(1).max(10).required(),
  fatigueLevel: Joi.number().integer().min(1).max(10).required(),
  physical: Joi.object({
    exerciseMinutes: Joi.number().min(0).max(1440).default(0),
    exerciseType: Joi.string().trim().max(100).allow('').default(''),
  }).default({}),
  nutrition: Joi.object({
    mealCount: Joi.number().integer().min(0).max(10).default(0),
    waterIntakeLiters: Joi.number().min(0).max(20).default(0),
  }).default({}),
  dutyHours: Joi.number().min(0).max(24).default(0),
});

const selfReviewSchema = Joi.object({
  periodStart: Joi.date().iso().required(),
  periodEnd: Joi.date().iso().min(Joi.ref('periodStart')).required(),
  periodType: Joi.string().valid('WEEKLY', 'MONTHLY').default('WEEKLY'),
  responses: Joi.array()
    .min(1)
    .items(
      Joi.object({
        dimension: Joi.string()
          .valid(
            'MORALE', 'STRESS', 'ANXIETY', 'FATIGUE', 'SLEEP', 'NUTRITION',
            'PHYSICAL', 'SOCIAL_CONNECTION', 'WORK_SATISFACTION',
            'FINANCIAL_WELLBEING', 'FAMILY_CONCERN', 'OVERALL_WELLBEING'
          )
          .required(),
        score: Joi.number().integer().min(1).max(10).required(),
        note: Joi.string().max(500).allow('').default(''),
      })
    )
    .required(),
});

const helpRequestSchema = Joi.object({
  category: Joi.string()
    .valid('COUNSELLING', 'FINANCIAL', 'FAMILY', 'MEDICAL', 'LEGAL', 'OTHER')
    .required(),
  message: Joi.string().min(10).max(2000).required(),
});

const stressReportSchema = Joi.object({
  level: Joi.number().integer().min(1).max(10).required(),
  trigger: Joi.string().trim().max(500).allow('').default(''),
  durationHours: Joi.number().min(0).max(24 * 30).default(0),
});

const fatigueReportSchema = Joi.object({
  level: Joi.number().integer().min(1).max(10).required(),
  recentSleepAvgHours: Joi.number().min(0).max(24).optional(),
  suspectedCause: Joi.string().trim().max(500).allow('').default(''),
});

module.exports = {
  objectId,
  paginationSchema,
  dateRangeSchema,
  dailyRecordsQuerySchema,
  updateProfileSchema,
  dailyRecordSchema,
  selfReviewSchema,
  helpRequestSchema,
  stressReportSchema,
  fatigueReportSchema,
};