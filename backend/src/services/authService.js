const User = require('../models/User');
const environment = require('../config/environment');
const {
  signAccessToken,
  generateRefreshTokenRecord,
  verifyRefreshToken,
  hashToken,
} = require('../utils/token');
const {
  UnauthorizedError,
  NotFoundError,
} = require('../utils/errors');
const { log } = require('./auditService');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

const login = async ({ username, password }, ctx = {}) => {
  const user = await User.findOne({ username })
    .select('+password +loginAttempts +lockedUntil +passwordVersion +refreshTokens')
    .exec();

  if (!user) {
    log({
      action: 'LOGIN_FAILED',
      actor: null,
      metadata: { username },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      outcome: 'FAILURE',
    });
    throw new UnauthorizedError('Invalid credentials');
  }

  // Account lockout after repeated failures.
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new UnauthorizedError('Account temporarily locked. Try again later.');
  }

  const passwordMatches = await user.comparePassword(password);
  if (!passwordMatches) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
      user.loginAttempts = 0;
    }
    await user.save({ validateBeforeSave: false });
    log({
      action: 'LOGIN_FAILED',
      actor: user._id,
      metadata: { username, attempts: user.loginAttempts },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      outcome: 'FAILURE',
    });
    throw new UnauthorizedError('Invalid credentials');
  }

  // Reset counters on successful login.
  user.loginAttempts = 0;
  user.lockedUntil = null;
  user.lastLoginAt = new Date();

  // Refresh-token rotation: rotate out expired stored tokens.
  user.refreshTokens = (user.refreshTokens || []).filter((t) => t.expiresAt > new Date());

  const { signedToken, record } = generateRefreshTokenRecord(user);
  user.refreshTokens.push(record);
  await user.save({ validateBeforeSave: false });

  log({
    action: 'LOGIN',
    actor: user._id,
    metadata: { role: user.role },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return {
    accessToken: signAccessToken({
      id: user._id.toString(),
      username: user.username,
      role: user.role,
      personnel: user.personnel,
      passwordVersion: user.passwordVersion,
    }),
    refreshToken: signedToken,
    user: user.toSafeObject(),
  };
};

const refresh = async ({ refreshToken }, ctx = {}) => {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const user = await User.findById(payload.sub).select('+refreshTokens +passwordVersion').exec();
  if (!user || !user.isActive) {
    throw new UnauthorizedError('Account not found or disabled');
  }

  const stored = (user.refreshTokens || []).find(
    (t) => t.tokenId === payload.tokenId && t.expiresAt > new Date()
  );
  const presentedHash = hashToken(refreshToken);
  if (!stored || stored.hashedToken !== presentedHash) {
    // Reuse detection: rotate every token for this user out.
    user.refreshTokens = [];
    await user.save({ validateBeforeSave: false });
    throw new UnauthorizedError('Refresh token reuse detected. Please log in again.');
  }

  // Rotate: drop the used token, issue a fresh pair.
  user.refreshTokens = user.refreshTokens.filter((t) => t.tokenId !== payload.tokenId);
  const { signedToken, record } = generateRefreshTokenRecord(user);
  user.refreshTokens.push(record);
  await user.save({ validateBeforeSave: false });

  log({
    action: 'TOKEN_REFRESH',
    actor: user._id,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return {
    accessToken: signAccessToken({
      id: user._id.toString(),
      username: user.username,
      role: user.role,
      personnel: user.personnel,
      passwordVersion: user.passwordVersion,
    }),
    refreshToken: signedToken,
  };
};

const logout = async ({ refreshToken }, user, ctx = {}) => {
  const doc = await User.findById(user.id).select('+refreshTokens').exec();
  if (!doc) throw new NotFoundError('Account not found');

  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      doc.refreshTokens = (doc.refreshTokens || []).filter(
        (t) => t.tokenId !== payload.tokenId
      );
    } catch {
      // Invalid token on logout is fine; clear all server-side sessions.
      doc.refreshTokens = [];
    }
  } else {
    doc.refreshTokens = [];
  }

  await doc.save({ validateBeforeSave: false });

  log({
    action: 'LOGOUT',
    actor: user.id,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });
};

const me = async (userId) => {
  const user = await User.findById(userId)
    .populate('personnel')
    .exec();
  if (!user) throw new NotFoundError('Account not found');
  const safe = user.toSafeObject();
  if (user.personnel) {
    // Operator-level info is fine for /me (the account owner).
    safe.personnel = user.personnel;
  }
  return safe;
};

module.exports = { login, refresh, logout, me };