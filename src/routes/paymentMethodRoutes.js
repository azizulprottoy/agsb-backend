const express = require('express');
const paymentMethodController = require('../controllers/paymentMethodController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

module.exports = (collections) => {
  const router = express.Router();
  const ctrl = paymentMethodController(collections);

  router.get('/payment-methods', ctrl.getPaymentMethods);
  router.post('/payment-methods', verifyToken, requireAdmin, ctrl.addPaymentMethod);
  router.put('/payment-methods/:id', verifyToken, requireAdmin, ctrl.editPaymentMethod);
  router.delete('/payment-methods/:id', verifyToken, requireAdmin, ctrl.deletePaymentMethod);

  return router;
};
