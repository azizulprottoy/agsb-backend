// Company mail: the cPanel mailboxes on amighurisharabangladesh.com.
// Sends over SMTP (nodemailer), pulls inboxes over IMAP for the admin panel,
// and logs every sent and synced email in the `emaillogs` collection.
//
// Passwords live only in env (.env). A mailbox
// without a password is reported as unconfigured and refuses to send.

const nodemailer = require('nodemailer');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { httpError } = require('../utils/http');
const { escapeRegex, parseListQuery } = require('../utils/pagination');
const { toObjectId } = require('../utils/ids');

const DOMAIN = 'amighurisharabangladesh.com';
const BRAND = 'Ami Ghuri Shara Bangladesh';

const MAILBOXES = [
  { key: 'no-reply', address: `no-reply@${DOMAIN}`, name: BRAND, passwordEnv: 'MAIL_NOREPLY_PASSWORD' },
  { key: 'business', address: `business@${DOMAIN}`, name: `${BRAND} Business`, passwordEnv: 'MAIL_BUSINESS_PASSWORD' },
  { key: 'support', address: `support@${DOMAIN}`, name: `${BRAND} Support`, passwordEnv: 'MAIL_SUPPORT_PASSWORD' },
];

const MAX_RECIPIENTS = 50;
const MAX_INBOX_SYNC = 200;
const EMAIL_RE = /^[^\s@<>(),;:]+@[^\s@<>(),;:]+\.[^\s@<>(),;:]+$/;
const LIST_SORT = { date: -1, _id: -1 };

// 502/503 from here are meant for the admin (bad password, SMTP down), so
// the error handler shows their message instead of "Internal server error".
const mailError = (status, message) => Object.assign(httpError(status, message), { expose: true });

const host = () => process.env.MAIL_HOST || DOMAIN;
const smtpPort = () => Number(process.env.MAIL_SMTP_PORT || 465);
const imapPort = () => Number(process.env.MAIL_IMAP_PORT || 993);
const tls = () => ({ rejectUnauthorized: process.env.MAIL_TLS_REJECT_UNAUTHORIZED !== 'false' });

// Set once by initMail() (index.js, after connectDB).
let EmailLogs = null;

const initMail = ({ EmailLogCollection }) => {
  EmailLogs = EmailLogCollection;
};

const isConfigured = (box) => Boolean(process.env[box.passwordEnv]);

// Accepts a mailbox key ('support') or its address ('support@...').
const resolveMailbox = (keyOrAddress) => {
  const value = String(keyOrAddress || '').trim().toLowerCase();
  const box = MAILBOXES.find((b) => b.key === value || b.address === value);
  if (!box) throw httpError(400, `Unknown mailbox "${keyOrAddress}"`);
  if (!isConfigured(box)) throw mailError(503, `Mailbox ${box.address} has no password configured (${box.passwordEnv})`);
  return box;
};

const listMailboxes = () =>
  MAILBOXES.map((box) => ({ key: box.key, address: box.address, name: box.name, configured: isConfigured(box) }));

const transporters = new Map();

const getTransporter = (box) => {
  if (!transporters.has(box.address)) {
    transporters.set(box.address, nodemailer.createTransport({
      host: host(),
      port: smtpPort(),
      secure: smtpPort() === 465,
      auth: { user: box.address, pass: process.env[box.passwordEnv] },
      tls: tls(),
    }));
  }
  return transporters.get(box.address);
};

const toList = (value) => {
  if (!value) return [];
  const items = Array.isArray(value) ? value : String(value).split(/[,;\n]/);
  return items.map((s) => String(s).trim().toLowerCase()).filter(Boolean);
};

const assertEmails = (list, field) => {
  const bad = list.find((e) => !EMAIL_RE.test(e));
  if (bad) throw httpError(400, `Invalid email in ${field}: ${bad}`);
};

const htmlToText = (html) =>
  html.replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr)[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// Inline base64 images (from the rich text editor) become CID attachments,
// which mail clients render far more reliably than data: URLs.
const inlineImages = (html) => {
  const attachments = [];
  const out = html.replace(/src="data:(image\/[a-zA-Z+.-]+);base64,([^"]+)"/g, (match, contentType, content) => {
    const cid = `img${attachments.length}@${DOMAIN}`;
    attachments.push({ cid, encoding: 'base64', content, contentType });
    return `src="cid:${cid}"`;
  });
  return { html: out, attachments };
};

/**
 * Send an email from one of the company mailboxes and log it. Throws an
 * httpError on bad input (400), an unconfigured mailbox (503) or an SMTP
 * failure (502). Returns the saved log document.
 */
const sendMail = async ({ from, to, cc, bcc, subject, html, text, senderName, sentBy } = {}) => {
  if (!EmailLogs) throw new Error('Mail service used before initMail()');
  const box = resolveMailbox(from || 'no-reply');
  const toArr = toList(to);
  const ccArr = toList(cc);
  const bccArr = toList(bcc);

  if (!toArr.length) throw httpError(400, 'At least one recipient is required');
  if (toArr.length + ccArr.length + bccArr.length > MAX_RECIPIENTS) {
    throw httpError(400, `Too many recipients (max ${MAX_RECIPIENTS} per email)`);
  }
  assertEmails(toArr, 'to');
  assertEmails(ccArr, 'cc');
  assertEmails(bccArr, 'bcc');
  if (typeof subject !== 'string' || !subject.trim()) throw httpError(400, 'Subject is required');
  if (!html && !text) throw httpError(400, 'Body is required');

  const name = String(senderName || box.name).replace(/["\r\n]/g, '');
  const { html: htmlBody, attachments } = inlineImages(String(html || ''));
  const textBody = text ? String(text) : htmlToText(htmlBody);

  const log = {
    type: 'sent',
    mailbox: box.address,
    from: box.address,
    senderName: name,
    to: toArr,
    cc: ccArr,
    bcc: bccArr,
    subject: subject.trim(),
    html: htmlBody,
    text: textBody,
    date: new Date(),
    read: true,
    sentBy: toObjectId(sentBy ? String(sentBy) : '') || null,
  };

  try {
    const info = await getTransporter(box).sendMail({
      from: `"${name}" <${box.address}>`,
      to: toArr.join(', '),
      cc: ccArr.length ? ccArr.join(', ') : undefined,
      bcc: bccArr.length ? bccArr.join(', ') : undefined,
      subject: log.subject,
      text: textBody,
      html: htmlBody || undefined,
      attachments,
    });
    const doc = { ...log, status: 'sent', messageId: info.messageId };
    const { insertedId } = await EmailLogs.insertOne(doc);
    return { ...doc, _id: insertedId };
  } catch (err) {
    if (err.status) throw err;
    await EmailLogs.insertOne({ ...log, status: 'failed', error: err.message }).catch(() => {});
    throw mailError(502, `Failed to send email: ${err.message}`);
  }
};

/**
 * Fire-and-forget version of sendMail for automatic emails (welcome, booking
 * updates). Never throws and never delays the caller; failures are logged
 * (and recorded in emaillogs when the SMTP send itself failed).
 */
const sendMailQuietly = (message) => {
  sendMail(message).catch((err) => {
    console.error(`Email "${message?.subject}" to ${message?.to} failed:`, err.message);
  });
};

// Checks SMTP login for a mailbox without sending anything.
const verifyMailbox = async (keyOrAddress) => {
  const box = resolveMailbox(keyOrAddress);
  try {
    await getTransporter(box).verify();
    return { mailbox: box.address, success: true };
  } catch (err) {
    return { mailbox: box.address, success: false, message: err.message };
  }
};

/**
 * Pull the latest `limit` messages from a mailbox's INBOX over IMAP and upsert
 * them into emaillogs by (mailbox, uid). Local read state survives a re-sync.
 */
const syncInbox = async (keyOrAddress, limit = 50) => {
  const box = resolveMailbox(keyOrAddress);
  const count = Math.min(Math.max(Number(limit) || 50, 1), MAX_INBOX_SYNC);

  const client = new ImapFlow({
    host: host(),
    port: imapPort(),
    secure: true,
    auth: { user: box.address, pass: process.env[box.passwordEnv] },
    tls: tls(),
    logger: false,
  });

  const fetched = [];
  try {
    await client.connect();
  } catch (err) {
    throw mailError(502, `IMAP login failed for ${box.address}: ${err.message}`);
  }
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const total = client.mailbox.exists;
      if (total > 0) {
        const start = Math.max(1, total - count + 1);
        for await (const msg of client.fetch(`${start}:*`, { uid: true, flags: true, source: true })) {
          fetched.push({ uid: msg.uid, seen: msg.flags?.has('\\Seen') ?? false, source: msg.source });
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  const ops = [];
  for (const msg of fetched) {
    const parsed = await simpleParser(msg.source);
    ops.push({
      updateOne: {
        filter: { type: 'inbox', mailbox: box.address, uid: msg.uid },
        update: {
          $set: {
            from: parsed.from?.text || '',
            senderName: parsed.from?.value?.[0]?.name || '',
            to: toList(parsed.to?.value?.map((a) => a.address)),
            cc: toList(parsed.cc?.value?.map((a) => a.address)),
            subject: parsed.subject || '(no subject)',
            html: parsed.html || '',
            text: parsed.text || '',
            date: parsed.date || new Date(),
            messageId: parsed.messageId,
          },
          $setOnInsert: { read: msg.seen },
        },
        upsert: true,
      },
    });
  }
  if (ops.length) await EmailLogs.bulkWrite(ops);

  return { mailbox: box.address, synced: ops.length };
};

// Filtering old logs should still work if a mailbox loses its password.
const mailboxAddress = (keyOrAddress) => {
  const value = String(keyOrAddress).trim().toLowerCase();
  return MAILBOXES.find((b) => b.key === value)?.address || value;
};

// Admin list: ?page&limit&q plus ?type=sent|inbox, ?mailbox, ?status=sent|failed.
const listEmails = async (query = {}) => {
  const { page, limit, q } = parseListQuery(query);
  const filter = {};
  if (['sent', 'inbox'].includes(query.type)) filter.type = query.type;
  if (typeof query.mailbox === 'string' && query.mailbox) filter.mailbox = mailboxAddress(query.mailbox);
  if (['sent', 'failed'].includes(query.status)) filter.status = query.status;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ subject: rx }, { from: rx }, { to: rx }];
  }

  const [items, total, unread] = await Promise.all([
    EmailLogs.find(filter, { projection: { html: 0 } }).sort(LIST_SORT).skip((page - 1) * limit).limit(limit).toArray(),
    EmailLogs.countDocuments(filter),
    EmailLogs.countDocuments({ ...filter, read: false }),
  ]);
  return { items, total, unread, page, limit, pages: Math.ceil(total / limit) };
};

const getEmail = async (id) => {
  const email = await EmailLogs.findOne({ _id: id });
  if (!email) throw httpError(404, 'Email not found');
  return email;
};

const setRead = async (id, read = true) => {
  const email = await EmailLogs.findOneAndUpdate(
    { _id: id },
    { $set: { read: Boolean(read) } },
    { returnDocument: 'after', projection: { html: 0 } }
  );
  if (!email) throw httpError(404, 'Email not found');
  return email;
};

const deleteEmail = async (id) => {
  const result = await EmailLogs.deleteOne({ _id: id });
  if (!result.deletedCount) throw httpError(404, 'Email not found');
};

module.exports = {
  BRAND,
  initMail,
  listMailboxes,
  resolveMailbox,
  sendMail,
  sendMailQuietly,
  verifyMailbox,
  syncInbox,
  listEmails,
  getEmail,
  setRead,
  deleteEmail,
};
