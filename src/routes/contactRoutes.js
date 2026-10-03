const { asyncRouter } = require('../utils/asyncRouter');
const contactController = require('../controllers/contactController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

module.exports = (collections) => {
  const router = asyncRouter();
  const ctrl = contactController(collections);

  router.post('/contact', ctrl.submitContact);
  router.get('/contact', verifyToken, requireAdmin, ctrl.getContactMessages);
  router.patch('/contact/:id', verifyToken, requireAdmin, ctrl.updateContactMessage);
  router.delete('/contact/:id', verifyToken, requireAdmin, ctrl.deleteContactMessage);

  return router;
};
