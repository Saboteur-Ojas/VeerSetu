const { log } = require('./auditService');

/**
 * In-app notification abstraction.
 *
 * This implementation is intentionally sink-based: it persists an AuditLog
 * trail and logs the notification. Swap the `dispatch` implementation for an
 * email provider / push gateway without touching controllers.
 */

const CHANNELS = { APP: 'APP', EMAIL: 'EMAIL', SMS: 'SMS', SLACK: 'SLACK' };

const dispatch = async (notification, ctx = {}) => {
  const { to, channel, title, body } = notification;

  log({
    action: 'NOTIFY',
    actor: ctx.actor || null,
    targetModel: 'Notification',
    metadata: { to: to?.id || to, channel, title },
    ip: ctx.ip || '',
    userAgent: ctx.userAgent || '',
  });

  console.log(`[notification] [${channel}] ${title}: ${body} -> ${to?.id || to}`);

  return { queued: true, channel };
};

/**
 * Signals an escalation to a commander.
 */
const notifyEscalation = async (escalation, ctx = {}) =>
  dispatch(
    {
      to: escalation.escalatedTo,
      channel: CHANNELS.EMAIL,
      title: 'Case escalated',
      body: `Case ${escalation.caseRef} escalated. Priority: ${escalation.priority || 'HIGH'}.`,
    },
    ctx
  );

/**
 * Notifies personnel that a support request was acknowledged.
 */
const notifyHelpRequestAcknowledged = async (personnelId, ctx = {}) =>
  dispatch(
    {
      to: personnelId,
      channel: CHANNELS.APP,
      title: 'Help request acknowledged',
      body: 'Your request has been received and a counsellor will reach out shortly.',
    },
    ctx
  );

module.exports = {
  CHANNELS,
  dispatch,
  notifyEscalation,
  notifyHelpRequestAcknowledged,
};