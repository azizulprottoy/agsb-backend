// CC Events client: sends analytics events to the CC Events backend.
// Configured by CC_EVENTS_URL, CC_EVENTS_API_KEY and CC_EVENTS_API_SECRET;
// when any is missing tracking is a silent no-op.
//
// Every call is fire-and-forget: it never throws and never delays the
// caller's response. Failures are only logged.

// CC Events ingest does several DB round-trips; allow for a slow remote DB.
const TIMEOUT_MS = 10000;
const MAX_EVENT_NAME_LENGTH = 100;

let warnedUnconfigured = false;

function getConfig() {
  const url = process.env.CC_EVENTS_URL;
  const key = process.env.CC_EVENTS_API_KEY;
  const secret = process.env.CC_EVENTS_API_SECRET;
  if (!url || !key || !secret) return null;
  return { url: url.replace(/\/+$/, ''), key, secret };
}

async function post(path, body) {
  const config = getConfig();
  if (!config) {
    if (!warnedUnconfigured) {
      console.warn('CC Events not configured (CC_EVENTS_URL / CC_EVENTS_API_KEY / CC_EVENTS_API_SECRET); events are not sent.');
      warnedUnconfigured = true;
    }
    return;
  }

  try {
    const response = await fetch(`${config.url}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.key,
        'X-API-Secret': config.secret,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error(`CC Events ${path} failed: ${response.status} ${text.slice(0, 200)}`);
    }
  } catch (err) {
    console.error(`CC Events ${path} failed:`, err.message);
  }
}

function isValidEventName(name) {
  return typeof name === 'string' && name.trim().length > 0 && name.length <= MAX_EVENT_NAME_LENGTH;
}

// Request metadata CC Events stores alongside each event.
function contextFromRequest(req) {
  return {
    // req.ip honours the app's TRUST_PROXY setting, so it can't be spoofed.
    ip: req.ip || null,
    userAgent: req.get('user-agent') || null,
    url: req.get('referer') || null,
  };
}

function trackEvent({ externalId, event, properties = {}, source = 'server', context } = {}) {
  if (!externalId || !isValidEventName(event)) return Promise.resolve();
  return post('/v1/events', {
    externalId: String(externalId),
    event,
    source,
    properties,
    ...(context ? { context } : {}),
  });
}

// Attach traits (email, phone, name...) so CC Events can notify the user.
function identify({ externalId, traits = {} } = {}) {
  if (!externalId) return Promise.resolve();
  return post('/v1/identify', { externalId: String(externalId), traits });
}

module.exports = { trackEvent, identify, contextFromRequest, isValidEventName, getConfig };
