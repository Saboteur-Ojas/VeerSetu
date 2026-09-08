const { ValidationError } = require('../utils/errors');

/**
 * Generic Joi validation middleware.
 *
 * Usage: router.post('/login', validateDto(loginSchema), handler)
 *        router.get('/:id', validateDto(paramIdSchema, 'params'), handler)
 *
 * The schema must abort on the first error so the request is rejected with a
 * structured 422 before it ever reaches a controller.
 */
const validateDto = (schema, property = 'body') => (req, res, next) => {
  const source = req[property];
  const { error, value } = schema.validate(source, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    const details = error.details.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message.replace(/"/g, "'"),
      type: issue.type,
    }));
    return next(new ValidationError(details));
  }

  req[property] = value;
  return next();
};

module.exports = validateDto;