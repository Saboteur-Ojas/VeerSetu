const { Router } = require('express');

const authController = require('../controllers/authController');
const validateDto = require('../middleware/validateDto');
const { verifyToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  loginSchema,
  refreshSchema,
  logoutSchema,
} = require('../dtos/auth.dto');

const router = Router();

router.post('/login', authLimiter, validateDto(loginSchema), authController.login);
router.post('/refresh', validateDto(refreshSchema), authController.refresh);
router.post('/logout', verifyToken, validateDto(logoutSchema), authController.logout);
router.get('/me', verifyToken, authController.me);

module.exports = router;