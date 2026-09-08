const { ForbiddenError } = require('../utils/errors');
const { asyncHandler } = require('../utils/asyncHandler');

/**
 * RBAC middleware factory.
 *
 * Usage: auth.verifyToken -> roleCheck.authorize(['PERSONNEL'])
 *
 * ADMIN always passes through the role gate.
 */
const authorize = (allowedRoles) =>
  asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }

    const permitted = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const hasRole =
      req.user.role === 'ADMIN' || permitted.some((r) => req.user.role === r);

    if (!hasRole) {
      return next(
        new ForbiddenError(`Role '${req.user.role}' is not permitted for this resource`)
      );
    }
    return next();
  });

module.exports = { authorize };