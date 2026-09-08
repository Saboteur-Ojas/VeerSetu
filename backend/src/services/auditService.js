const AuditLog = require('../models/AuditLog');

/**
 * Fire-and-forget audit logging. Never blocks the request path.
 */
const log = (entry) => {
  AuditLog.create({
    actor: entry.actor || null,
    action: entry.action,
    targetModel: entry.targetModel || '',
    targetId: entry.targetId || null,
    metadata: entry.metadata || {},
    ip: entry.ip || '',
    userAgent: entry.userAgent || '',
    outcome: entry.outcome || 'SUCCESS',
  }).catch((err) => {
    console.error('[audit] failed to persist audit entry:', err.message);
  });
};

const auditMiddleware = (entryFactory) => async (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    log(entryFactory(req, res));
  });
  return next();
};

module.exports = { log, auditMiddleware };