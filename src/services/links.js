// Absolute links into the public website, for emails and push notifications.
// WEB_APP_URL is the site's origin (no trailing slash needed).

const DEFAULT_WEB_APP_URL = 'https://amighurisharabangladesh.com';

const webAppOrigin = () => (process.env.WEB_APP_URL || DEFAULT_WEB_APP_URL).replace(/\/+$/, '');

// '/bookings/AB12/tickets' -> 'https://.../bookings/AB12/tickets'. Absolute
// http(s) URLs pass through; anything else falls back to the home page.
const webAppUrl = (path = '/') => {
  const value = String(path || '/');
  if (/^https?:\/\//i.test(value)) return value;
  return `${webAppOrigin()}${value.startsWith('/') ? value : '/'}`;
};

module.exports = { webAppOrigin, webAppUrl };
