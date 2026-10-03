const { asyncRouter } = require('../utils/asyncRouter');
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');

// Separate limiters so admin, user login and signup each have their own budget.
// Logins only count failed attempts, so people sharing an IP (office, mobile
// carrier NAT) aren't locked out by each other's successful sign-ins.
const adminLoginLimit = rateLimit({ max: 10, windowMs: 15 * 60 * 1000, message: 'Too many login attempts. Please try again later.', skipSuccessful: true });
const loginLimit = rateLimit({ max: 10, windowMs: 15 * 60 * 1000, message: 'Too many login attempts. Please try again later.', skipSuccessful: true });
const signupLimit = rateLimit({ max: 5, windowMs: 60 * 60 * 1000, message: 'Too many signup attempts. Please try again later.' });

module.exports = (collections) => {
  const router = asyncRouter();
  const ctrl = authController(collections);

  router.post('/auth/admin/login', adminLoginLimit, ctrl.adminLogin);
  router.post('/auth/signup', signupLimit, ctrl.signup);
  router.post('/auth/login', loginLimit, ctrl.login);
  router.get('/auth/me', verifyToken, ctrl.me);
  router.post('/auth/logout-all', verifyToken, ctrl.logoutAll);

  return router;
};
