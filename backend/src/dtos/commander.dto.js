const Joi = require('joi');

const objectId = Joi.string().hex().length(24).messages({
  'string.hex': '{{#label}} must be a valid ObjectId',
  'string.length': '{{#label}} must be a valid ObjectId',
});

const unitQuerySchema = Joi.object({
  unit: Joi.string().trim().max(128).optional(),
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().min(Joi.ref('from')).optional(),
}).unknown(true);

const readinessQuerySchema = Joi.object({
  unit: Joi.string().trim().max(128).optional(),
});