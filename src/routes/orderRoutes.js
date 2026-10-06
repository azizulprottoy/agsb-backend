const { asyncRouter } = require('../utils/asyncRouter');
const orderController = require('../controllers/orderController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

module.exports = (collections) => {
  const router = asyncRouter();
  const ctrl = orderController(collections);

  router.post('/orders', verifyToken, ctrl.createOrder);
  router.get('/orders/my', verifyToken, ctrl.getMyOrders);
  router.get('/orders', verifyToken, requireAdmin, ctrl.getAllOrders);
  router.get('/orders/:id', verifyToken, ctrl.getOrder);
  router.put('/orders/:id/payment', verifyToken, ctrl.submitPayment);
  router.patch('/orders/:id/payment-status', verifyToken, requireAdmin, ctrl.updatePaymentStatus);
  router.patch('/orders/:id/status', verifyToken, requireAdmin, ctrl.updateOrderStatus);

  return router;
};
