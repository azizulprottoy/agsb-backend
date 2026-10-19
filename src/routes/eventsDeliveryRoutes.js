const crypto = require('crypto');
const { asyncRouter } = require('../utils/asyncRouter');
const { toObjectId } = require('../utils/ids');
const { sendMail, BRAND } = require('../services/mail');
const { sendUserNotification } = require('../services/notifications');
const { renderEmail, escapeHtml } = require('../services/emailTemplates');

// CC Events delivery webhook. When a notification rule fires, CC Events
// renders the personalised message and POSTs it here, HMAC-signed with
// CC_EVENTS_WEBHOOK_SECRET; AGSB sends it as email or in-app + push.
// CC Events decides who gets what; AGSB owns the mailboxes, the device tokens
// and the user's real contact details (never taken from the payload).
//
// Once the signature checks out it always answers 200 with { delivered }, so
// CC Events records why a message didn't go out.

const MAX_SKEW_SECONDS = 5 * 60;
const MAILBOXES = ['no-reply', 'business', 'support'];

// X-CC-Events-Signature: sha256=HMAC(secret, `${timestamp}.${rawBody}`), and
// X-CC-Events-Timestamp within 5 minutes so captured requests can't be replayed.
// req.rawBody is kept by the JSON parser in index.js for this path.
const verifySignature = (req) => {
  const secret = process.env.CC_EVENTS_WEBHOOK_SECRET;
  if (!secret) return { ok: false, status: 503, message: 'Delivery webhook is not configured' };

  const timestamp = req.get('X-CC-Events-Timestamp') || '';
  const signature = (req.get('X-CC-Events-Signature') || '').replace(/^sha256=/, '');
  if (!/^\d+$/.test(timestamp) || !/^[a-f0-9]{64}$/.test(signature) || !req.rawBody) {
    return { ok: false, status: 401, message: 'Missing or malformed signature' };
  }
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > MAX_SKEW_SECONDS) {
    return { ok: false, status: 401, message: 'Stale timestamp' };
  }

  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.`).update(req.rawBody).digest();
  const given = Buffer.from(signature, 'hex');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return { ok: false, status: 401, message: 'Bad signature' };
  }
  return { ok: true };
};

const safeUrl = (url) => (typeof url === 'string' && /^https?:\/\//i.test(url) ? url : null);
const sitePath = (url) => (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') ? url : null);

const notDelivered = (reason) => ({ delivered: false, reason });

module.exports = ({ UserCollection }) => {
  const router = asyncRouter();

  const deliver = async (payload = {}) => {
    if (payload.type === 'ping') return { delivered: true, pong: true };
    if (payload.type !== 'notification.deliver') return notDelivered(`Unknown type "${payload.type}"`);

    const { channel, externalId, content = {}, rule = {}, id } = payload;
    if (typeof content.body !== 'string' || !content.body.trim()) return notDelivered('Empty message');

    // externalId is the AGSB user id (see utils/ccEvents trackEvent/identify).
    const userId = toObjectId(String(externalId ?? ''));
    if (!userId) return notDelivered('Not a registered user');
    const user = await UserCollection.findOne({ _id: userId }, { projection: { name: 1, email: 1 } });
    if (!user) return notDelivered('User not found');
    const link = safeUrl(content.url) || sitePath(content.url);

    if (channel === 'email') {
      if (!user.email) return notDelivered('User has no email');
      const from = MAILBOXES.includes(content.from) ? content.from : 'no-reply';
      const subject = String(content.subject || content.title || BRAND);
      // Rule-authored HTML is sent as is; plain text gets the standard layout.
      const body = typeof content.html === 'string' && content.html.trim()
        ? { html: content.html, text: content.body }
        : renderEmail({
          heading: content.title || subject,
          paragraphs: content.body.trim().split(/\n{2,}/),
          ...(link ? { button: { label: 'Open', url: link } } : {}),
        });
      try {
        const log = await sendMail({ from, to: [user.email], subject, ...body });
        return { delivered: true, channel, emailLogId: log._id };
      } catch (err) {
        return notDelivered(err.message);
      }
    }

    if (channel === 'push') {
      const notification = await sendUserNotification(user._id, {
        title: content.title || content.subject || BRAND,
        message: content.body,
        data: {
          type: 'campaign',
          ...(rule.id ? { ruleId: String(rule.id) } : {}),
          ...(id ? { ccEventsNotificationId: String(id) } : {}),
          ...(link ? { url: link } : {}),
        },
      });
      if (!notification) return notDelivered('User not found');
      return { delivered: true, channel, notificationId: notification._id };
    }

    return notDelivered(`Channel "${escapeHtml(channel)}" is not supported by AGSB`);
  };

  router.post('/events/deliver', async (req, res) => {
    const check = verifySignature(req);
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.message });
    res.json({ success: true, ...(await deliver(req.body)) });
  });

  return router;
};
