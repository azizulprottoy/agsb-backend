const { asyncRouter } = require('../utils/asyncRouter');
const membershipController = require('../controllers/membershipController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

module.exports = (collections) => {
  const router = asyncRouter();
  const ctrl = membershipController(collections);

  router.get('/membership-plans', ctrl.getMembershipPlans);
  router.post('/membership-plans', verifyToken, requireAdmin, ctrl.addMembershipPlan);
  router.put('/membership-plans/:id', verifyToken, requireAdmin, ctrl.editMembershipPlan);
  router.delete('/membership-plans/:id', verifyToken, requireAdmin, ctrl.deleteMembershipPlan);

  return router;
};
