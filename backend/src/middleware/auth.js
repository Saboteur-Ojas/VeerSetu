const jwt = require('jsonwebtoken');

const environment = require('../config/environment');
const User = require('../models/User');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const { asyncHandler } = require('../utils/asyncHandler');

const extractBearerToken = (req) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
};

const verifyToken = asyncHandler(async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    return next(new UnauthorizedError('Access token missing. Provide a Bearer token.'));
  }

  let payload;
  try {
    payload = jwt.verify(token, environment.jwt.accessSecret);
  } catch (err) {
    const reason =
      err.name === 'TokenExpiredError'
        ? 'Access token expired'
        : 'Access token invalid or tampered';
    return next(new UnauthorizedError(reason));
  }

  const user = await User.findById(payload.sub)
    .select('+password +passwordVersion')
    .lean()
    .catch(() => null);

  if (!user || !user.isActive) {
    return next(new UnauthorizedError('Account no longer active'));
  }

  // password_version lets us invalidate every issued token when necessary.
  if (payload.pv !== undefined && user.passwordVersion && payload.pv !== user.passwordVersion) {
    return next(new UnauthorizedError('Token no longer valid. Please re-authenticate.'));
  }

  req.user = {
    id: user._id.toString(),
    username: user.username,
    role: user.role,
    personnel: user.personnel ? user.personnel.toString() : null,
  };
  req.accessToken = token;

  return next();
});

const optionalToken = asyncHandler(async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, environment.jwt.accessSecret);
    req.user = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      personnel: payload.personnel || null,
    };
  } catch (err) {
    // Optional token: silently ignore invalid tokens, leave req.user unset.
  }
  return next();
});

/** Invalidate a single session/refresh token after password change via version bump. */
const bumpPasswordVersion = asyncHandler(async (req, res, next) => {
  if (!req.user) return next(new ForbiddenError('Authentication required'));
  const updated = await User.findByIdAndUpdate(
    req.user.id,
    { $inc: { passwordVersion: 1 }, $set: { refreshTokens: [] } },
    { runValidators: true }
  );
  if (!updated) return next(new UnauthorizedError('Account not found'));
  return next();
});

module.exports = { verifyToken, optionalToken, bumpPasswordVersion };