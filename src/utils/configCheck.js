// Startup configuration check. Run before anything reads these variables so a
// misconfigured deploy fails at boot with a clear message instead of at the
// first login (missing secret) or first query (missing database URI).
const { parseTrustProxy } = require('./trustProxy');

const MIN_JWT_SECRET_LENGTH = 32;

// Returns a list of problems; an empty list means the config is usable.
const checkConfig = (env = process.env) => {
  const errors = [];
  const secret = env.JWT_SECRET || '';
  if (!secret.trim()) {
    errors.push('JWT_SECRET is not set');
  } else if (secret.length < MIN_JWT_SECRET_LENGTH) {
    errors.push(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters (got ${secret.length})`);
  }
  if (!(env.MONGO_URI || '').trim()) {
    errors.push('MONGO_URI is not set');
  }
  try {
    parseTrustProxy(env.TRUST_PROXY);
  } catch (err) {
    errors.push(err.message);
  }
  return errors;
};

// Logs every problem and exits the process when the config is unusable.
const assertConfig = (env = process.env) => {
  const errors = checkConfig(env);
  if (errors.length) {
    console.error('FATAL: invalid configuration:');
    errors.forEach((e) => console.error(`  - ${e}`));
    console.error('Set these in the environment or .env (see .env.example).');
    process.exit(1);
  }
};

module.exports = { checkConfig, assertConfig, MIN_JWT_SECRET_LENGTH };
