const { asyncRouter } = require('../utils/asyncRouter');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { requireId } = require('../utils/ids');
const mail = require('../services/mail');

// Admin panel mail: company mailboxes, compose/send, inbox + sent logs.
// POST /mail/send accepts a larger JSON body (inline base64 images, turned
// into CID attachments by the mail service); see index.js. The body is not
// run through sanitizeRichText: that would strip those data: images, and
// only admins send from here.
module.exports = () => {
  const router = asyncRouter();
  const admin = [verifyToken, requireAdmin];

  router.get('/mail/mailboxes', admin, (req, res) => {
    res.json({ success: true, data: mail.listMailboxes() });
  });

  router.post('/mail/mailboxes/:mailbox/verify', admin, async (req, res) => {
    const result = await mail.verifyMailbox(req.params.mailbox);
    res.json({ success: result.success, data: result });
  });

  // Body: { from: 'no-reply' | 'business' | 'support', to, cc?, bcc?, subject, html?, text?, senderName? }
  router.post('/mail/send', admin, async (req, res) => {
    const { from, to, cc, bcc, subject, html, text, senderName } = req.body || {};
    const email = await mail.sendMail({
      from, to, cc, bcc, subject, html, text, senderName,
      sentBy: req.user.userId,
    });
    const { html: _omit, ...data } = email;
    res.status(201).json({ success: true, message: 'Email sent', data });
  });

  // Body: { mailbox, limit? }
  router.post('/mail/inbox/sync', admin, async (req, res) => {
    const result = await mail.syncInbox(req.body?.mailbox, req.body?.limit);
    res.json({ success: true, data: result });
  });

  // ?page&limit&q&type=sent|inbox&mailbox&status=sent|failed
  router.get('/mail/emails', admin, async (req, res) => {
    res.json({ success: true, ...(await mail.listEmails(req.query)) });
  });

  router.get('/mail/emails/:id', admin, async (req, res) => {
    res.json({ success: true, data: await mail.getEmail(requireId(req.params.id)) });
  });

  // Body: { read?: boolean } (default true)
  router.patch('/mail/emails/:id/read', admin, async (req, res) => {
    const read = req.body?.read === undefined ? true : req.body.read === true;
    res.json({ success: true, data: await mail.setRead(requireId(req.params.id), read) });
  });

  router.delete('/mail/emails/:id', admin, async (req, res) => {
    await mail.deleteEmail(requireId(req.params.id));
    res.json({ success: true, message: 'Email deleted' });
  });

  return router;
};
