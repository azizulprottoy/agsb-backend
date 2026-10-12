const { trackEvent, contextFromRequest } = require('../utils/ccEvents');

// Website visits. A visit (session) starts with a visitor's first storefront
// request after 30 minutes (CC_EVENTS_SESSION_MINUTES) of quiet, whatever page
// they land on, and ends once they've been quiet that long:
//   session_started  — landing page, signed in or not
//   session_ended    — duration, requests, products viewed, last page
// Visitors are told apart by IP + browser. Admin-panel traffic, staff-only
// routes, signed-in admins and bots/scripts don't count.

const SESSION_GAP_MS = (Number(process.env.CC_EVENTS_SESSION_MINUTES) || 30) * 60 * 1000;
const SWEEP_EVERY_MS = Math.min(5 * 60 * 1000, SESSION_GAP_MS / 2);
const MAX_SESSIONS = 50000;
const BOT_UA = /bot|crawl|spider|slurp|curl|wget|python|axios|node-fetch|postman|headless|lighthouse|monitor/i;

// Requests coming from these sites are the admin panel, not shoppers.
const ADMIN_ORIGINS = (process.env.CC_EVENTS_ADMIN_ORIGINS ||
  'http://localhost:5174,http://127.0.0.1:5174,https://admin.amighurechi.com')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function pageOf(req) {
  const referer = req.get('referer');
  if (!referer) return {};
  try {
    const url = new URL(referer);
    return { origin: url.origin, path: url.pathname };
  } catch {
    return {};
  }
}

function isShopperRequest(req, rule) {
  if (!rule || rule.actor === 'admin' || req.user?.role === 'admin') return false;
  if (BOT_UA.test(req.get('user-agent') || '')) return false;
  const origin = req.get('origin') || pageOf(req).origin;
  return !(origin && ADMIN_ORIGINS.includes(origin));
}

module.exports = function createSessions() {
  const sessions = new Map();

  function end(key, session) {
    sessions.delete(key);
    trackEvent({
      externalId: session.externalId,
      event: 'session_ended',
      properties: {
        actorType: 'user',
        durationMinutes: Math.round((session.lastSeen - session.startedAt) / 60000),
        requests: session.requests,
        productsViewed: session.productsViewed,
        landingPage: session.landingPage,
        lastPage: session.lastPage,
        signedIn: session.signedIn,
      },
    });
  }

  // Close sessions that have gone quiet.
  setInterval(() => {
    const cutoff = Date.now() - SESSION_GAP_MS;
    for (const [key, session] of sessions) if (session.lastSeen < cutoff) end(key, session);
  }, SWEEP_EVERY_MS).unref();

  // Called for every tracked request. getExternalId resolves who it is only
  // when needed; isIdentified says whether that's a known customer/seller.
  function touch(req, rule, getExternalId) {
    if (!isShopperRequest(req, rule)) return;

    const ctx = contextFromRequest(req);
    const key = `${ctx.ip}|${req.get('user-agent') || ''}`;
    const now = Date.now();
    const page = pageOf(req).path;
    const externalId = getExternalId();
    const signedIn = !externalId.startsWith('anon:');

    let session = sessions.get(key);
    if (session && now - session.lastSeen > SESSION_GAP_MS) {
      end(key, session);
      session = null;
    }

    if (!session) {
      if (sessions.size >= MAX_SESSIONS) {
        const [oldestKey, oldest] = sessions.entries().next().value;
        end(oldestKey, oldest);
      }
      session = { externalId, startedAt: now, lastSeen: now, requests: 0, productsViewed: 0, landingPage: page, lastPage: page, signedIn };
      sessions.set(key, session);
      trackEvent({
        externalId,
        event: 'session_started',
        properties: { actorType: 'user', landingPage: page, landingRoute: `${req.method} ${req.route?.path}`, signedIn },
        context: ctx,
      });
    }

    session.lastSeen = now;
    session.requests += 1;
    if (page) session.lastPage = page;
    if (rule.event === 'product_viewed') session.productsViewed += 1;
    // A visitor who identifies mid-visit (login, order...) is credited for the whole visit.
    if (signedIn) {
      session.externalId = externalId;
      session.signedIn = true;
    }
  }

  return { touch };
};
