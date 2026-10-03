const { asyncRouter } = require('../utils/asyncRouter');
const paymentMethodController = require('../controllers/paymentMethodController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

module.exports = (collections) => {
  const router = asyncRouter();
  const ctrl = paymentMethodController(collections);

  router.get('/payment-methods', ctrl.getPaymentMethods);
  // Declared before any '/payment-methods/:id' route.
  router.get('/payment-methods/admin', verifyToken, requireAdmin, ctrl.getAllPaymentMethods);
  router.post('/payment-methods', verifyToken, requireAdmin, ctrl.addPaymentMethod);
  router.put('/payment-methods/:id', verifyToken, requireAdmin, ctrl.editPaymentMethod);
  router.delete('/payment-methods/:id', verifyToken, requireAdmin, ctrl.deletePaymentMethod);

  return router;
};
