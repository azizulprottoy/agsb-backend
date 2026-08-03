const JWT_SECRET = process.env.JWT_SECRET;

const CORS_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

module.exports = { JWT_SECRET, CORS_ORIGINS };
