const { asyncRouter } = require('../utils/asyncRouter');
const contactController = require('../controllers/contactController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');

// Public form: 5 submissions per IP per 10 minutes.
const contactLimiter = rateLimit({
  max: 5,
  windowMs: 10 * 60 * 1000,
  message: 'Too many messages sent. Please try again in a few minutes.',
});

module.exports = (collections) => {
  const router = asyncRouter();
  const ctrl = contactController(collections);

  router.post('/contact', contactLimiter, ctrl.submitContact);
  router.get('/contact', verifyToken, requireAdmin, ctrl.getContactMessages);
  router.patch('/contact/:id', verifyToken, requireAdmin, ctrl.updateContactMessage);
  router.delete('/contact/:id', verifyToken, requireAdmin, ctrl.deleteContactMessage);

  return router;
};
