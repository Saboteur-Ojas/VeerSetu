const environment = require('../config/environment');
const { AppError } = require('../utils/errors');
const AuditLog = require('../models/AuditLog');

const handleDuplicateKey = (err) =>
  new AppError(
    409,
    'Duplicate value entered for a unique field',
    Object.keys(err.keyPattern || {}).map((k) => ({ field: k, message: `Value already exists for '${k}'` }))
  );

const handleCastError = (err) =>
  new AppError(400, `Invalid value for '${err.path}': ${err.value}`);

const handleValidationError = (err) => {
  const details = Object.values(err.errors || {}).map((e) => ({
    field: e.path,
    message: e.message.replace(/"/g, "'"),
  }));
  return new AppError(422, 'Mongoose validation failed', details);
};

const handleTokenExpiredError = () => new AppError(401, 'Token expired, please refresh');

const errorConverter = (err, req, res, next) => {
  let converted = err;

  if (err instanceof AppError) {
    converted = err;
  } else if (err.name === 'CastError') {
    converted = handleCastError(err);
  } else if (err.code === 11000) {
    converted = handleDuplicateKey(err);
  } else if (err.name === 'ValidationError') {
    converted = handleValidationError(err);
  } else if (err.name === 'TokenExpiredError') {
    converted = handleTokenExpiredError();
  } else if (err.type === 'entity.parse.failed') {
    converted = new AppError(400, 'Malformed JSON payload');
  } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
    converted = new AppError(504, 'Upstream service timed out');
  }

  return next(converted);
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational !== false;

  const response = {
    success: false,
    statusCode,
    message: isOperational ? err.message : 'Internal server error',
  };
  if (err.details) response.details = err.details;

  // Never leak stack traces in production.
  if (!environment.isProduction) {
    response.stack = err.stack;
  }
  if (!isOperational) {
    console.error('[error] Unexpected error:', err);
  }

  // Best-effort audit trail for security-relevant failures.
  if (statusCode >= 500 || statusCode === 401 || statusCode === 403) {
    AuditLog.create({
      actor: req.user?.id || null,
      action: statusCode === 401 || statusCode === 403 ? 'BLOCKED_ACCESS' : 'UPDATE',
      targetModel: req.baseUrl || '',
      metadata: { path: req.originalUrl, statusCode, message: response.message },
      ip: req.ip || '',
      userAgent: req.get('user-agent') || '',
      outcome: 'FAILURE',
    }).catch(() => {});
  }

  return res.status(statusCode).json(response);
};

const notFoundHandler = (req, res, next) => {
  const err = new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`);
  return next(err);
};

module.exports = { errorConverter, errorHandler, notFoundHandler };