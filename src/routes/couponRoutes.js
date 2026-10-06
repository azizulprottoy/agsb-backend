const { asyncRouter } = require('../utils/asyncRouter');
const couponController = require('../controllers/couponController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

module.exports = (collections) => {
  const router = asyncRouter();
  const ctrl = couponController(collections);

  router.post('/coupons/check', verifyToken, ctrl.checkCoupon);
  router.get('/coupons', verifyToken, requireAdmin, ctrl.getCoupons);
  router.post('/coupons', verifyToken, requireAdmin, ctrl.addCoupon);
  router.put('/coupons/:id', verifyToken, requireAdmin, ctrl.editCoupon);
  router.delete('/coupons/:id', verifyToken, requireAdmin, ctrl.deleteCoupon);

  return router;
};
