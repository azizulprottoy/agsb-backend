const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');
const { toObjectId } = require('../utils/ids');

// Set once by initAuth() (index.js, after connectDB). verifyToken looks up the
// token's account on every request so deleted accounts and revoked tokens
// (tokenVersion bumped by /auth/logout-all) stop working immediately.
let accounts = null;

const initAuth = ({ AdminCollection, UserCollection }) => {
  accounts = { admin: AdminCollection, user: UserCollection };
};

const unauthorized = (res, message = 'Invalid or expired token') =>
  res.status(401).json({ success: false, message });

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'No token provided');
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) return unauthorized(res);
    try {
      if (!accounts) throw new Error('Auth middleware used before initAuth()');

      const role = decoded.role === 'admin' ? 'admin' : 'user';
      const id = toObjectId(String(decoded.userId ?? ''));
      const account = id && await accounts[role].findOne(
        { _id: id },
        { projection: { name: 1, email: 1, tokenVersion: 1 } }
      );
      // Tokens issued before revocation existed carry no `tv`; treat as 0.
      if (!account || (Number(decoded.tv) || 0) !== (Number(account.tokenVersion) || 0)) {
        return unauthorized(res);
      }

      req.user = {
        userId: String(account._id),
        role,
        name: account.name || '',
        email: account.email || '',
        tv: Number(account.tokenVersion) || 0,
      };
      next();
    } catch (lookupErr) {
      next(lookupErr);
    }
  });
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// verifyToken when an Authorization header is sent, otherwise continue
// anonymously (req.user stays unset). For endpoints that are public but give
// signed-in users more.
const optionalAuth = (req, res, next) => (req.headers.authorization ? verifyToken(req, res, next) : next());

module.exports = { verifyToken, optionalAuth, requireAdmin, initAuth };
