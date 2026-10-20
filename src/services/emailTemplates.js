// HTML email layout shared by every automatic email. Table-based with inline
// styles because that is what mail clients (Gmail, Outlook) render reliably.
// Every value passed in is escaped here; callers pass plain text.

const { BRAND } = require('./mail');
const { webAppUrl } = require('./links');

const ACCENT = '#0f766e';

const escapeHtml = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const taka = (amount) => `৳${Number(amount || 0).toLocaleString('en-US')}`;

/**
 * @param {object} email
 * @param {string} email.heading     big title line
 * @param {string} [email.greeting]  e.g. "Hi Rahim,"
 * @param {string[]} email.paragraphs
 * @param {Array<[string, string]>} [email.details]  label/value rows (booking summary)
 * @param {string} [email.code]    one-time code shown large
 * @param {{label: string, url: string}} [email.button]
 * @param {string} [email.footnote]  small print under the button
 * @returns {{ html: string, text: string }}
 */
const renderEmail = ({ heading, greeting, paragraphs = [], details = [], code, button, footnote }) => {
  const p = (text) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#1f2937">${escapeHtml(text)}</p>`;
  const rows = details.filter(([, v]) => v !== undefined && v !== null && v !== '').map(([label, value]) => `
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#6b7280;width:45%">${escapeHtml(label)}</td>
            <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600">${escapeHtml(value)}</td>
          </tr>`).join('');
  const buttonUrl = button ? webAppUrl(button.url) : '';

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
        <tr><td style="background:${ACCENT};padding:18px 24px;color:#ffffff;font-size:18px;font-weight:700">${escapeHtml(BRAND)}</td></tr>
        <tr><td style="padding:28px 24px 8px">
          <h1 style="margin:0 0 18px;font-size:21px;line-height:1.3;color:#111827">${escapeHtml(heading)}</h1>
          ${greeting ? p(greeting) : ''}
          ${paragraphs.map(p).join('')}
          ${rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb">${rows}</table>` : ''}
          ${code ? `<p style="margin:4px 0 22px;text-align:center"><span style="display:inline-block;padding:14px 22px;background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;font-size:32px;font-weight:700;letter-spacing:10px;color:#111827;font-family:Menlo,Consolas,monospace">${escapeHtml(code)}</span></p>` : ''}
          ${button ? `<p style="margin:8px 0 22px"><a href="${escapeHtml(buttonUrl)}" style="display:inline-block;padding:12px 22px;background:${ACCENT};color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">${escapeHtml(button.label)}</a></p>` : ''}
          ${footnote ? `<p style="margin:0 0 18px;font-size:13px;line-height:1.5;color:#6b7280">${escapeHtml(footnote)}</p>` : ''}
        </td></tr>
        <tr><td style="padding:16px 24px 24px;border-top:1px solid #f3f4f6;font-size:12px;color:#9ca3af">
          This is an automatic email from ${escapeHtml(BRAND)}. Please don't reply to it; contact us through <a href="${escapeHtml(webAppUrl('/contact'))}" style="color:${ACCENT}">our contact page</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    heading,
    '',
    ...(greeting ? [greeting, ''] : []),
    ...paragraphs.flatMap((t) => [t, '']),
    ...details.filter(([, v]) => v !== undefined && v !== null && v !== '').map(([l, v]) => `${l}: ${v}`),
    ...(details.length ? [''] : []),
    ...(code ? [`Your code: ${code}`, ''] : []),
    ...(button ? [`${button.label}: ${buttonUrl}`, ''] : []),
    ...(footnote ? [footnote, ''] : []),
    `— ${BRAND}`,
  ].join('\n');

  return { html, text };
};

const greet = (name) => `Hi ${String(name || '').trim() || 'there'},`;

const welcomeEmail = (user) => ({
  subject: `Welcome to ${BRAND}`,
  ...renderEmail({
    heading: 'Welcome aboard!',
    greeting: greet(user.name),
    paragraphs: [
      'Your account is ready. Browse upcoming tour plans, book seats for you and your travel mates, and keep track of every district you have visited.',
    ],
    button: { label: 'Explore tour plans', url: '/plans' },
  }),
});

const passwordResetCodeEmail = (user, code, minutes) => ({
  subject: `${code} is your password reset code`,
  ...renderEmail({
    heading: 'Reset your password',
    greeting: greet(user.name),
    paragraphs: ['We received a request to reset the password for your account. Enter this code to continue:'],
    code,
    footnote: `The code expires in ${minutes} minutes and works once. Never share it with anyone; we will never ask for it. If you didn't ask to reset your password, ignore this email and your password stays the same.`,
  }),
});

const passwordChangedEmail = (user) => ({
  subject: 'Your password was changed',
  ...renderEmail({
    heading: 'Your password was changed',
    greeting: greet(user.name),
    paragraphs: [
      'The password for your account was just changed, and every other device was signed out.',
      "If this wasn't you, reset your password right away and contact us.",
    ],
    button: { label: 'Reset password', url: '/forgot-password' },
  }),
});

module.exports = { renderEmail, escapeHtml, taka, greet, welcomeEmail, passwordResetCodeEmail, passwordChangedEmail };
