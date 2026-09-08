const Joi = require('joi');

const loginSchema = Joi.object({
  username: Joi.string().trim().lowercase().min(3).max(64).required().messages({
    'any.required': 'username is required',
    'string.empty': 'username cannot be empty',
  }),
  password: Joi.string().min(8).max(128).required().messages({
    'any.required': 'password is required',
    'string.empty': 'password cannot be empty',
  }),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'refreshToken is required',
  }),
});

const logoutSchema = Joi.object({
  refreshToken: Joi.string().optional().allow(''),
}).unknown(false);

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(8).max(128).required(),
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.pattern.base':
        'newPassword must contain at least one uppercase letter, one lowercase letter and one number',
    }),
});

module.exports = {
  loginSchema,
  refreshSchema,
  logoutSchema,
  changePasswordSchema,
};