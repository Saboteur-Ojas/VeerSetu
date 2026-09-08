const authService = require('../services/authService');
const { asyncHandler } = require('../utils/asyncHandler');

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  return res.status(200).json({ success: true, data: result });
});

const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  return res.status(200).json({ success: true, data: result });
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.body.refreshToken || '', req.user, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  return res.status(200).json({ success: true, message: 'Logged out successfully' });
});

const me = asyncHandler(async (req, res) => {
  const profile = await authService.me(req.user.id);
  return res.status(200).json({ success: true, data: profile });
});

module.exports = { login, refresh, logout, me };