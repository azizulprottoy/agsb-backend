const JWT_SECRET = process.env.JWT_SECRET;

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

// Comma-separated list, e.g. CORS_ORIGINS=https://amighurechi.com,https://admin.amighurechi.com
const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : DEFAULT_CORS_ORIGINS;

module.exports = { JWT_SECRET, CORS_ORIGINS };
