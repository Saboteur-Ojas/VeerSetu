const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const environment = require('../config/environment');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const signAccessToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
      personnel: user.personnel || null,
      pv: user.passwordVersion || 1,
    },
    environment.jwt.accessSecret,
    { expiresIn: environment.jwt.accessExpiresIn }
  );

const generateRefreshTokenRecord = (user) => {
  const rawToken = crypto.randomBytes(48).toString('hex');
  const tokenId = crypto.randomBytes(12).toString('hex');
  const expiresAt = new Date(
    Date.now() + msFromJwtExpiry(environment.jwt.refreshExpiresIn)
  );

  const signed = jwt.sign({ sub: user.id, tid: tokenId }, environment.jwt.refreshSecret, {
    expiresIn: environment.jwt.refreshExpiresIn,
  });

  return {
    rawToken,
    signedToken: signed,
    record: {
      tokenId,
      hashedToken: hashToken(rawToken),
      expiresAt,
      createdAt: new Date(),
    },
  };
};

const verifyRefreshToken = (signedToken) => {
  const payload = jwt.verify(signedToken, environment.jwt.refreshSecret);
  return { sub: payload.sub, tokenId: payload.tid };
};

const msFromJwtExpiry = (exp) => {
  const unit = exp.slice(-1);
  const value = parseInt(exp.slice(0, -1), 10);
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return (multipliers[unit] || multipliers.m) * value;
};

module.exports = {
  hashToken,
  signAccessToken,
  generateRefreshTokenRecord,
  verifyRefreshToken,
};