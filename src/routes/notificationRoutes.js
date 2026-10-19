const { asyncRouter } = require('../utils/asyncRouter');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { requireId, toObjectId } = require('../utils/ids');
const notifications = require('../services/notifications');
const push = require('../services/push');

// The signed-in traveller's notifications (website bell) and the devices
// their pushes go to. Admins accounts have no notifications of their own;
// they send them with POST /notifications.
const requireUser = (req, res, next) => {
  if (req.user.role !== 'user') return res.status(403).json({ success: false, message: 'Only traveller accounts have notifications' });
  next();
};

const MAX_RECIPIENTS = 500;

module.exports = () => {
  const router = asyncRouter();

  router.get('/notifications/me', verifyToken, requireUser, async (req, res) => {
    res.json({ success: true, ...(await notifications.listForUser(req.user.userId, req.query)) });
  });

  router.post('/notifications/read-all', verifyToken, requireUser, async (req, res) => {
    const updated = await notifications.markAllRead(req.user.userId);
    res.json({ success: true, updated });
  });

  // Declared before '/notifications/:id' so they don't match it.
  // Body: { token, platform?: 'web' | 'android' | 'ios' }
  router.post('/notifications/device-token', verifyToken, requireUser, async (req, res) => {
    const { token, platform, error } = push.validateDeviceToken(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    await push.registerDeviceToken(toObjectId(req.user.userId), token, platform);
    res.json({ success: true, message: 'Device registered for push notifications' });
  });

  router.delete('/notifications/device-token', verifyToken, requireUser, async (req, res) => {
    const { token, error } = push.validateDeviceToken(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    await push.removeDeviceToken(toObjectId(req.user.userId), token);
    res.json({ success: true, message: 'Device unregistered from push notifications' });
  });

  // Body: { isRead?: boolean } (default true)
  router.patch('/notifications/:id', verifyToken, requireUser, async (req, res) => {
    const id = requireId(req.params.id);
    const isRead = req.body?.isRead === undefined ? true : req.body.isRead === true;
    const notification = await notifications.setRead(req.user.userId, id, isRead);
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, notification });
  });

  router.delete('/notifications/:id', verifyToken, requireUser, async (req, res) => {
    const id = requireId(req.params.id);
    if (!(await notifications.remove(req.user.userId, id))) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true, message: 'Notification deleted' });
  });

  // Admin sends a notification (in-app + push) to one or more travellers.
  // Body: { userIds: [id...], title, message, url? }  url is a site path like /plans/x
  router.post('/notifications', verifyToken, requireAdmin, async (req, res) => {
    const { userIds, title, message, url } = req.body || {};
    const ids = [...new Set((Array.isArray(userIds) ? userIds : [userIds]).map((v) => String(v ?? '')))]
      .map((v) => toObjectId(v));
    if (!ids.length || ids.some((v) => !v)) return res.status(400).json({ success: false, message: 'userIds must be a list of user ids' });
    if (ids.length > MAX_RECIPIENTS) return res.status(400).json({ success: false, message: `At most ${MAX_RECIPIENTS} recipients` });
    if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ success: false, message: 'Title is required' });
    if (typeof message !== 'string' || !message.trim()) return res.status(400).json({ success: false, message: 'Message is required' });
    const path = typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') ? url : undefined;

    const results = await Promise.all(ids.map((id) => notifications.sendUserNotification(id, {
      title: title.trim(),
      message: message.trim(),
      data: { type: 'admin', ...(path ? { url: path } : {}) },
    })));
    const sent = results.filter(Boolean).length;
    res.status(201).json({ success: true, sent, notFound: ids.length - sent });
  });

  return router;
};
