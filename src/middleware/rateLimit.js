// Minimal in-memory fixed-window rate limiter, keyed by client IP.
// State lives in this process only, so limits reset on restart and are not
// shared between instances. Behind a reverse proxy, req.ip is the proxy's
// address unless app.set('trust proxy', ...) is configured.
const rateLimit = ({ max, windowMs, message = 'Too many attempts. Please try again later.' }) => {
  const hits = new Map(); // key -> { count, resetAt }

  const pruner = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, Math.min(windowMs, 60 * 1000));
  pruner.unref();

  return (req, res, next) => {
    const key = req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ success: false, message });
    }
    next();
  };
};

module.exports = { rateLimit };
