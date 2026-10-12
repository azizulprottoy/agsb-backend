const { trackEvent, identify, contextFromRequest, getConfig } = require('../utils/ccEvents');
const RULES = require('./eventRules');
const createCatalog = require('./catalog');
const createSessions = require('./sessions');

// Sends a CC Events event for every request that has a rule in eventRules.js.
// Runs after the response has finished, so it never slows down or breaks a
// route. Mounted once in index.js, before the /api routers.

const trackAllReads = () => process.env.CC_EVENTS_TRACK_ALL_READS === 'true';
const dropUndefined = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

// Anonymous requests (most page loads) are credited to a traveller seen
// earlier from the same IP + browser, when one signed in or booked recently.
const VISITOR_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_VISITORS = 50000;
const knownVisitors = new Map();

const visitorKey = (req) => `${contextFromRequest(req).ip}|${req.get('user-agent') || ''}`;

function rememberVisitor(req, externalId) {
  if (knownVisitors.size >= MAX_VISITORS) knownVisitors.delete(knownVisitors.keys().next().value);
  knownVisitors.set(visitorKey(req), { externalId, expires: Date.now() + VISITOR_TTL_MS });
}

function recallVisitor(req) {
  const hit = knownVisitors.get(visitorKey(req));
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    knownVisitors.delete(visitorKey(req));
    return null;
  }
  return hit.externalId;
}

const anonymousId = (req) => recallVisitor(req) || req.get('x-device-id') || `anon:${contextFromRequest(req).ip}`;

// Who did it: the route's own id (e.g. the new account on signup), then the
// signed-in account, then a remembered visitor, device id or IP.
function resolveExternalId(req, rule, body) {
  const fromRule = rule.id?.(req, body);
  if (fromRule) {
    const id = String(fromRule);
    if (!id.startsWith('admin:')) rememberVisitor(req, id);
    return id;
  }
  if (req.user?.role === 'admin') return `admin:${req.user.userId}`;
  if (req.user?.userId) {
    rememberVisitor(req, req.user.userId);
    return req.user.userId;
  }
  return anonymousId(req);
}

// Keep the JSON the route sends so rules can read it.
function captureResponse(res) {
  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    res.locals.responseBody = payload;
    return originalJson(payload);
  };
}

const routeKey = (req) => `${req.method} ${req.route?.path}`;
const responseBody = (res) => (res.locals.responseBody && typeof res.locals.responseBody === 'object' ? res.locals.responseBody : {});

module.exports = (collections) => {
  const catalog = createCatalog(collections);
  const sessions = createSessions();
  const ctx = { catalog, collections };

  async function handle(req, res) {
    const key = routeKey(req);
    const rule = RULES[key];
    if (!rule) return;

    const body = responseBody(res);
    // Every visitor request counts toward their visit, even background ones.
    sessions.touch(req, rule, () => resolveExternalId(req, rule, body));
    if (rule.noisy && !trackAllReads()) return;

    const properties = rule.props ? await rule.props(req, body, ctx) : {};
    if (properties === null) return;

    const externalId = resolveExternalId(req, rule, body);
    const base = { actorType: rule.actor, route: key };
    const context = contextFromRequest(req);

    const profile = rule.identify?.(req, body);
    if (profile?.externalId) identify({ externalId: profile.externalId, traits: dropUndefined(profile.traits || {}) });

    trackEvent({ externalId, event: rule.event, properties: dropUndefined({ ...base, ...properties }), context });

    // Extra events may concern someone else (e.g. the traveller whose booking
    // an admin updated) and carry their own externalId/actorType, or an
    // `identify` to refresh someone's traits.
    const extras = rule.extra ? await rule.extra(req, body, ctx) : [];
    for (const extra of extras) {
      if (extra.identify?.externalId) {
        identify({ externalId: extra.identify.externalId, traits: dropUndefined(extra.identify.traits || {}) });
      }
      if (!extra.event) continue;
      trackEvent({
        externalId: extra.externalId ? String(extra.externalId) : externalId,
        event: extra.event,
        properties: dropUndefined({ ...base, ...(extra.actorType ? { actorType: extra.actorType } : {}), ...extra.properties }),
        context,
      });
    }
  }

  // Rules with onFailure also record rejected requests (4xx), e.g. failed logins.
  async function handleFailure(req, res) {
    const rule = RULES[routeKey(req)];
    if (!rule?.onFailure || res.statusCode < 400 || res.statusCode >= 500) return;
    const body = responseBody(res);
    const extraProps = rule.onFailure.props ? await rule.onFailure.props(req, body, ctx) : {};
    trackEvent({
      externalId: req.user?.role === 'admin' ? `admin:${req.user.userId}` : req.user?.userId || anonymousId(req),
      event: rule.onFailure.event,
      properties: dropUndefined({
        actorType: rule.actor,
        route: routeKey(req),
        status: res.statusCode,
        reason: body.message,
        ...extraProps,
      }),
      context: contextFromRequest(req),
    });
  }

  function eventTracking(req, res, next) {
    if (!getConfig()) return next();
    captureResponse(res);
    res.on('finish', () => {
      const rule = RULES[routeKey(req)];
      const ok = res.statusCode >= 200 && res.statusCode < 300;
      // File downloads may answer with a redirect to the file.
      const redirect = rule?.allowRedirect && res.statusCode >= 300 && res.statusCode < 400;
      const run = ok || redirect ? handle(req, res) : handleFailure(req, res);
      run.catch((err) => console.error('CC Events tracking failed:', err.message));
    });
    next();
  }

  return { eventTracking };
};
