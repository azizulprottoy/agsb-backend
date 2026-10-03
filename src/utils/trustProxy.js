// Value for app.set('trust proxy', ...) from the TRUST_PROXY env var:
//   unset/''      -> false (clients connect directly)
//   '1', '2', ... -> trust that many proxy hops
//   anything else -> passed through as Express's address/subnet list
//                    (e.g. 'loopback', '10.0.0.0/8, 172.16.0.0/12')
// 'true' is rejected: trusting every hop lets clients spoof X-Forwarded-For
// and so dodge the rate limits.
const parseTrustProxy = (raw) => {
  const value = String(raw ?? '').trim();
  if (!value || value === 'false' || value === '0') return false;
  if (/^\d+$/.test(value)) return Number(value);
  if (value === 'true') {
    throw new Error('TRUST_PROXY=true is not allowed; set the number of proxy hops (e.g. 1) or the proxy subnet');
  }
  return value;
};

module.exports = { parseTrustProxy };
