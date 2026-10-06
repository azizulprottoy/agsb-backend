const { asyncRouter } = require('../utils/asyncRouter');
const reviewController = require('../controllers/reviewController');
const { verifyToken, optionalAuth, requireAdmin } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');

// 20 reviews/comments per IP per 10 minutes.
const postLimiter = rateLimit({
  max: 20,
  windowMs: 10 * 60 * 1000,
  message: 'You are posting too fast. Please try again in a few minutes.',
});

module.exports = (collections) => {
  const router = asyncRouter();
  const ctrl = reviewController(collections);

  // Admin routes first so "admin" is never read as a :type.
  router.get('/reviews/admin', verifyToken, requireAdmin, ctrl.getAllFeedback);
  router.patch('/reviews/:id', verifyToken, requireAdmin, ctrl.setFeedbackStatus);

  // :type is plan | product | blog; :target is the item's slug or id.
  router.get('/reviews/:type/:target', optionalAuth, ctrl.getFeedback);
  router.post('/reviews/:type/:target', verifyToken, postLimiter, ctrl.addFeedback);
  router.delete('/reviews/:id', verifyToken, ctrl.deleteFeedback);

  return router;
};
